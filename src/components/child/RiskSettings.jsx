import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Shield } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { useToast } from '@/components/shared/Toast';
import { riskService } from '@/lib/risk';

const DEFAULT_RULES = {
  maxTradesPerDay: 50,
  maxOpenPositions: 20,
  maxCapitalExposure: 80,
  marginCheckEnabled: true,
};

const clampNumber = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
};

const RiskSettings = () => {
  const { addToast } = useToast();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [riskStatus, setRiskStatus] = useState({ allowed: true, reason: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rulesResponse, statusResponse] = await Promise.all([
        riskService.getRules().catch(() => DEFAULT_RULES),
        riskService.checkRisk().catch(() => ({ allowed: true, reason: null })),
      ]);

      setRules({
        ...DEFAULT_RULES,
        ...rulesResponse,
        marginCheckEnabled: Boolean(rulesResponse?.marginCheckEnabled ?? DEFAULT_RULES.marginCheckEnabled),
      });
      setRiskStatus({
        allowed: Boolean(statusResponse?.allowed ?? true),
        reason: statusResponse?.reason || null,
      });
    } catch (error) {
      addToast(error.message || 'Unable to load risk settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (field, value) => {
    setRules((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const refreshStatus = async () => {
    setChecking(true);
    try {
      const response = await riskService.checkRisk();
      setRiskStatus({
        allowed: Boolean(response?.allowed ?? true),
        reason: response?.reason || null,
      });
    } catch (error) {
      addToast(error.message || 'Unable to refresh risk status', 'error');
    } finally {
      setChecking(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      const payload = {
        maxTradesPerDay: clampNumber(rules.maxTradesPerDay, 1, 500),
        maxOpenPositions: clampNumber(rules.maxOpenPositions, 1, 200),
        maxCapitalExposure: clampNumber(rules.maxCapitalExposure, 1, 100),
        marginCheckEnabled: Boolean(rules.marginCheckEnabled),
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

  const fields = [
    {
      key: 'maxTradesPerDay',
      label: 'Max Trades Per Day',
      min: 1,
      max: 500,
      suffix: 'trades',
    },
    {
      key: 'maxOpenPositions',
      label: 'Max Open Positions',
      min: 1,
      max: 200,
      suffix: 'positions',
    },
    {
      key: 'maxCapitalExposure',
      label: 'Max Capital Exposure',
      min: 1,
      max: 100,
      suffix: '%',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Risk Settings</h1>
          <p className="text-sm text-muted-foreground">Set limits used by the copy-trading risk check.</p>
        </div>
        <button
          onClick={refreshStatus}
          disabled={checking}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-black/5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Check Status
        </button>
      </div>

      <GlassCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${riskStatus.allowed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {riskStatus.allowed ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Risk Status</p>
              <p className={`text-lg font-black ${riskStatus.allowed ? 'text-emerald-500' : 'text-rose-500'}`}>
                {riskStatus.allowed ? 'OK' : 'Limit Reached'}
              </p>
            </div>
          </div>
          {riskStatus.reason && (
            <div className="max-w-xl rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-500">
              {riskStatus.reason}
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading risk rules...</div>
        ) : (
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.key} className="rounded-2xl border border-border/50 bg-black/5 p-4 dark:bg-white/5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold">{field.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={rules[field.key] ?? ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-right text-sm font-bold focus:outline-none focus:border-brand-purple"
                    />
                    <span className="w-16 text-xs font-bold uppercase text-muted-foreground">{field.suffix}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={rules[field.key] ?? field.min}
                  onChange={(e) => updateField(field.key, Number(e.target.value))}
                  className="w-full accent-brand-purple"
                />
              </div>
            ))}

            <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-black/5 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Margin Check</p>
                  <p className="text-xs text-muted-foreground">Block copies when broker margin check fails.</p>
                </div>
              </div>
              <ToggleSwitch
                checked={Boolean(rules.marginCheckEnabled)}
                onChange={() => updateField('marginCheckEnabled', !rules.marginCheckEnabled)}
                showStateText
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveRules}
                disabled={saving}
                className="rounded-xl bg-brand-purple px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Risk Rules'}
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default RiskSettings;
