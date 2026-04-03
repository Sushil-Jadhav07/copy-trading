import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserMinus,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  TrendingDown,
  Copy,
  IndianRupee,
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { useMasterChildren } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

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
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState(null);
  const [pendingMultiplier, setPendingMultiplier] = useState({});

  const followerList = useMemo(
    () =>
      children.map((c, index) => ({
        id: c.id || c.childId,
        name: c.name || c.childName || 'Unknown',
        initials: (c.name || c.childName || 'UN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        multiplier: c.multiplier || 1.0,
        tradingEnabled: c.status === 'ACTIVE' || c.tradingEnabled || false,
        status: c.status === 'ACTIVE' || c.tradingEnabled ? 'Active' : 'Paused',
        allocation: Number(c.allocation || c.allocationAmount || 0),
        totalPnL: Number(c.totalPnL || c.pnl || 0),
        tradesCopied: Number(c.tradesCopied || c.tradeCount || 0),
        joinedDate: c.joinedDate || c.createdAt || `Follower ${index + 1}`,
        placeRejected: Boolean(c.placeRejected),
        ...c,
      })),
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

  const updateChild = (id, updater) => {
    setChildren((prev) => prev.map((child) => {
      if ((child.id || child.childId) !== id) return child;
      return { ...child, ...updater(child) };
    }));
  };

  const handleToggleStatus = async (id) => {
    const follower = followerList.find((x) => x.id === id);
    const newValue = !follower.tradingEnabled;
    updateChild(id, () => ({ tradingEnabled: newValue, status: newValue ? 'ACTIVE' : 'PAUSED' }));
    try {
      await masterService.updateChildScaling(id, { enabled: newValue });
      addToast(`${follower.name} ${newValue ? 'activated' : 'paused'}`, newValue ? 'success' : 'warning');
    } catch (error) {
      updateChild(id, () => ({ tradingEnabled: follower.tradingEnabled, status: follower.status === 'Active' ? 'ACTIVE' : 'PAUSED' }));
      addToast(error.message, 'error');
    }
  };

  const handleToggleRejected = (id) => {
    updateChild(id, (child) => ({ placeRejected: !child.placeRejected }));
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

  const totalAUM = followerList.reduce((sum, f) => sum + f.allocation, 0);
  const totalPnL = followerList.reduce((sum, f) => sum + f.totalPnL, 0);
  const activeCount = followerList.filter((f) => f.status === 'Active').length;

  const stats = [
    { label: 'Total Child Accounts', value: followerList.length, icon: Users, color: 'text-brand-purple' },
    { label: 'Active', value: activeCount, icon: Copy, color: 'text-success' },
    { label: 'Total AUM', value: formatCurrency(totalAUM), icon: IndianRupee, color: 'text-brand-blue' },
    { label: 'Total P&L', value: `${totalPnL >= 0 ? '+' : ''}${formatCurrency(Math.abs(totalPnL))}`, icon: totalPnL >= 0 ? TrendingUp : TrendingDown, color: totalPnL >= 0 ? 'text-success' : 'text-danger' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Child Accounts</h1>
        <p className="text-muted-foreground">Manage copy trading settings for each child account</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

      <GlassCard noPadding>
        <div className="hidden md:grid grid-cols-8 gap-3 px-5 py-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="col-span-2">Follower</div>
          <div>Allocation</div>
          <div>Multiplier</div>
          <div>Trading</div>
          <div>Pl. Rejected</div>
          <div>P&amp;L</div>
          <div>Action</div>
        </div>

        {loading ? (
          <div className="p-5">
            <SkeletonLoader type="table" rows={5} columns={8} />
          </div>
        ) : followerList.length ? (
          <div className="divide-y divide-border/30">
            {followerList.map((follower, idx) => (
              <motion.div key={follower.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`px-4 sm:px-5 py-4 hover:bg-white/3 transition-colors ${follower.status !== 'Active' ? 'opacity-60' : ''}`}>
                <div className="space-y-4 md:grid md:grid-cols-8 md:gap-3 md:items-center md:space-y-0">
                  <div className="col-span-2 flex items-center justify-between gap-3 md:justify-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-foreground">{follower.initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{follower.name}</p>
                        <p className="text-xs text-muted-foreground">{follower.joinedDate}</p>
                      </div>
                    </div>

                    <button onClick={() => handleRemove(follower)} className="md:hidden p-2 hover:bg-danger/20 rounded-lg transition-colors flex-shrink-0" title="Remove child">
                      <UserMinus className="w-4 h-4 text-danger" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:contents">
                    <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 md:bg-transparent md:p-0">
                      <p className="text-xs text-muted-foreground mb-0.5 md:hidden">Allocation</p>
                      <p className="text-sm font-medium">{formatCurrency(follower.allocation)}</p>
                      <p className="text-xs text-muted-foreground">{follower.tradesCopied} trades</p>
                    </div>

                    <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 md:bg-transparent md:p-0">
                      <p className="text-xs text-muted-foreground mb-1 md:hidden">Multiplier</p>
                      <MultiplierControl value={follower.multiplier} onChange={(value) => handleMultiplierChange(follower.id, value)} disabled={follower.status !== 'Active'} />
                    </div>

                    <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 md:bg-transparent md:p-0">
                      <p className="text-xs text-muted-foreground mb-1 md:hidden">Trading</p>
                      <button onClick={() => handleToggleStatus(follower.id)} className="flex items-center gap-1.5">
                        {follower.status === 'Active' ? <ToggleRight className="w-7 h-7 text-success" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                        <span className={`text-xs ${follower.status === 'Active' ? 'text-success' : 'text-muted-foreground'}`}>{follower.status === 'Active' ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 md:bg-transparent md:p-0">
                      <p className="text-xs text-muted-foreground mb-1 md:hidden">Pl. Rejected</p>
                      <button onClick={() => handleToggleRejected(follower.id)} disabled={follower.status !== 'Active'} className="flex items-center gap-1.5">
                        {follower.placeRejected ? <ToggleRight className="w-7 h-7 text-warning" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                        <span className={`text-xs ${follower.placeRejected ? 'text-warning' : 'text-muted-foreground'}`}>{follower.placeRejected ? 'Yes' : 'No'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 md:bg-transparent md:p-0">
                      <p className="text-xs text-muted-foreground mb-0.5 md:hidden">P&amp;L</p>
                      <span className={`text-sm font-semibold ${follower.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                        {follower.totalPnL >= 0 ? '+' : ''}{formatCurrency(follower.totalPnL)}
                      </span>
                    </div>

                    <div className="hidden md:block">
                      <button onClick={() => handleRemove(follower)} className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors" title="Remove child">
                        <UserMinus className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">No data available</div>
        )}
      </GlassCard>

      <Modal isOpen={removeModalOpen} onClose={() => setRemoveModalOpen(false)} title="Remove child account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Remove <span className="font-semibold text-foreground">{selectedFollower?.name}</span> from your followers?</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setRemoveModalOpen(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmRemove} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActiveFollowers;
