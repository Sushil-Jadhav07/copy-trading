import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Save,
  Shield,
  SlidersHorizontal,
  Pause,
  Play,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { riskService } from '@/lib/risk';

const DEFAULT_RULES = {
  maxTradesPerDay: 50,
  maxOpenPositions: 20,
  maxCapitalExposure: 80,
  marginCheckEnabled: true,
  allowedSides: 'BUY_ONLY',
};

const clampNumber = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
};

const COPY_DIRECTION_OPTIONS = [
  {
    value: 'BUY_ONLY',
    label: 'BUY Only',
    shortLabel: 'Buy',
    description: 'Only master BUY orders are copied. This is the default mode for conservative copying.',
    tone: 'emerald',
    requiresConsent: false,
  },
  {
    value: 'SELL_ONLY',
    label: 'SELL Only',
    shortLabel: 'Sell',
    description: 'Only SELL orders are copied. Use this only for short-selling or option-writing strategies.',
    tone: 'rose',
    requiresConsent: true,
  },
  {
    value: 'BOTH',
    label: 'Both BUY & SELL',
    shortLabel: 'Both',
    description: 'Copies every side from the master. Required for hedges, spreads, and paired exits.',
    tone: 'amber',
    requiresConsent: true,
  },
];

const FIELD_CONFIG = [
  {
    key: 'maxTradesPerDay',
    label: 'Trades Per Day',
    helper: 'Maximum copied orders allowed in one trading day.',
    min: 1,
    max: 500,
    suffix: 'trades',
  },
  {
    key: 'maxOpenPositions',
    label: 'Open Positions',
    helper: 'Maximum live positions allowed at the same time.',
    min: 1,
    max: 200,
    suffix: 'positions',
  },
  {
    key: 'maxCapitalExposure',
    label: 'Capital Exposure',
    helper: 'Maximum percentage of account capital that can be deployed.',
    min: 1,
    max: 100,
    suffix: '%',
  },
];

const getProgress = (value, min, max) => {
  const clamped = clampNumber(value, min, max);
  return ((clamped - min) / (max - min)) * 100;
};

const getDirectionClasses = (tone, selected) => {
  if (!selected) return 'border-border/50 bg-black/5 text-muted-foreground hover:border-brand-purple/40 hover:text-foreground dark:bg-white/5';
  if (tone === 'emerald') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 shadow-[0_16px_40px_rgba(16,185,129,0.08)]';
  if (tone === 'rose') return 'border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-[0_16px_40px_rgba(244,63,94,0.08)]';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-[0_16px_40px_rgba(245,158,11,0.08)]';
};

const RiskSettings = () => {
  const { addToast } = useToast();
  const [rules, setRules] = useState(null);
  const [riskStatus, setRiskStatus] = useState({ allowed: true, reason: null });
  const [exposure, setExposure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [consentModal, setConsentModal] = useState(false);
  const [pendingSide, setPendingSide] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rulesResponse, statusResponse, exposureResponse, fullStatusResponse] = await Promise.all([
        riskService.getRules().catch(() => null),
        riskService.checkRisk().catch(() => ({ allowed: true, reason: null })),
        riskService.getExposure().catch(() => null),
        riskService.getStatus().catch(() => null),
      ]);

      const mergedRules = {
        ...DEFAULT_RULES,
        ...(rulesResponse || {}),
        marginCheckEnabled: Boolean(rulesResponse?.marginCheckEnabled ?? DEFAULT_RULES.marginCheckEnabled),
        allowedSides: rulesResponse?.allowedSides || DEFAULT_RULES.allowedSides,
      };

      setRules(mergedRules);
      setRiskStatus({
        allowed: Boolean((fullStatusResponse ?? statusResponse)?.allowed ?? true),
        reason: (fullStatusResponse ?? statusResponse)?.reason || null,
        marginBlocked: Boolean(fullStatusResponse?.marginBlocked),
        copyPaused: Boolean(fullStatusResponse?.copyPaused),
        pausedUntil: fullStatusResponse?.pausedUntil || null,
        tradesToday: fullStatusResponse?.tradesToday ?? null,
        tradesRemaining: fullStatusResponse?.tradesRemaining ?? null,
        openPositions: fullStatusResponse?.openPositions ?? null,
        positionsRemaining: fullStatusResponse?.positionsRemaining ?? null,
      });
      setExposure(exposureResponse || {
        totalCapital: fullStatusResponse?.totalFunds,
        deployedCapital: fullStatusResponse?.usedMargin,
        exposurePercent: fullStatusResponse?.marginUtilizationPct,
        openPositions: fullStatusResponse?.openPositions,
        tradesPlacedToday: fullStatusResponse?.tradesToday,
        marginAvailable: fullStatusResponse?.availableMargin,
      });
    } catch (error) {
      addToast(error.message || 'Unable to load risk settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (field, value) => {
    setRules((prev) => ({ ...(prev || DEFAULT_RULES), [field]: value }));
  };

  const handleSideSelect = (value) => {
    const option = COPY_DIRECTION_OPTIONS.find((item) => item.value === value);
    if (option?.requiresConsent && value !== rules?.allowedSides) {
      setPendingSide(value);
      setConsentChecked(false);
      setConsentModal(true);
      return;
    }
    updateField('allowedSides', value);
  };

  const confirmConsent = () => {
    if (!consentChecked) return;
    updateField('allowedSides', pendingSide);
    setConsentModal(false);
    setPendingSide(null);
  };

  const cancelConsent = () => {
    setConsentModal(false);
    setPendingSide(null);
    setConsentChecked(false);
  };

  const refreshStatus = async () => {
    setChecking(true);
    try {
      const [checkRes, statusRes] = await Promise.all([
        riskService.checkRisk().catch(() => null),
        riskService.getStatus().catch(() => null),
      ]);
      const resp = statusRes || checkRes;
      setRiskStatus((prev) => ({
        ...prev,
        allowed: Boolean(resp?.allowed ?? true),
        reason: resp?.reason || null,
        marginBlocked: Boolean(resp?.marginBlocked),
        copyPaused: Boolean(resp?.copyPaused),
        pausedUntil: resp?.pausedUntil || null,
        tradesToday: resp?.tradesToday ?? prev.tradesToday,
        tradesRemaining: resp?.tradesRemaining ?? prev.tradesRemaining,
        openPositions: resp?.openPositions ?? prev.openPositions,
        positionsRemaining: resp?.positionsRemaining ?? prev.positionsRemaining,
      }));
    } catch (error) {
      addToast(error.message || 'Unable to refresh risk status', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handlePauseCopying = async () => {
    try {
      await riskService.pauseCopying({ reason: 'Manual pause via Risk Settings' });
      setRiskStatus((prev) => ({ ...prev, copyPaused: true }));
      addToast('Copy trading paused', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to pause', 'error');
    }
  };

  const handleResumeCopying = async () => {
    try {
      await riskService.resumeCopying();
      setRiskStatus((prev) => ({ ...prev, copyPaused: false, pausedUntil: null }));
      addToast('Copy trading resumed', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to resume', 'error');
    }
  };

  const saveRules = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      const payload = {
        maxTradesPerDay: clampNumber(rules.maxTradesPerDay, 1, 500),
        maxOpenPositions: clampNumber(rules.maxOpenPositions, 1, 200),
        maxCapitalExposure: clampNumber(rules.maxCapitalExposure, 1, 100),
        marginCheckEnabled: Boolean(rules.marginCheckEnabled),
        allowedSides: rules.allowedSides || 'BUY_ONLY',
      };
      const response = await riskService.updateRules(payload);
      setRules({ ...rules, ...payload, ...response });
      addToast('Risk rules updated', 'success');
      refreshStatus();
    } catch (error) {
      addToast(error.message || 'Unable to update risk rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && rules === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Risk Settings</h1>
        </div>
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  const currentRules = rules || DEFAULT_RULES;
  const currentSideOption = COPY_DIRECTION_OPTIONS.find((option) => option.value === (currentRules.allowedSides || 'BUY_ONLY')) || COPY_DIRECTION_OPTIONS[0];
  const statusTone = riskStatus.allowed ? 'emerald' : 'rose';
  const statusClasses = riskStatus.allowed
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-500';

  const exposureItems = [
    {
      label: 'Capital Deployed',
      value: `Rs. ${Number(exposure?.deployedCapital || 0).toLocaleString('en-IN')}`,
      sub: `of Rs. ${Number(exposure?.totalCapital || 0).toLocaleString('en-IN')}`,
    },
    {
      label: 'Exposure Used',
      value: `${Number(exposure?.exposurePercent || 0).toFixed(1)}%`,
      sub: `limit ${currentRules.maxCapitalExposure}%`,
    },
    {
      label: 'Open Positions',
      value: String(exposure?.openPositions || 0),
      sub: `limit ${currentRules.maxOpenPositions}`,
    },
    {
      label: 'Trades Today',
      value: String(exposure?.tradesPlacedToday || 0),
      sub: `limit ${currentRules.maxTradesPerDay}`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-purple">
            <Shield className="h-3.5 w-3.5" />
            Copy Risk Control
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Risk Settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Set the hard limits that Ascentra checks before placing copied orders in your broker account.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${statusClasses}`}>
            {riskStatus.allowed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-xs font-black uppercase tracking-widest">
              {riskStatus.allowed ? 'Risk OK' : 'Limit Reached'}
            </span>
          </div>
          {riskStatus.copyPaused ? (
            <button
              onClick={handleResumeCopying}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-500 transition-colors hover:bg-emerald-500/20"
            >
              <Play className="h-4 w-4" />
              Resume Copying
            </button>
          ) : (
            <button
              onClick={handlePauseCopying}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-500 transition-colors hover:bg-amber-500/20"
            >
              <Pause className="h-4 w-4" />
              Pause Copying
            </button>
          )}
          <button
            onClick={refreshStatus}
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-black/5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Check Status
          </button>
        </div>
      </div>

      {(riskStatus.marginBlocked || !riskStatus.allowed) && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {riskStatus.marginBlocked
              ? 'Copy trading blocked — margin utilization has exceeded your maximum capital exposure limit.'
              : 'Risk limit reached — copies are blocked until your limits are within range.'}
          </span>
        </div>
      )}

      {riskStatus.copyPaused && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-500">
          <Pause className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Copy trading is currently paused.
            {riskStatus.pausedUntil && ` Resumes at ${new Date(riskStatus.pausedUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`}
            {' '}
            <button onClick={handleResumeCopying} className="underline font-black">Resume now</button>
          </span>
        </div>
      )}

      {riskStatus.reason && !riskStatus.marginBlocked && riskStatus.allowed && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{riskStatus.reason}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {exposureItems.map((item) => (
          <GlassCard key={item.label} hover={false} className="border-border/60">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-black tabular-nums">{loading && !exposure ? '-' : item.value}</p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{loading && !exposure ? 'Loading live exposure' : item.sub}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <GlassCard noPadding className="border-brand-purple/10">
          <div className="border-b border-border/40 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">Copy Limits</h2>
                <p className="text-xs text-muted-foreground">Tune each guardrail before the engine copies an order.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {FIELD_CONFIG.map((field) => {
              const progress = getProgress(currentRules[field.key], field.min, field.max);

              return (
                <div key={field.key} className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black">{field.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{field.helper}</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={currentRules?.[field.key] ?? ''}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        className="h-10 w-24 rounded-xl border border-border bg-black/5 px-3 text-right text-sm font-black tabular-nums focus:border-brand-purple focus:outline-none dark:bg-white/5"
                      />
                      <span className="w-16 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{field.suffix}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      value={currentRules?.[field.key] ?? field.min}
                      onChange={(event) => updateField(field.key, Number(event.target.value))}
                      className="w-full accent-brand-purple"
                    />
                    <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand-purple"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{field.min}</span>
                      <span>{Math.round(progress)}%</span>
                      <span>{field.max}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard hover={false}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black">Margin Check</p>
                  <p className="text-xs text-muted-foreground">Broker margin validation before every copy.</p>
                </div>
              </div>
              <ToggleSwitch
                checked={Boolean(currentRules.marginCheckEnabled)}
                onChange={() => updateField('marginCheckEnabled', !currentRules.marginCheckEnabled)}
                showStateText
              />
            </div>
            <p className="rounded-xl border border-border/50 bg-black/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground dark:bg-white/5">
              When enabled, a live margin check runs against your broker before each copy. If your margin is insufficient, the copy is skipped and you are notified.
            </p>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black">Copy Direction</p>
                <p className="text-xs text-muted-foreground">Current mode: {currentSideOption.label}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {COPY_DIRECTION_OPTIONS.map((option) => {
                const isSelected = (currentRules.allowedSides || 'BUY_ONLY') === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSideSelect(option.value)}
                    className={`rounded-xl border p-4 text-left transition-all ${getDirectionClasses(option.tone, isSelected)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black uppercase ${
                          isSelected ? 'bg-current/10' : 'bg-black/5 dark:bg-white/5'
                        }`}>
                          {option.shortLabel}
                        </span>
                        <div>
                          <p className="text-sm font-black">{option.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${isSelected ? 'border-current bg-current' : 'border-muted-foreground/50'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            {(currentRules.allowedSides === 'SELL_ONLY' || currentRules.allowedSides === 'BOTH') && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs font-medium leading-relaxed text-amber-600 dark:text-amber-400">
                  SELL orders are active. This can create short positions and should only be used when you understand derivatives and short-selling.
                </p>
              </div>
            )}
          </GlassCard>

          <GlassCard hover={false}>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className={`h-4 w-4 ${statusTone === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`} />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rule Summary</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Direction</span>
                <span className="font-black">{currentSideOption.label}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Margin Check</span>
                <span className={currentRules.marginCheckEnabled ? 'font-black text-emerald-500' : 'font-black text-muted-foreground'}>
                  {currentRules.marginCheckEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Capital Limit</span>
                <span className="font-black">{currentRules.maxCapitalExposure}%</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unsaved rules apply only after saving</p>
            <p className="text-xs text-muted-foreground">Values are clamped to the allowed ranges before being sent.</p>
          </div>
          <button
            onClick={saveRules}
            disabled={saving || loading || rules === null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Risk Rules'}
          </button>
        </div>
      </div>

      <Modal
        isOpen={consentModal}
        onClose={cancelConsent}
        title="Enable SELL Order Copying"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
            <p className="mb-1 text-sm font-black text-rose-500">Risk Warning</p>
            <p className="text-xs leading-relaxed text-rose-400">
              Copying SELL orders can result in short positions. Short positions have unlimited loss potential if the market moves against you.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            You are enabling: <span className="font-black text-foreground">{COPY_DIRECTION_OPTIONS.find((option) => option.value === pendingSide)?.label}</span>
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-brand-purple"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              I understand that copying SELL orders may create short positions and I accept the associated risks. I will not hold Ascentra liable for losses resulting from SELL order copying.
            </span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={cancelConsent}
              className="rounded-xl border border-border px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={confirmConsent}
              disabled={!consentChecked}
              className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40"
            >
              I Accept
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RiskSettings;
