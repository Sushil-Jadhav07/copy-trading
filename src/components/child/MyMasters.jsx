import React, { useEffect, useState } from 'react';
import { UserMinus, TrendingUp, TrendingDown, Users, Copy, IndianRupee, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import DivSelect from '@/components/shared/DivSelect';
import { useChildSubscriptions } from '@/hooks/useChild';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];
const clampMultiplier = (value) => Math.min(10, Math.max(0.01, Number(value) || 1));
const normalizeStatus = (status) => String(status || 'INACTIVE').toUpperCase();

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case 'ACTIVE':
      return { label: 'Active', pill: 'bg-success/20 text-success', subtitle: 'Trades are being copied to your account' };
    case 'PENDING_APPROVAL':
      return { label: 'Pending Approval', pill: 'bg-warning/20 text-warning', subtitle: "Master hasn't approved your request yet" };
    case 'PAUSED':
      return { label: 'Paused', pill: 'bg-warning/20 text-warning', subtitle: "You've paused copying — resume anytime" };
    case 'REJECTED':
      return { label: 'Rejected', pill: 'bg-danger/20 text-danger', subtitle: 'Master declined your request' };
    case 'INACTIVE':
    default:
      return { label: 'Inactive', pill: 'bg-white/10 text-muted-foreground', subtitle: 'Not currently copying' };
  }
};

const MyMasters = () => {
  const { addToast } = useToast();
  const { subscriptions, setSubscriptions, loading, refetch, error } = useChildSubscriptions();
  const { accounts: brokerAccounts } = useBrokerAccounts();
  const [masters, setMasters] = useState([]);
  const [unfollowModal, setUnfollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [togglingMasters, setTogglingMasters] = useState({});

  // Settings Modal State
  const [settingsModal, setSettingsModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [newBrokerAccountId, setNewBrokerAccountId] = useState('');
  const [newMultiplier, setNewMultiplier] = useState(1.0);
  const [savingSettings, setSavingSettings] = useState(false);

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
    } catch (error) {
      addToast(error.message, 'error');
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
          allocation: s.allocation || s.allocationAmount || 0,
          status,
          copyingStatus: status,
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

    if (!brokerChanged && !scalingChanged) {
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

    try {
      const results = await Promise.all(tasks);

      const brokerResult = results.find((r) => r.type === 'broker');
      const scalingResult = results.find((r) => r.type === 'scaling');

      if (brokerResult?.success) {
        addToast('Broker account switched successfully', 'success');
      } else if (brokerResult && !brokerResult.success) {
        const brokerMessage = brokerResult.message || '';
        if (brokerMessage.includes('does not belong to you')) {
          addToast("This broker account doesn't belong to your account", 'error');
        } else if (brokerMessage.includes('Subscription not found')) {
          addToast('Subscription not found — please refresh and try again', 'error');
        } else {
          addToast(brokerResult.message || 'Failed to switch broker account', 'error');
        }
      }

      if (scalingResult?.success) {
        addToast('Scaling factor updated', 'success');
      } else if (scalingResult && !scalingResult.success) {
        addToast(scalingResult.message || 'Failed to update scaling', 'error');
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Masters</h1>
          <p className="text-sm text-muted-foreground">Masters you are currently copying trades from</p>
        </div>
        {masters.length > 0 && (
          <button
            onClick={handleBulkUnfollow}
            className="w-full sm:w-auto px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Unfollow All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
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
            const isPending = normalizeStatus(master.status) === 'PENDING_APPROVAL';
            const isToggling = Boolean(togglingMasters[master.id]);

            return (
              <motion.div
                key={master.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`glass-card p-5 ${master.tradingEnabled ? 'border border-brand-purple/30' : 'opacity-70'}`}
              >
                {isPending && (
                  <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                    Waiting for master approval — you'll be notified when accepted
                  </div>
                )}
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
                      <p className="text-xs text-muted-foreground mt-1">{statusMeta.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenSettings(master)}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Subscription Settings"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </button>
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

                  {isPending ? (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Multiplier</span>
                      <span className="font-medium text-amber-400 text-sm">{master.multiplier}x</span>
                    </div>
                  ) : (
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
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <span className="text-sm text-muted-foreground">Copy Trading</span>
                  <div className="flex items-center gap-2">
                    {!master.brokerAccountId && (
                      <span className="text-[10px] text-danger font-bold uppercase animate-pulse">No Broker!</span>
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
              className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Unfollow
            </button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Broker Account</label>
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
                <p className="text-xs text-amber-400 mt-1">
                  ⚡ Broker account will be switched instantly - no need to unsubscribe
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Multiplier (Scaling)</label>
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
                <span className="w-12 text-center font-bold text-brand-purple text-sm">{newMultiplier}x</span>
              </div>
              <div className="flex justify-between px-1">
                <span className="text-[10px] text-muted-foreground">0.1x (Safe)</span>
                <span className="text-[10px] text-muted-foreground">10x (Aggressive)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSettingsModal(false)}
                className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings || !newBrokerAccountId}
                className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
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
