import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, IndianRupee, BarChart2, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildAnalytics, useChildCopiedTrades, useChildSubscriptions } from '@/hooks/useChild';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const fmtTime = (raw) => {
  if (!raw) return 'N/A';
  try { return new Date(raw).toLocaleString('en-IN'); } catch { return raw; }
};

const PnLCard = ({ label, value, subLabel, isPositive, icon: Icon }) => (
  <GlassCard>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-success' : value < 0 ? 'text-danger' : ''}`}>
          {value >= 0 ? '+' : ''}{formatCurrency(value)}
        </p>
        {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        isPositive ? 'bg-success/20' : value < 0 ? 'bg-danger/20' : 'bg-brand-purple/20'
      }`}>
        <Icon className={`w-5 h-5 ${isPositive ? 'text-success' : value < 0 ? 'text-danger' : 'text-brand-purple'}`} />
      </div>
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

  const chartData     = Array.isArray(analytics.pnlHistory) ? analytics.pnlHistory : [];
  const personalPnL   = analytics.personalPnL || 0;
  const copiedPnL     = analytics.copiedPnL || analytics.totalPnL || 0;
  const masterPnL     = analytics.masterPnlComparison?.masterPnl || analytics.masterPnL
    || subscriptions.reduce((sum, item) => sum + (item.totalPnL || item.pnl || 0), 0);
  const totalPnL      = analytics.totalPnL || analytics.totalPnl || personalPnL + copiedPnL;

  // Copied trades: API returns { id, masterId, childId, type, status, message, broker, reference, createdAt }
  // We show what's actually available
  const executedTrades = trades.filter((t) => String(t.status).toUpperCase() === 'EXECUTED');
  const failedTrades   = trades.filter((t) => String(t.status).toUpperCase() === 'FAILED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">P&L Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your personal P&L vs master-copied trade performance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <PnLCard label="Total P&L"            value={totalPnL}    isPositive={totalPnL >= 0}   icon={IndianRupee} subLabel="Personal + Copied" />
        <PnLCard label="Personal Trades P&L"  value={personalPnL} isPositive={personalPnL >= 0} icon={BarChart2}   subLabel={`${analytics.personalTrades || 0} trades`} />
        <PnLCard label="Copied Trades P&L"    value={copiedPnL}   isPositive={copiedPnL >= 0}   icon={Users}       subLabel={`${analytics.copiedTrades || trades.length} copied`} />
        <PnLCard label="Master P&L (Original)" value={masterPnL}  isPositive={masterPnL >= 0}   icon={TrendingUp}  subLabel="What master earned" />
      </div>

      {/* Chart */}
      <GlassCard
        title="P&L Comparison"
        subtitle="Personal vs Copied trades over time"
        action={
          <div className="flex flex-wrap gap-1">
            {['1W', '1M'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === r ? 'bg-brand-purple text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      >
        {loading ? <SkeletonLoader type="chart" /> : <LineChart data={chartData} xKey="time" yKey="copied" height={260} />}
      </GlassCard>

      {/* Bottom two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Trades */}
        <GlassCard title="Personal Trades" subtitle="Your own orders (not from master)">
          <div className="space-y-2">
            {(analytics.personalTradesList || []).map((t, idx) => (
              <motion.div
                key={t.id || idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-8 rounded-full ${t.type === 'BUY' ? 'bg-success' : 'bg-danger'}`} />
                  <div>
                    <p className="text-sm font-semibold">{t.instrument}</p>
                    <p className="text-xs text-muted-foreground">{t.type} · {t.qty} qty · {t.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}
                  </p>
                </div>
              </motion.div>
            ))}
            {(!analytics.personalTradesList || analytics.personalTradesList.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No personal trades yet</p>
            )}
          </div>
        </GlassCard>

        {/* Copied Trades P&L per master subscription */}
        <GlassCard title="Copied Trades P&L" subtitle="Performance per master">
          <div className="space-y-3">
            {subscriptions.map((m, idx) => (
              <motion.div
                key={m.id || idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="p-3 bg-black/5 dark:bg-white/5 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">
                        {(m.masterName || m.name || 'M').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.masterName || m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.multiplier || 1}x multiplier · {m.tradesCopiedToday || 0} trades today
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${(m.totalPnL || m.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(m.totalPnL || m.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(m.totalPnL || m.pnl || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">My P&L</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {subscriptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Not subscribed to any masters</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Today's Copied Trades — uses actual API fields */}
      <GlassCard title="Today's Copied Trades" subtitle="Real-time feed from broker">
        {loading ? (
          <SkeletonLoader type="table" rows={5} columns={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Type', 'Status', 'Broker', 'Reference', 'Message', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t, idx) => (
                  <motion.tr
                    key={t.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    {/* type: REPLICATED / MANUAL */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">
                        {t.type || 'REPLICATED'}
                      </span>
                    </td>
                    {/* status: EXECUTED / FAILED */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        String(t.status).toUpperCase() === 'EXECUTED' ? 'bg-success/20 text-success'
                        : String(t.status).toUpperCase() === 'FAILED' ? 'bg-danger/20 text-danger'
                        : 'bg-warning/20 text-warning'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{t.broker || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{t.reference || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate" title={t.message}>{t.message || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{fmtTime(t.time)}</td>
                  </motion.tr>
                ))}
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No copied trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard>
          <p className="text-xs text-muted-foreground">Executed</p>
          <p className="text-xl font-bold text-success mt-1">{executedTrades.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-xl font-bold text-danger mt-1">{failedTrades.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground">Replication Accuracy</p>
          <p className="text-xl font-bold mt-1">
            {trades.length > 0 ? `${Math.round((executedTrades.length / trades.length) * 100)}%` : '—'}
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default PnLDashboard;