import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, IndianRupee, BarChart2, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildAnalytics, useChildCopiedTrades, useChildSubscriptions } from '@/hooks/useChild';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const PnLCard = ({ label, value, subLabel, isPositive, icon: Icon }) => (
  <GlassCard>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-success' : value < 0 ? 'text-danger' : ''}`}>{value >= 0 ? '+' : ''}{formatCurrency(value)}</p>
        {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-success/20' : value < 0 ? 'bg-danger/20' : 'bg-brand-purple/20'}`}><Icon className={`w-5 h-5 ${isPositive ? 'text-success' : value < 0 ? 'text-danger' : 'text-brand-purple'}`} /></div>
    </div>
  </GlassCard>
);

const PnLDashboard = () => {
  const { analytics, loading, error } = useChildAnalytics();
  const { trades } = useChildCopiedTrades();
  const { subscriptions } = useChildSubscriptions();
  const { addToast } = useToast();
  const [timeRange, setTimeRange] = useState('1W');

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const chartData = analytics.pnlHistory || analytics.chartData || [];
  const personalPnL = analytics.personalPnL || 0;
  const copiedPnL = analytics.copiedPnL || analytics.totalPnL || 0;
  const masterPnL = analytics.masterPnL || subscriptions.reduce((sum, item) => sum + (item.totalPnL || item.pnl || 0), 0);
  const totalPnL = analytics.totalPnL || personalPnL + copiedPnL;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">P&L Dashboard</h1><p className="text-muted-foreground">Your personal P&L vs master-copied trade performance</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PnLCard label="Total P&L" value={totalPnL} isPositive={totalPnL >= 0} icon={IndianRupee} subLabel="Personal + Copied" />
        <PnLCard label="Personal Trades P&L" value={personalPnL} isPositive={personalPnL >= 0} icon={BarChart2} subLabel={`${analytics.personalTrades || 0} trades`} />
        <PnLCard label="Copied Trades P&L" value={copiedPnL} isPositive={copiedPnL >= 0} icon={Users} subLabel={`${trades.length} copied`} />
        <PnLCard label="Master P&L (Original)" value={masterPnL} isPositive={masterPnL >= 0} icon={TrendingUp} subLabel="What master earned" />
      </div>

      <GlassCard title="P&L Comparison" subtitle="Personal vs Copied trades over time" action={<div className="flex flex-wrap gap-1">{['1W', '1M'].map((r) => <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === r ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>{r}</button>)}</div>}>
        {loading ? <SkeletonLoader type="chart" /> : <LineChart data={Array.isArray(chartData[timeRange]) ? chartData[timeRange] : chartData} xKey="time" yKey="copied" height={260} />}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Personal Trades" subtitle="Your own orders (not from master)">
          <div className="space-y-2">
            {(analytics.personalTradesList || []).map((t, idx) => (
              <motion.div key={t.id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.06 }} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3"><span className={`w-1.5 h-8 rounded-full ${t.type === 'BUY' ? 'bg-success' : 'bg-danger'}`} /><div><p className="text-sm font-semibold">{t.instrument}</p><p className="text-xs text-muted-foreground">{t.type} · {t.qty} qty · {t.date}</p></div></div>
                <div className="text-right"><p className={`text-sm font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}</p></div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Copied Trades P&L" subtitle="Performance per master">
          <div className="space-y-3">
            {subscriptions.map((m, idx) => (
              <motion.div key={m.id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.08 }} className="p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center"><span className="text-xs font-bold text-foreground">{(m.masterName || m.name || 'M').slice(0, 2).toUpperCase()}</span></div><div><p className="text-sm font-semibold">{m.masterName || m.name}</p><p className="text-xs text-muted-foreground">{m.multiplier || 1}x multiplier · {m.tradesCopiedToday || 0} trades today</p></div></div>
                  <div className="text-right"><p className={`text-sm font-bold ${(m.totalPnL || m.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{(m.totalPnL || m.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(m.totalPnL || m.pnl || 0)}</p><p className="text-xs text-muted-foreground">My P&L</p></div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Today's Copied Trades" subtitle="Real-time feed">
        {loading ? <SkeletonLoader type="table" rows={5} columns={7} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-border/50">{['Master', 'Instrument', 'Type', 'Master Qty', 'My Qty (×multiplier)', 'My P&L', 'Time'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {trades.map((t, idx) => (
                  <motion.tr key={t.id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{t.master}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{t.instrument}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold border ${t.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>{t.type}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.masterQty}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-purple">{t.myQty}</td>
                    <td className="px-4 py-3"><span className={`text-sm font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(2)}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.time}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default PnLDashboard;
