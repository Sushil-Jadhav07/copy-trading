import React, { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, UserMinus, TrendingUp, TrendingDown, Users, Copy, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildSubscriptions } from '@/hooks/useChild';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];
const clampMultiplier = (value) => Math.min(10, Math.max(0.01, Number(value) || 1));
const normalizeStatus = (status) => String(status || 'INACTIVE').toUpperCase();

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case 'ACTIVE':
      return { label: 'Active', pill: 'bg-success/20 text-success' };
    case 'PENDING_APPROVAL':
      return { label: 'Pending Approval', pill: 'bg-warning/20 text-warning' };
    case 'PAUSED':
      return { label: 'Paused', pill: 'bg-warning/20 text-warning' };
    case 'REJECTED':
      return { label: 'Rejected', pill: 'bg-danger/20 text-danger' };
    case 'INACTIVE':
    default:
      return { label: 'Inactive', pill: 'bg-white/10 text-muted-foreground' };
  }
};

const MyMasters = () => {
  const { addToast } = useToast();
  const { subscriptions, setSubscriptions, loading, refetch, error } = useChildSubscriptions();
  const [masters, setMasters] = useState([]);
  const [unfollowModal, setUnfollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);

  const handleBulkUnfollow = async () => {
    if (!masters.length) {
      addToast('No masters to unfollow', 'warning');
      return;
    }

    try {
      await childService.bulkUnsubscribe(masters.map((master) => master.id));
      setSubscriptions((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'INACTIVE',
          copyingStatus: 'INACTIVE',
        }))
      );
      addToast('All subscriptions removed', 'success');
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  useEffect(() => {
    setMasters(
      subscriptions.map((s) => ({
        id: s.id || s.masterId,
        name: s.masterName || s.name,
        multiplier: clampMultiplier(s.multiplier || s.scalingFactor || 1.0),
        tradingEnabled: normalizeStatus(s.status) === 'ACTIVE',
        totalPnL: s.pnl || s.totalPnL || 0,
        tradesCopiedToday: s.tradestoday || s.tradesCopiedToday || 0,
        allocation: s.allocation || s.allocationAmount || 0,
        status: normalizeStatus(s.status),
        ...s,
      }))
    );
  }, [subscriptions]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const handleToggle = async (id) => {
    const master = masters.find((x) => x.id === id);
    if (!master || !['ACTIVE', 'PAUSED'].includes(normalizeStatus(master.status))) {
      addToast('Only active subscriptions can be paused or resumed', 'warning');
      return;
    }

    const newEnabled = !master.tradingEnabled;
    try {
      if (newEnabled) {
        await childService.resumeCopying({ masterId: id });
      } else {
        await childService.pauseCopying({ masterId: id });
      }
      setMasters((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, tradingEnabled: newEnabled, status: newEnabled ? 'ACTIVE' : 'PAUSED' }
            : item
        )
      );
      addToast(`${master.name} ${newEnabled ? 'activated' : 'paused'}`, newEnabled ? 'success' : 'warning');
    } catch (e) {
      addToast(e.message, 'error');
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
    const newMultiplier = clampMultiplier(MULTIPLIER_STEPS[newIdx] || 1);

    setMasters((prev) => prev.map((m) => (m.id === id ? { ...m, multiplier: newMultiplier } : m)));
    try {
      await childService.updateScaling({ masterId: id, multiplier: newMultiplier, scalingFactor: newMultiplier });
    } catch (e) {
      addToast(e.message, 'error');
      refetch();
    }
  };

  const totalPnL = masters.reduce((sum, m) => sum + m.totalPnL, 0);
  const active = masters.filter((m) => normalizeStatus(m.status) === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Masters</h1>
        <p className="text-muted-foreground">Masters you are currently copying trades from</p>
        {masters.length > 0 && (
          <div className="mt-3">
            <button
              onClick={handleBulkUnfollow}
              className="px-4 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Unfollow All
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
          <GlassCard key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map((master, idx) => {
            const statusMeta = getStatusMeta(master.status);
            const canToggle = ['ACTIVE', 'PAUSED'].includes(normalizeStatus(master.status));
            const canScale = normalizeStatus(master.status) === 'ACTIVE';

            return (
              <motion.div
                key={master.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`glass-card p-5 ${master.tradingEnabled ? 'border border-brand-purple/30' : 'opacity-70'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                      <span className="text-sm font-bold text-foreground">
                        {master.name?.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{master.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta.pill}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMaster(master);
                      setUnfollowModal(true);
                    }}
                    className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"
                  >
                    <UserMinus className="w-4 h-4 text-danger" />
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {[
                    ['Allocation', formatCurrency(master.allocation)],
                    ['Trades Today', master.tradesCopiedToday],
                    [
                      'Total P&L',
                      `${master.totalPnL >= 0 ? '+' : ''}${formatCurrency(master.totalPnL)}`,
                      master.totalPnL >= 0 ? 'text-success' : 'text-danger',
                    ],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={`font-medium ${cls || ''}`}>{v}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Multiplier</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMultiplier(master.id, 'down')}
                        disabled={!canScale}
                        className="w-6 h-6 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-bold text-amber-400 text-sm">{master.multiplier}x</span>
                      <button
                        onClick={() => handleMultiplier(master.id, 'up')}
                        disabled={!canScale}
                        className="w-6 h-6 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <span className="text-sm text-muted-foreground">Copy Trading</span>
                  <button
                    onClick={() => canToggle && handleToggle(master.id)}
                    className={`flex items-center gap-2 ${!canToggle ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {master.tradingEnabled ? (
                      <ToggleRight className="w-8 h-8 text-success" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-medium ${master.tradingEnabled ? 'text-success' : 'text-muted-foreground'}`}>
                      {canToggle ? (master.tradingEnabled ? 'ON' : 'OFF') : statusMeta.label}
                    </span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={unfollowModal} onClose={() => setUnfollowModal(false)} title="Unfollow Master" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Stop copying trades from <span className="font-semibold text-foreground">{selectedMaster?.name}</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setUnfollowModal(false)}
              className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
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
              className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Unfollow
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyMasters;
