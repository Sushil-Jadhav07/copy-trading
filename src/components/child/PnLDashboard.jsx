import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, IndianRupee, BarChart2, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import StatCard from '@/components/shared/StatCard';
import { myMasters, copiedTrades, childPortfolioData, formatCurrency } from '@/data/mockData';

const PERSONAL_TRADES = [
  { id: 1, instrument: 'SBIN', type: 'BUY', qty: 100, entry: 720.00, exit: 745.60, pnl: 2560, date: '16/03/2024' },
  { id: 2, instrument: 'TATAMOTORS', type: 'BUY', qty: 50, entry: 930.00, exit: 952.40, pnl: 1120, date: '15/03/2024' },
  { id: 3, instrument: 'INFY', type: 'SELL', qty: 75, entry: 1700.00, exit: 1678.25, pnl: 1631.25, date: '14/03/2024' },
  { id: 4, instrument: 'WIPRO', type: 'BUY', qty: 200, entry: 525.00, exit: 512.50, pnl: -2500, date: '13/03/2024' },
];

const COMPARISON_DATA = {
  '1W': [
    { time: 'Mon', personal: 0, master: 0, copied: 0 },
    { time: 'Tue', personal: 1200, master: 3400, copied: 1700 },
    { time: 'Wed', personal: 2800, master: 5200, copied: 2600 },
    { time: 'Thu', personal: 1900, master: 6800, copied: 3400 },
    { time: 'Fri', personal: 3560, master: 9200, copied: 4600 },
  ],
  '1M': [
    { time: 'W1', personal: 4200, master: 12400, copied: 6200 },
    { time: 'W2', personal: 6800, master: 18600, copied: 9300 },
    { time: 'W3', personal: 5400, master: 22000, copied: 11000 },
    { time: 'W4', personal: 8100, master: 28400, copied: 14200 },
  ],
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
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-success/20' : value < 0 ? 'bg-danger/20' : 'bg-brand-purple/20'}`}>
        <Icon className={`w-5 h-5 ${isPositive ? 'text-success' : value < 0 ? 'text-danger' : 'text-brand-purple'}`} />
      </div>
    </div>
  </GlassCard>
);

const PnLDashboard = () => {
  const [timeRange, setTimeRange] = useState('1W');

  const personalPnL = PERSONAL_TRADES.reduce((s, t) => s + t.pnl, 0);
  const copiedPnL = copiedTrades.reduce((s, t) => s + t.pnl, 0);
  const masterPnL = myMasters.reduce((s, m) => s + m.totalPnL, 0);
  const totalPnL = personalPnL + copiedPnL;

  const compData = COMPARISON_DATA[timeRange];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">P&L Dashboard</h1>
        <p className="text-muted-foreground">Your personal P&L vs master-copied trade performance</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PnLCard label="Total P&L" value={totalPnL} isPositive={totalPnL >= 0} icon={IndianRupee} subLabel="Personal + Copied" />
        <PnLCard label="Personal Trades P&L" value={personalPnL} isPositive={personalPnL >= 0} icon={BarChart2} subLabel={`${PERSONAL_TRADES.length} trades`} />
        <PnLCard label="Copied Trades P&L" value={copiedPnL} isPositive={copiedPnL >= 0} icon={Users} subLabel={`${copiedTrades.length} copied`} />
        <PnLCard label="Master P&L (Original)" value={masterPnL} isPositive={masterPnL >= 0} icon={TrendingUp} subLabel="What master earned" />
      </div>

      {/* P&L Comparison Chart */}
      <GlassCard title="P&L Comparison" subtitle="Personal vs Copied trades over time"
        action={
          <div className="flex flex-wrap gap-1">
            {['1W', '1M'].map((r) => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === r ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
                {r}
              </button>
            ))}
          </div>
        }>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {[
            { label: 'Personal P&L', color: 'bg-brand-blue' },
            { label: 'Copied P&L', color: 'bg-brand-purple' },
            { label: 'Master P&L', color: 'bg-success' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${l.color}`} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
        <LineChart data={compData} xKey="time" yKey="copied" height={260} />
      </GlassCard>

      {/* Side by side breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Trades */}
        <GlassCard title="Personal Trades" subtitle="Your own orders (not from master)">
          <div className="space-y-2">
            {PERSONAL_TRADES.map((t, idx) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.06 }}
                className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-white/8 transition-colors">
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
                  <p className="text-xs text-muted-foreground">
                    {t.pnl >= 0 ? '↑' : '↓'} {Math.abs(((t.exit - t.entry) / t.entry) * 100).toFixed(2)}%
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border/40 flex justify-between">
            <span className="text-sm text-muted-foreground">Net P&L</span>
            <span className={`font-bold ${personalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {personalPnL >= 0 ? '+' : ''}{formatCurrency(personalPnL)}
            </span>
          </div>
        </GlassCard>

        {/* Per-master P&L breakdown */}
        <GlassCard title="Copied Trades P&L" subtitle="Performance per master">
          <div className="space-y-3">
            {myMasters.map((m, idx) => {
              const masterCopied = copiedTrades.filter((t) => t.master === m.name);
              const masterCopiedPnL = masterCopied.reduce((s, t) => s + t.pnl, 0);
              const pct = masterPnL > 0 ? ((m.totalPnL / masterPnL) * 100).toFixed(1) : 0;
              return (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.08 }}
                  className="p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground">{m.name.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.multiplier}x multiplier · {m.tradesCopiedToday} trades today</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${m.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                        {m.totalPnL >= 0 ? '+' : ''}{formatCurrency(m.totalPnL)}
                      </p>
                      <p className="text-xs text-muted-foreground">My P&L</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-purple rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span>{pct}% of total</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border/40 flex justify-between">
            <span className="text-sm text-muted-foreground">Total from Masters</span>
            <span className={`font-bold ${masterPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {masterPnL >= 0 ? '+' : ''}{formatCurrency(masterPnL)}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Today's copied trades */}
      <GlassCard title="Today's Copied Trades" subtitle="Real-time feed">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border/50">
                {['Master', 'Instrument', 'Type', 'Master Qty', 'My Qty (×multiplier)', 'My P&L', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copiedTrades.map((t, idx) => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                  className="border-b border-border/30 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{t.master}</td>
                  <td className="px-4 py-3 font-semibold text-sm">{t.instrument}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${t.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.masterQty}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-brand-purple">{t.myQty}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{t.time}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default PnLDashboard;
