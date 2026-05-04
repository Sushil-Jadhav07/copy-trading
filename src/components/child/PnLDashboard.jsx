import React, { useEffect, useMemo } from 'react';
import { Calendar, Crosshair, TrendingDown, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildAnalytics, useChildCopiedTrades, useChildSubscriptions } from '@/hooks/useChild';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const fmtDate = (raw) => {
  if (!raw) return '-';
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toISOString().slice(0, 10);
};

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const metricCard = (icon, value, label) => ({ icon, value, label });

const PnLDashboard = () => {
  const { analytics, loading, error } = useChildAnalytics();
  const { trades } = useChildCopiedTrades();
  const { subscriptions } = useChildSubscriptions();
  const { addToast } = useToast();

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const chartData = useMemo(
    () => (Array.isArray(analytics.pnlHistory) ? analytics.pnlHistory : []).map((p, i) => ({
      time: p.time || p.date || `D${i + 1}`,
      mine: safeNum(p.copied ?? p.child ?? p.value ?? 0),
      master: safeNum(p.personal ?? p.master ?? 0),
      total: safeNum(p.personal ?? 0) + safeNum(p.copied ?? 0),
    })),
    [analytics.pnlHistory],
  );

  const totalPnl = safeNum(analytics.totalPnL ?? analytics.totalPnl);
  const copiedPnl = safeNum(analytics.copiedPnL ?? analytics.totalPnL);
  const personalPnl = safeNum(analytics.personalPnL);
  const realizedPnl = copiedPnl;
  const unrealizedPnl = Math.max(0, totalPnl - realizedPnl);
  const winRate = safeNum(analytics.winRate);
  const totalCopiedTrades = safeNum(analytics.copiedTrades ?? trades.length);

  const executedTrades = useMemo(
    () => (Array.isArray(trades) ? trades : []).filter((t) => String(t.status || '').toUpperCase() === 'EXECUTED'),
    [trades],
  );

  const scoredTrades = useMemo(
    () => executedTrades
      .map((t) => ({
        instrument: t.instrument || t.symbol || t.reference || 'N/A',
        date: fmtDate(t.time),
        qty: safeNum(t.myQty),
        pnl: safeNum(t.pnl),
      }))
      .filter((t) => t.instrument !== 'N/A'),
    [executedTrades],
  );

  const bestTrades = useMemo(
    () => [...scoredTrades]
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 6),
    [scoredTrades],
  );

  const worstTrades = useMemo(
    () => [...scoredTrades]
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 6),
    [scoredTrades],
  );

  const instrumentRows = useMemo(() => {
    const map = new Map();
    scoredTrades.forEach((t) => {
      if (!map.has(t.instrument)) {
        map.set(t.instrument, {
          instrument: t.instrument,
          totalTrades: 0,
          wins: 0,
          totalPnl: 0,
        });
      }
      const row = map.get(t.instrument);
      row.totalTrades += 1;
      if (t.pnl >= 0) row.wins += 1;
      row.totalPnl += t.pnl;
    });

    return Array.from(map.values()).map((r) => ({
      ...r,
      winRate: r.totalTrades > 0 ? Math.round((r.wins / r.totalTrades) * 100) : 0,
      avgPnl: r.totalTrades > 0 ? r.totalPnl / r.totalTrades : 0,
    })).sort((a, b) => b.totalPnl - a.totalPnl);
  }, [scoredTrades]);

  const metricCards = [
    metricCard(TrendingUp, realizedPnl, 'Realized P&L'),
    metricCard(TrendingDown, unrealizedPnl, 'Unrealized P&L'),
    metricCard(Crosshair, winRate, 'Win Rate'),
    metricCard(Calendar, totalCopiedTrades, 'Total Copied Trades'),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">My P&L Dashboard</h1>
      </div>

      <GlassCard>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-2">Total P&L This Month</p>
          <p className={`text-5xl font-black ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <GlassCard key={m.label}>
            <div className="text-center py-2">
              <m.icon className="w-5 h-5 mx-auto text-success mb-2" />
              <p className={`text-3xl font-black ${m.label === 'Win Rate' ? 'text-success' : m.value >= 0 ? 'text-success' : 'text-danger'}`}>
                {m.label === 'Win Rate' ? `${Math.round(m.value)}%` : m.label === 'Total Copied Trades' ? Math.round(m.value) : `${m.value >= 0 ? '+' : ''}${formatCurrency(m.value)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard title="Daily P&L (30 Days)">
          {loading ? <SkeletonLoader type="chart" /> : (
            <LineChart data={chartData} xKey="time" yKey="total" height={280} />
          )}
        </GlassCard>

        <GlassCard title="My P&L vs Master P&L">
          {loading ? <SkeletonLoader type="chart" /> : (
            <div className="space-y-4">
              <LineChart data={chartData} xKey="time" yKey="master" height={130} />
              <LineChart data={chartData} xKey="time" yKey="mine" height={130} />
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard title="Best Trades">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['Instrument', 'Date', 'My Qty', 'P&L', 'P&L%'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bestTrades.map((t, i) => {
                  const pct = personalPnl !== 0 ? (t.pnl / Math.abs(personalPnl)) * 100 : 0;
                  return (
                    <tr key={`${t.instrument}-${i}`} className="border-b border-border/20">
                      <td className="px-4 py-3 font-semibold">{t.instrument}</td>
                      <td className="px-4 py-3">{t.date}</td>
                      <td className="px-4 py-3">{t.qty}</td>
                      <td className="px-4 py-3 text-success">+{formatCurrency(t.pnl)}</td>
                      <td className="px-4 py-3 text-success">+{Math.abs(pct).toFixed(0)}%</td>
                    </tr>
                  );
                })}
                {bestTrades.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No trade data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard title="Worst Trades">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['Instrument', 'Date', 'My Qty', 'P&L', 'P&L%'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worstTrades.map((t, i) => {
                  const pct = personalPnl !== 0 ? (t.pnl / Math.abs(personalPnl)) * 100 : 0;
                  return (
                    <tr key={`${t.instrument}-${i}`} className="border-b border-border/20">
                      <td className="px-4 py-3 font-semibold">{t.instrument}</td>
                      <td className="px-4 py-3">{t.date}</td>
                      <td className="px-4 py-3">{t.qty}</td>
                      <td className="px-4 py-3 text-danger">{formatCurrency(t.pnl)}</td>
                      <td className="px-4 py-3 text-danger">-{Math.abs(pct).toFixed(0)}%</td>
                    </tr>
                  );
                })}
                {worstTrades.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No trade data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Instrument-wise P&L">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border/40">
                {['Instrument', 'Total Trades', 'Win Rate', 'Total P&L', 'Avg P&L/Trade'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instrumentRows.map((r) => (
                <tr key={r.instrument} className="border-b border-border/20">
                  <td className="px-4 py-3 font-semibold">{r.instrument}</td>
                  <td className="px-4 py-3">{r.totalTrades}</td>
                  <td className="px-4 py-3">{r.winRate}%</td>
                  <td className={`px-4 py-3 ${r.totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {r.totalPnl >= 0 ? '+' : ''}{formatCurrency(r.totalPnl)}
                  </td>
                  <td className={`px-4 py-3 ${r.avgPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {r.avgPnl >= 0 ? '+' : ''}{formatCurrency(r.avgPnl)}
                  </td>
                </tr>
              ))}
              {instrumentRows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No instrument-wise data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default PnLDashboard;
