import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, UserMinus, TrendingUp, TrendingDown, Users, Copy, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { myMasters, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

const MyMasters = () => {
  const { addToast } = useToast();
  const [masters, setMasters] = useState(myMasters.map((m) => ({ ...m, tradingEnabled: m.status === 'Active' })));
  const [unfollowModal, setUnfollowModal] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);

  const handleToggle = (id) => {
    setMasters((p) => p.map((m) => m.id === id ? { ...m, tradingEnabled: !m.tradingEnabled, status: !m.tradingEnabled ? 'Active' : 'Paused' } : m));
    const m = masters.find((x) => x.id === id);
    addToast(`${m.name} ${m.tradingEnabled ? 'paused' : 'activated'}`, m.tradingEnabled ? 'warning' : 'success');
  };

  const handleMultiplier = (id, dir) => {
    setMasters((p) => p.map((m) => {
      if (m.id !== id) return m;
      const idx = MULTIPLIER_STEPS.indexOf(m.multiplier);
      const newIdx = dir === 'up' ? Math.min(idx + 1, MULTIPLIER_STEPS.length - 1) : Math.max(idx - 1, 0);
      return { ...m, multiplier: MULTIPLIER_STEPS[newIdx] };
    }));
  };

  const totalPnL = masters.reduce((s, m) => s + m.totalPnL, 0);
  const active = masters.filter((m) => m.tradingEnabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Masters</h1>
        <p className="text-muted-foreground">Masters you are currently copying trades from</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Masters Copied', value: masters.length, icon: Users, color: 'text-brand-purple' },
          { label: 'Active', value: active, icon: Copy, color: 'text-success' },
          { label: 'Total P&L', value: (totalPnL >= 0 ? '+' : '') + formatCurrency(Math.abs(totalPnL)), icon: totalPnL >= 0 ? TrendingUp : TrendingDown, color: totalPnL >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Trades Today', value: masters.reduce((s, m) => s + m.tradesCopiedToday, 0), icon: IndianRupee, color: 'text-brand-blue' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Masters Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map((master, idx) => (
          <motion.div key={master.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
            className={`glass-card p-5 ${master.tradingEnabled ? 'border border-brand-purple/30' : 'opacity-70'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{master.name.split(' ').map((n) => n[0]).join('')}</span>
                </div>
                <div>
                  <p className="font-semibold">{master.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${master.tradingEnabled ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                    {master.tradingEnabled ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              <button onClick={() => { setSelectedMaster(master); setUnfollowModal(true); }}
                className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors">
                <UserMinus className="w-4 h-4 text-danger" />
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-2 text-sm mb-4">
              {[
                ['Allocation', formatCurrency(master.allocation)],
                ['Trades Today', master.tradesCopiedToday],
                ['Total P&L', (master.totalPnL >= 0 ? '+' : '') + formatCurrency(master.totalPnL), master.totalPnL >= 0 ? 'text-success' : 'text-danger'],
              ].map(([k, v, cls]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={`font-medium ${cls || ''}`}>{v}</span>
                </div>
              ))}

              {/* Multiplier control */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Multiplier</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleMultiplier(master.id, 'down')} disabled={!master.tradingEnabled}
                    className="w-6 h-6 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40">−</button>
                  <span className="w-10 text-center font-bold text-amber-400 text-sm">{master.multiplier}x</span>
                  <button onClick={() => handleMultiplier(master.id, 'up')} disabled={!master.tradingEnabled}
                    className="w-6 h-6 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition-colors disabled:opacity-40">+</button>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <span className="text-sm text-muted-foreground">Copy Trading</span>
              <button onClick={() => handleToggle(master.id)} className="flex items-center gap-2">
                {master.tradingEnabled
                  ? <ToggleRight className="w-8 h-8 text-success" />
                  : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                <span className={`text-sm font-medium ${master.tradingEnabled ? 'text-success' : 'text-muted-foreground'}`}>
                  {master.tradingEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Unfollow Modal */}
      <Modal isOpen={unfollowModal} onClose={() => setUnfollowModal(false)} title="Unfollow Master" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Stop copying trades from <span className="font-semibold text-foreground">{selectedMaster?.name}</span>?</p>
          <div className="flex gap-3">
            <button onClick={() => setUnfollowModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={() => { setMasters((p) => p.filter((m) => m.id !== selectedMaster.id)); setUnfollowModal(false); addToast('Unfollowed', 'success'); }}
              className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Unfollow</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyMasters;
