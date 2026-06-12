import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserMinus, TrendingUp, TrendingDown, Users, Copy, IndianRupee, Settings, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import DivSelect from '@/components/shared/DivSelect';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useChildSubscriptions } from '@/hooks/useChild';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { childService } from '@/lib/child';
import { engineService } from '@/lib/engine';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

const clampMultiplier = (value) => {
  const n = Number(value);
  const safe = value === null || value === undefined || value === '' ? 1 : n;
  return Math.min(10, Math.max(0.01, Number.isFinite(safe) ? safe : 1));
};

const normalizeStatus = (status) => String(status || 'INACTIVE').toUpperCase();

const SKIP_REASON_LABELS = {
  ZERO_QUANTITY: 'Scaled quantity is zero',
  SUB_LOT_SIZE: 'Below one F&O lot after scaling',
  RISK_LIMIT: 'Risk limit reached',
  MAX_CAPITAL_EXPOSURE: 'Margin utilization too high',
  NO_POSITION: 'No copied buy position for this symbol',
  INSUFFICIENT_POSITION: 'Not enough shares to sell',
  SELL_BLOCKED: 'Sell not allowed for this subscription',
  MARKET_CLOSED: 'Intraday copy blocked after market close',
  COPY_PAUSED: 'Copy trading paused',
  SESSION_EXPIRED: 'Broker session expired',
};

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case 'ACTIVE':
      return { label: 'Active', pill: 'bg-emerald-500 text-white', subtitle: 'Trades are being copied to your account' };
    case 'PENDING_APPROVAL':
      return { label: 'Pending Approval', pill: 'bg-amber-500 text-white', subtitle: "Master hasn't approved your request yet" };
    case 'PAUSED':
      return { label: 'Paused', pill: 'bg-amber-500 text-white', subtitle: "You've paused copying - resume anytime" };
    case 'REJECTED':
      return { label: 'Rejected', pill: 'bg-rose-500 text-white', subtitle: 'Master declined your request' };
    case 'INACTIVE':
    default:
      return { label: 'Inactive', pill: 'bg-slate-500 text-white', subtitle: 'Not currently copying' };
  }
};

const DEFAULT_COPY_SIDES_OPTIONS = [
  { id: 'BUY_ONLY', label: 'Buy only (safe default)', description: 'Copy BUY; SELL only with copied BUY + live position' },
  { id: 'BUY_AND_SELL', label: 'Buy and sell', description: 'Copy BUY and SELL when child has live long qty' },
  { id: 'MIRROR', label: 'Mirror master', description: 'Copy all sides; optional naked short if allowShortSelling' },
];

const getMasterInitials = (name = '') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'M';

const MyMasters = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { subscriptions, setSubscriptions, loading, refetch, error } = useChildSubscriptions();
  const { accounts: brokerAccounts } = useBrokerAccounts();
  const [masters, setMasters] = useState([]);
  const [unfollowModal, setUnfollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [togglingMasters, setTogglingMasters] = useState({});
  const [copySidesOptions, setCopySidesOptions] = useState(DEFAULT_COPY_SIDES_OPTIONS);

  const [settingsModal, setSettingsModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [newBrokerAccountId, setNewBrokerAccountId] = useState('');
  const [newMultiplier, setNewMultiplier] = useState(1.0);
  const [newCopySides, setNewCopySides] = useState('BUY_ONLY');
  const [newAllowShortSelling, setNewAllowShortSelling] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    engineService.getMetadata().then((meta) => {
      if (Array.isArray(meta?.copySidesOptions) && meta.copySidesOptions.length > 0) {
        setCopySidesOptions(meta.copySidesOptions);
      }
    }).catch(() => {});
  }, []);

  const handleBulkUnfollow = async () => {
    if (!masters.length) {
      addToast('No masters to unfollow', 'warning');
      return;
    }

    try {
      await Promise.allSettled(masters.map((master) => childService.unsubscribe(master.id)));
      setSubscriptions((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'INACTIVE',
          copyingStatus: 'INACTIVE',
        }))
      );
      addToast('All subscriptions removed', 'success');
      refetch();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => {
    setMasters(
      subscriptions.map((s) => {
        const status = normalizeStatus(s.status);
        return {
          ...s,
          id: s.id || s.masterId,
          name: s.masterName || s.name,
          multiplier: clampMultiplier(s.multiplier || s.scalingFactor || 1.0),
          tradingEnabled: status === 'ACTIVE',
          totalPnL: s.pnl || s.totalPnL || 0,
          tradesCopiedToday: s.tradestoday || s.tradesCopiedToday || 0,
          allocation: s.allocationAmount ?? s.allocation ?? null,
          status,
          copyingStatus: status,
          copySides: s.copySides || s.raw?.copySides || 'BUY_ONLY',
          allowShortSelling: Boolean(s.allowShortSelling ?? s.raw?.allowShortSelling ?? false),
          lastSkipReason: s.skipReason || s.raw?.skipReason || '',
          brokerName: s.broker || s.brokerName || s.raw?.brokerName || '',
        };
      })
    );
  }, [subscriptions]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const handleToggle = async (master) => {
    if (togglingMasters[master.id]) return;

    const newEnabled = !master.tradingEnabled;
    const nextStatus = newEnabled ? 'ACTIVE' : 'PAUSED';
    const previousStatus = master.status;

    setTogglingMasters((prev) => ({ ...prev, [master.id]: true }));
    setMasters((prev) => prev.map((m) => (
      m.id === master.id ? { ...m, tradingEnabled: newEnabled, status: nextStatus, copyingStatus: nextStatus } : m
    )));
    setSubscriptions((prev) => prev.map((item) => (
      (item.id || item.masterId) === master.id
        ? { ...item, tradingEnabled: newEnabled, status: nextStatus, copyingStatus: nextStatus }
        : item
    )));

    try {
      if (newEnabled) {
        await childService.resumeCopying({ masterId: master.id });
      } else {
        await childService.pauseCopying({ masterId: master.id });
      }
      addToast(newEnabled ? 'Copying resumed' : 'Copying paused', 'success');
      refetch();
    } catch (e) {
      setMasters((prev) => prev.map((m) => (
        m.id === master.id
          ? { ...m, tradingEnabled: master.tradingEnabled, status: previousStatus, copyingStatus: previousStatus }
          : m
      )));
      setSubscriptions((prev) => prev.map((item) => (
        (item.id || item.masterId) === master.id
          ? { ...item, tradingEnabled: master.tradingEnabled, status: previousStatus, copyingStatus: previousStatus }
          : item
      )));
      addToast(e.message || 'Failed to update copy status', 'error');
    } finally {
      setTogglingMasters((prev) => ({ ...prev, [master.id]: false }));
    }
  };

  const handleOpenSettings = (master) => {
    setEditingMaster(master);
    setNewBrokerAccountId(master.brokerAccountId || '');
    setNewMultiplier(master.multiplier || 1.0);
    setNewCopySides(master.copySides || 'BUY_ONLY');
    setNewAllowShortSelling(Boolean(master.allowShortSelling));
    setSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    if (!editingMaster) return;
    if (!newBrokerAccountId) {
      addToast('Please select a broker account', 'error');
      return;
    }

    setSavingSettings(true);

    const brokerChanged = newBrokerAccountId && newBrokerAccountId !== editingMaster.brokerAccountId;
    const scalingChanged = newMultiplier !== editingMaster.multiplier;
    const copySidesChanged = newCopySides !== editingMaster.copySides;
    const allowShortChanged = newAllowShortSelling !== editingMaster.allowShortSelling;

    if (!brokerChanged && !scalingChanged && !copySidesChanged && !allowShortChanged) {
      addToast('No changes to save', 'info');
      setSavingSettings(false);
      setSettingsModal(false);
      return;
    }

    const tasks = [];

    if (brokerChanged) {
      tasks.push(
        childService
          .switchBrokerAccount({ masterId: editingMaster.id, brokerAccountId: newBrokerAccountId })
          .then(() => ({ type: 'broker', success: true }))
          .catch((e) => ({ type: 'broker', success: false, message: e.message }))
      );
    }

    if (scalingChanged) {
      tasks.push(
        childService
          .updateScaling({ masterId: editingMaster.id, multiplier: newMultiplier, scalingFactor: newMultiplier })
          .then(() => ({ type: 'scaling', success: true }))
          .catch((e) => ({ type: 'scaling', success: false, message: e.message }))
      );
    }

    if (copySidesChanged || allowShortChanged) {
      tasks.push(
        childService
          .updateCopySettings({
            masterId: editingMaster.id,
            copySides: newCopySides,
            allowShortSelling: newAllowShortSelling,
          })
          .then(() => ({ type: 'copySides', success: true }))
          .catch((e) => ({ type: 'copySides', success: false, message: e.message }))
      );
    }

    try {
      const results = await Promise.all(tasks);

      const brokerResult = results.find((r) => r.type === 'broker');
      const scalingResult = results.find((r) => r.type === 'scaling');
      const copySidesResult = results.find((r) => r.type === 'copySides');

      if (brokerResult?.success) {
        addToast('Broker account switched successfully', 'success');
      } else if (brokerResult && !brokerResult.success) {
        const brokerMessage = brokerResult.message || '';
        if (brokerMessage.includes('does not belong to you')) {
          addToast("This broker account doesn't belong to your account", 'error');
        } else if (brokerMessage.includes('Subscription not found')) {
          addToast('Subscription not found - please refresh and try again', 'error');
        } else {
          addToast(brokerResult.message || 'Failed to switch broker account', 'error');
        }
      }

      if (scalingResult?.success) {
        addToast('Scaling factor updated', 'success');
      } else if (scalingResult && !scalingResult.success) {
        addToast(scalingResult.message || 'Failed to update scaling', 'error');
      }

      if (copySidesResult?.success) {
        addToast('Copy settings updated', 'success');
      } else if (copySidesResult && !copySidesResult.success) {
        addToast(copySidesResult.message || 'Failed to update copy settings', 'error');
      }

      const allFailed = results.every((r) => !r.success);
      if (!allFailed) {
        setSettingsModal(false);
        refetch();
      }
    } catch (e) {
      addToast(e.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMultiplier = async (id, dir) => {
    const current = masters.find((m) => m.id === id);
    if (!current || normalizeStatus(current.status) !== 'ACTIVE') {
      addToast('Scaling can only be changed for active subscriptions', 'warning');
      return;
    }

    const normalizedCurrent = clampMultiplier(current.multiplier);
    const idx = MULTIPLIER_STEPS.indexOf(normalizedCurrent);
    const newIdx = dir === 'up' ? Math.min(idx + 1, MULTIPLIER_STEPS.length - 1) : Math.max(idx - 1, 0);
    const nextMultiplier = clampMultiplier(MULTIPLIER_STEPS[newIdx] || 1);

    setMasters((prev) => prev.map((m) => (m.id === id ? { ...m, multiplier: nextMultiplier } : m)));
    try {
      await childService.updateScaling({ masterId: id, multiplier: nextMultiplier, scalingFactor: nextMultiplier });
    } catch (e) {
      addToast(e.message, 'error');
      refetch();
    }
  };

  const totalPnL = masters.reduce((sum, m) => sum + m.totalPnL, 0);
  const active = masters.filter((m) => normalizeStatus(m.status) === 'ACTIVE').length;

  const getCopySidesLabel = (val) => {
    const opt = copySidesOptions.find((o) => o.id === val);
    return opt?.label || val || 'Buy only';
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[20px] border border-emerald-500/20 bg-white dark:border-emerald-500/15 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_38%),linear-gradient(135deg,rgba(8,20,18,0.98),rgba(10,17,16,0.92))]">
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              My Masters
            </div>
            <p className="max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-300">
              Manage every master connection from one place. Review performance, adjust scaling, and control copying with a cleaner, simpler layout.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 dark:border-white/15 dark:bg-white/[0.04]">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Connected Masters:</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-300">{masters.length}</p>
            </div>
            {masters.length > 0 && (
              <button
                onClick={handleBulkUnfollow}
                className="w-full rounded-xl bg-danger px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-danger/90 sm:w-auto"
              >
                Unfollow All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: 'Masters Copied', value: masters.length, icon: Users, color: 'text-brand-purple' },
          { label: 'Active', value: active, icon: Copy, color: 'text-success' },
          {
            label: 'Total P&L',
            value: `${totalPnL >= 0 ? '+' : ''}${formatCurrency(Math.abs(totalPnL))}`,
            icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
            color: totalPnL >= 0 ? 'text-success' : 'text-danger',
          },
          {
            label: 'Trades Today',
            value: masters.reduce((sum, m) => sum + m.tradesCopiedToday, 0),
            icon: IndianRupee,
            color: 'text-brand-blue',
          },
        ].map((stat) => (
          <GlassCard key={stat.label} className="rounded-[16px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.08)] dark:border-white/6 dark:from-white/[0.04] dark:to-white/[0.02] dark:shadow-none">
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-lg font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : error ? (
        <GlassCard>
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>Unable to load subscriptions</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={refetch}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-purple/90"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/child/find-masters')}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-black/5 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Find Masters
                </button>
              </div>
            </EmptyContent>
          </Empty>
        </GlassCard>
      ) : masters.length === 0 ? (
        <GlassCard>
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>No masters linked yet</EmptyTitle>
              <EmptyDescription>
                Your account is ready, but you are not copying any masters yet. Go to Find Masters to subscribe and start copying trades.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <button
                onClick={() => navigate('/child/find-masters')}
                className="inline-flex items-center justify-center rounded-lg bg-brand-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-purple/90"
              >
                Find Masters
              </button>
            </EmptyContent>
          </Empty>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {masters.map((master, idx) => {
            const statusMeta = getStatusMeta(master.status);
            const canToggle = ['ACTIVE', 'PAUSED'].includes(normalizeStatus(master.status));
            const canScale = normalizeStatus(master.status) === 'ACTIVE';
            const isPending = normalizeStatus(master.status) === 'PENDING_APPROVAL';
            const isToggling = Boolean(togglingMasters[master.id]);
            const lastSkipReason = SKIP_REASON_LABELS[master.lastSkipReason] || master.lastSkipReason || '';

            return (
              <motion.div
                key={master.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`rounded-[18px] border p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_14px_32px_rgba(0,0,0,0.14)] bg-white dark:bg-[linear-gradient(135deg,rgba(18,32,28,0.96),rgba(13,24,22,0.92))] text-slate-900 dark:text-white ${
                  master.tradingEnabled ? 'border-emerald-500/30' : 'border-slate-200 dark:border-white/10 opacity-90'
                }`}
              >
                {isPending && (
                  <div className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Waiting for master approval - you'll be notified when accepted
                  </div>
                )}

                <div className="mb-3 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
                      <span className="text-xs font-black text-white">{getMasterInitials(master.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">{master.name}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${statusMeta.pill}`}>
                        {statusMeta.label}
                      </span>
                      <p className="mt-1 max-w-sm text-[11px] leading-4 text-slate-500 dark:text-slate-300">{statusMeta.subtitle}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                          {getCopySidesLabel(master.copySides)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                          {master.multiplier}x Scaling
                        </span>
                        {master.allowShortSelling && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-600 dark:text-amber-300">
                            Short Selling On
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenSettings(master)}
                      className="rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                      title="Subscription Settings"
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMaster(master);
                        setUnfollowModal(true);
                      }}
                      className="rounded-lg border border-danger/20 bg-danger/10 p-1.5 transition-colors hover:bg-danger/20"
                      title="Unfollow Master"
                    >
                      <UserMinus className="h-3.5 w-3.5 text-danger" />
                    </button>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
                  {[
                    ['Allocation', master.allocation != null ? formatCurrency(master.allocation) : '-', 'text-emerald-600 dark:text-emerald-400'],
                    ['Trades Today', master.tradesCopiedToday, 'text-emerald-600 dark:text-emerald-400'],
                    [
                      'Total P&L',
                      `${master.totalPnL >= 0 ? '+' : ''}${formatCurrency(master.totalPnL)}`,
                      master.totalPnL >= 0 ? 'text-success' : 'text-danger',
                    ],
                    [
                      'Broker',
                      master.brokerAccountId ? (master.brokerName || 'Connected') : 'Not Linked',
                      master.brokerAccountId ? 'text-brand-blue' : 'text-danger',
                    ],
                  ].map(([label, value, cls]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] px-2 py-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
                      <p className={`mt-1 text-sm font-black ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-3 rounded-[16px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/10 px-2.5 py-2">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Scaling Control</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">Adjust copied quantity directly from the card.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleMultiplier(master.id, 'down')}
                        disabled={!canScale}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-black/10 text-slate-900 dark:text-white text-sm font-black transition-colors hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="w-9 text-center text-sm font-black text-amber-500 dark:text-amber-300">{master.multiplier}x</span>
                      <button
                        onClick={() => handleMultiplier(master.id, 'up')}
                        disabled={!canScale}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200 dark:bg-black/10 text-slate-900 dark:text-white text-sm font-black transition-colors hover:bg-slate-300 dark:hover:bg-white/10 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {lastSkipReason && (
                  <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Recent Skip Reason</p>
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{lastSkipReason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] px-2.5 py-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Copy Trading</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                      {master.brokerAccountId ? 'Pause or resume instantly.' : 'Link a broker account to enable copying.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!master.brokerAccountId && (
                      <span className="rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-danger">
                        No Broker
                      </span>
                    )}
                    <ToggleSwitch
                      checked={master.tradingEnabled}
                      disabled={!canToggle || isPending || isToggling || !master.brokerAccountId}
                      onChange={() => handleToggle(master)}
                      label={canToggle ? '' : statusMeta.label}
                      showStateText={canToggle}
                      activeClassName="bg-success"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={unfollowModal} onClose={() => setUnfollowModal(false)} title="Unfollow Master" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Stop copying trades from <span className="font-semibold text-foreground">{selectedMaster?.name}</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setUnfollowModal(false)}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await childService.unsubscribe(selectedMaster.id);
                  setSubscriptions((prev) =>
                    prev.map((m) =>
                      (m.id || m.masterId) === selectedMaster.id
                        ? { ...m, status: 'INACTIVE', copyingStatus: 'INACTIVE' }
                        : m
                    )
                  );
                  addToast('Unsubscribed', 'success');
                  refetch();
                } catch (e) {
                  addToast(e.message, 'error');
                }
                setUnfollowModal(false);
              }}
              className="flex-1 rounded-lg bg-danger py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90"
            >
              Unfollow
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={settingsModal}
        onClose={() => setSettingsModal(false)}
        title="Subscription Settings"
        size="sm"
      >
        {editingMaster && (
          <div className="space-y-5">
            {normalizeStatus(editingMaster.status) === 'PENDING_APPROVAL' && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Note: This subscription is pending master approval
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Broker Account</label>
              <DivSelect
                value={newBrokerAccountId}
                onChange={setNewBrokerAccountId}
                options={brokerAccounts.map((acc) => ({
                  value: acc.accountId || acc.id,
                  label: `${acc.broker} - ${acc.nickname || acc.clientId}`,
                }))}
                triggerClassName="w-full rounded-xl border border-border bg-black/5 px-3 py-2 text-sm focus:border-brand-purple dark:bg-white/5"
              />
              <p className="text-[10px] text-muted-foreground">Trades will be copied to this account</p>
              {newBrokerAccountId && newBrokerAccountId !== editingMaster?.brokerAccountId && (
                <p className="mt-1 text-xs text-amber-400">Broker account will be switched instantly</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Multiplier (Scaling)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={newMultiplier}
                  onChange={(e) => setNewMultiplier(Number(e.target.value))}
                  className="flex-1 accent-brand-purple"
                />
                <span className="w-12 text-center text-sm font-bold text-brand-purple">{newMultiplier}x</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-[10px] text-muted-foreground">0.1x (Safe)</span>
                <span className="text-[10px] text-muted-foreground">10x (Aggressive)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Copy Mode</label>
              <div className="space-y-2">
                {copySidesOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setNewCopySides(opt.id);
                      if (opt.id !== 'MIRROR') setNewAllowShortSelling(false);
                    }}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition-all ${
                      newCopySides === opt.id
                        ? 'border-brand-purple/50 bg-brand-purple/10 text-foreground'
                        : 'border-border/50 bg-black/5 text-muted-foreground hover:border-brand-purple/30 dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{opt.label}</span>
                      <span className={`h-3 w-3 rounded-full border-2 ${
                        newCopySides === opt.id ? 'border-brand-purple bg-brand-purple' : 'border-muted-foreground/40'
                      }`} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {newCopySides === 'MIRROR' && (
              <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Allow Short Selling</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Enable naked short positions in MIRROR mode</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={newAllowShortSelling}
                      onChange={(e) => setNewAllowShortSelling(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`h-6 w-11 rounded-full transition-colors peer-checked:bg-amber-500 ${
                      newAllowShortSelling ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}>
                      <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        newAllowShortSelling ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                </div>
                {newAllowShortSelling && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Short positions can result in unlimited losses. Use only if you understand the risk.</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSettingsModal(false)}
                className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !newBrokerAccountId}
                className="flex-1 rounded-lg bg-brand-purple py-2 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyMasters;
