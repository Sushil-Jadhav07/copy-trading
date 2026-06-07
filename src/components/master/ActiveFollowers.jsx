import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserMinus,
  TrendingDown,
  Copy,
  IndianRupee,
  Check,
  X,
  Clock3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import RefreshButton from '@/components/shared/RefreshButton';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { useMasterChildren, useMasterPendingChildren } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];
const normalizeStatus = (status) => String(status || 'PAUSED').toUpperCase();
const formatJoinedDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MultiplierControl = ({ value, onChange, disabled }) => {
  const idx = MULTIPLIER_STEPS.indexOf(value);

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => idx > 0 && !disabled && onChange(MULTIPLIER_STEPS[idx - 1])} disabled={disabled} className="w-7 h-7 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40">-</button>
      <span className={`min-w-[3rem] text-center text-sm font-bold ${disabled ? 'text-muted-foreground' : 'text-brand-purple'}`}>{value}x</span>
      <button onClick={() => idx < MULTIPLIER_STEPS.length - 1 && !disabled && onChange(MULTIPLIER_STEPS[idx + 1])} disabled={disabled} className="w-7 h-7 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40">+</button>
    </div>
  );
};

const ActiveFollowers = () => {
  const { addToast } = useToast();
  const { children, loading, refetch, setChildren } = useMasterChildren();
  const {
    pendingChildren,
    setPendingChildren,
    loading: pendingLoading,
    refetch: refetchPending,
    error: pendingError,
  } = useMasterPendingChildren();
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState(null);
  const [pendingMultiplier, setPendingMultiplier] = useState({});
  const [togglingFollowers, setTogglingFollowers] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const followerList = useMemo(
    () =>
      children.map((c, index) => {
        const hasStatus = c.status != null && String(c.status).trim() !== '';
        const status = hasStatus ? normalizeStatus(c.status) : normalizeStatus(c.tradingEnabled ? 'ACTIVE' : 'PAUSED');
        const tradingEnabled = hasStatus ? status === 'ACTIVE' : Boolean(c.tradingEnabled);

        return {
          ...c,
          id: c.id || c.childId,
          name: c.name || c.childName || 'Unknown',
          initials: (c.name || c.childName || 'UN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
          multiplier: c.multiplier || 1.0,
          tradingEnabled,
          rawStatus: status,
          status: tradingEnabled ? 'ACTIVE' : 'PAUSED',
          statusLabel: tradingEnabled ? 'Active' : 'Paused',
          allocation: Number(c.allocation || c.allocationAmount || 0),
          totalPnL: Number(c.totalPnL || c.pnl || 0),
          tradesCopied: Number(c.tradesCopied || c.tradeCount || 0),
          joinedDate: formatJoinedDate(c.joinedDate || c.createdAt),
        };
      }),
    [children]
  );

  useEffect(() => {
    const timers = Object.entries(pendingMultiplier).map(([id, value]) =>
      setTimeout(async () => {
        try {
          await masterService.updateChildScaling(id, { multiplier: value });
        } catch (error) {
          addToast(error.message, 'error');
          refetch();
        }
      }, 400)
    );

    return () => timers.forEach(clearTimeout);
  }, [pendingMultiplier, addToast, refetch]);

  useEffect(() => {
    if (pendingError) addToast(pendingError, 'error');
  }, [pendingError, addToast]);

  const updateChild = (id, updater) => {
    setChildren((prev) => prev.map((child) => {
      if ((child.id || child.childId) !== id) return child;
      return { ...child, ...updater(child) };
    }));
  };

  const handleToggleStatus = async (id) => {
    if (togglingFollowers[id]) return;

    const follower = followerList.find((x) => x.id === id);
    if (!follower) return;

    const newValue = !follower.tradingEnabled;
    setTogglingFollowers((prev) => ({ ...prev, [id]: true }));
    updateChild(id, () => ({ tradingEnabled: newValue, status: newValue ? 'ACTIVE' : 'PAUSED' }));
    try {
      if (newValue) {
        await masterService.resumeChild(id);
      } else {
        await masterService.pauseChild(id);
      }
      addToast(`${follower.name} ${newValue ? 'resumed' : 'paused'}`, newValue ? 'success' : 'warning');
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    } finally {
      setTogglingFollowers((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMultiplierChange = (id, val) => {
    updateChild(id, () => ({ multiplier: val }));
    setPendingMultiplier((prev) => ({ ...prev, [id]: val }));
  };

  const handleRemove = (follower) => {
    setSelectedFollower(follower);
    setRemoveModalOpen(true);
  };

  const confirmRemove = async () => {
    try {
      await masterService.unlinkChild(selectedFollower.id);
      addToast(`${selectedFollower.name} removed`, 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    }
    setRemoveModalOpen(false);
  };

  const handleApprove = async (child) => {
    try {
      await masterService.approveChild(child.id);
      addToast(`${child.name} approved`, 'success');
      setPendingChildren((prev) => prev.filter((item) => item.id !== child.id));
      await Promise.all([refetch(), refetchPending()]);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleReject = async (child) => {
    try {
      await masterService.rejectChild(child.id);
      addToast(`${child.name} rejected`, 'warning');
      setPendingChildren((prev) => prev.filter((item) => item.id !== child.id));
      await refetchPending();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPending()]);
    } finally {
      setRefreshing(false);
    }
  };

  const activeCount = followerList.filter((f) => f.rawStatus === 'ACTIVE' || f.tradingEnabled).length;
  const pausedCount = followerList.filter((f) => f.rawStatus === 'PAUSED').length;
  const inactiveCount = followerList.filter((f) => f.rawStatus === 'INACTIVE' || f.rawStatus === 'FAILED' || f.rawStatus === 'ERROR').length;

  const stats = [
    { label: 'Total', value: followerList.length, icon: Users, color: 'text-foreground' },
    { label: 'Active', value: activeCount, icon: Copy, color: 'text-foreground' },
    { label: 'Paused', value: pausedCount, icon: TrendingDown, color: 'text-foreground' },
    { label: 'Inactive', value: inactiveCount, icon: IndianRupee, color: 'text-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Children</h1>
          <p className="text-sm text-muted-foreground">Manage children subscribed to copy your trades</p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading || pendingLoading} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold break-words ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground">New child subscriptions waiting for your approval</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium">
            {pendingChildren.length}
          </div>
        </div>

        {pendingLoading ? (
          <SkeletonLoader type="card" count={2} />
        ) : pendingChildren.length ? (
          <div className="space-y-3">
            {pendingChildren.map((child) => (
              <div key={child.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning to-brand-purple flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {(child.name || 'UN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{child.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{child.email || child.clientId || child.childId}</p>
                    <div className="flex items-center gap-1.5 text-xs text-warning mt-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>Requested {child.requestedAt ? new Date(child.requestedAt).toLocaleString('en-IN') : 'recently'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReject(child)} className="px-3 py-2 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger text-sm font-medium transition-colors inline-flex items-center gap-2">
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                  <button onClick={() => handleApprove(child)} className="px-3 py-2 rounded-lg bg-success/15 hover:bg-success/25 text-success text-sm font-medium transition-colors inline-flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No pending approvals</div>
        )}
      </GlassCard>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-black/5 dark:bg-white/5">
                {['#', 'Name', 'Email', 'Broker', 'Scaling', 'Status', 'Subscribed', 'Today P&L', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-5">
                    <SkeletonLoader type="table" rows={5} columns={9} />
                  </td>
                </tr>
              ) : followerList.length ? (
                followerList.map((follower, idx) => (
                  <motion.tr
                    key={follower.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-5 py-4 text-base font-medium">{follower.name}</td>
                    <td className="px-5 py-4 text-sm text-brand-blue">{follower.email || '—'}</td>
                    <td className="px-5 py-4 text-sm">{follower.broker || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-brand-purple/20 text-brand-purple">{follower.multiplier}x</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${follower.tradingEnabled ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {follower.tradingEnabled ? 'Copying' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">{follower.joinedDate}</td>
                    <td className={`px-5 py-4 text-sm font-semibold ${follower.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                      {follower.totalPnL >= 0 ? '+' : ''}{formatCurrency(follower.totalPnL)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ToggleSwitch
                          checked={follower.tradingEnabled}
                          disabled={Boolean(togglingFollowers[follower.id])}
                          onChange={() => handleToggleStatus(follower.id)}
                          showStateText={false}
                          activeClassName="bg-success"
                        />
                        <button
                          onClick={() => handleRemove(follower)}
                          className="p-1.5 hover:bg-danger/20 rounded-md transition-colors"
                          title="Remove child"
                        >
                          <UserMinus className="w-4 h-4 text-danger" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={removeModalOpen} onClose={() => setRemoveModalOpen(false)} title="Remove child account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Remove <span className="font-semibold text-foreground">{selectedFollower?.name}</span> from your followers?</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setRemoveModalOpen(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmRemove} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveFollowers;
