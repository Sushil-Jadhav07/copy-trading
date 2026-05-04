import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, CircleDollarSign, BarChart3, CalendarDays } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { pnlService } from '@/lib/pnl';
import { formatCurrency } from '@/lib/utils';
import { masterService } from '@/lib/master';

const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY'];

const normalizeSummaryRow = (row = {}, index = 0) => ({
  id: row.id || row.period || `summary-${index}`,
  period: row.period || row.label || row.date || `Row ${index + 1}`,
  realizedPnl: Number(row.realizedPnl || row.realized || row.pnl || 0),
  unrealizedPnl: Number(row.unrealizedPnl || row.unrealized || 0),
  totalTrades: Number(row.totalTrades || row.trades || 0),
  winRate: Number(row.winRate || 0),
});

const PnLAnalytics = () => {
  const { addToast } = useToast();
  const [period, setPeriod] = useState('DAILY');
  const [summary, setSummary] = useState([]);
  const [realized, setRealized] = useState(null);
  const [unrealized, setUnrealized] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const [summaryData, activeAccount] = await Promise.all([
          pnlService.getSummary(period).catch(() => []),
          masterService.getActiveAccount().catch(() => null),
        ]);

        if (!isMounted) return;

        const normalizedSummary = (Array.isArray(summaryData) ? summaryData : []).map(normalizeSummaryRow);
        setSummary(normalizedSummary);

        const brokerAccountId = activeAccount?.brokerAccountId || activeAccount?.accountId;
        if (brokerAccountId) {
          const [unrealizedData, realizedData] = await Promise.all([
            pnlService.getUnrealizedPnl(brokerAccountId).catch(() => null),
            pnlService.getRealizedPnl({}).catch(() => null),
          ]);
          if (isMounted) {
            setUnrealized(unrealizedData);
            setRealized(realizedData);
          }
        } else {
          if (isMounted) {
            setUnrealized(null);
            setRealized(null);
          }
        }
      } catch (error) {
        if (isMounted) addToast('Error loading P&L data', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [period, addToast]);

  const realizedPnlVal = useMemo(() => {
    if (!realized) return 0;
    if (typeof realized.realizedPnl === 'number') return realized.realizedPnl;
    if (typeof realized.pnl === 'number') return realized.pnl;
    return 0;
  }, [realized]);

  const realizedTrades = useMemo(() => {
    if (!realized) return [];
    if (Array.isArray(realized.trades)) return realized.trades;
    if (Array.isArray(realized.items)) return realized.items;
    return [];
  }, [realized]);

  const unrealizedPnlVal = useMemo(() => {
    if (!unrealized) return 0;
    if (typeof unrealized.unrealizedPnl === 'number') return unrealized.unrealizedPnl;
    if (typeof unrealized.pnl === 'number') return unrealized.pnl;
    if (Array.isArray(unrealized)) return unrealized.reduce((sum, pos) => sum + Number(pos.pnl || 0), 0);
    return 0;
  }, [unrealized]);

  const totalTrades = useMemo(() => {
    if (summary.length) return summary.reduce((sum, row) => sum + Number(row.totalTrades || 0), 0);
    return realizedTrades.length;
  }, [summary, realizedTrades]);

  const avgWinRate = useMemo(() => {
    if (!summary.length) return 0;
    return Math.round(summary.reduce((sum, row) => sum + Number(row.winRate || 0), 0) / summary.length);
  }, [summary]);

  const monthlyTotal = realizedPnlVal + unrealizedPnlVal;

  const dailyPnlChart = useMemo(
    () => summary.map((row, index) => ({ time: String(row.period || index + 1), value: Number(row.realizedPnl || 0) + Number(row.unrealizedPnl || 0) })),
    [summary]
  );

  const weeklyBreakdown = useMemo(() => {
    if (!summary.length) return [];
    const buckets = [0, 0, 0, 0];
    summary.forEach((row, idx) => {
      const bucket = Math.min(3, Math.floor((idx / Math.max(1, summary.length)) * 4));
      buckets[bucket] += Number(row.realizedPnl || 0) + Number(row.unrealizedPnl || 0);
    });
    return buckets.map((v, i) => ({ month: `Week ${i + 1}`, value: Math.round(v) }));
  }, [summary]);

  const topInstruments = useMemo(() => {
    const map = new Map();
    realizedTrades.forEach((t) => {
      const key = String(t.symbol || t.instrument || 'UNKNOWN').toUpperCase();
      const pnl = Number(t.pnl || t.realizedPnl || 0);
      map.set(key, (map.get(key) || 0) + pnl);
    });
    return Array.from(map.entries())
      .map(([instrument, pnl]) => ({ instrument, pnl }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 6);
  }, [realizedTrades]);

  const childComparison = useMemo(
    () =>
      (Array.isArray(unrealized?.children) ? unrealized.children : [])
        .map((c, idx) => ({
          id: c.id || c.childId || idx,
          follower: c.name || c.childName || c.email || `Child ${idx + 1}`,
          copiedTrades: Number(c.tradesCopied || c.tradeCount || 0),
          success: Number(c.winRate || c.successRate || 0),
          pnl: Number(c.pnl || c.totalPnL || 0),
        }))
        .slice(0, 8),
    [unrealized]
  );

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-48 mb-2" />
          <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-64" />
        </div>
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="table" rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">P&L Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
      </div>

      <GlassCard>
        <div className="text-center py-4">
          <p className="text-muted-foreground text-xl">Total P&L This Month</p>
          <p className={`mt-3 text-6xl font-extrabold tracking-wide ${monthlyTotal >= 0 ? 'text-success' : 'text-danger'}`}>
            {monthlyTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyTotal))}
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Realized P&L', value: realizedPnlVal, icon: TrendingUp, isCurrency: true },
          { label: 'Unrealized P&L', value: unrealizedPnlVal, icon: CircleDollarSign, isCurrency: true },
          { label: 'Win Rate', value: `${avgWinRate}%`, icon: BarChart3 },
          { label: 'Total Trades', value: totalTrades, icon: CalendarDays },
        ].map((card) => (
          <GlassCard key={card.label}>
            <div className="flex flex-col items-center gap-2 py-1">
              <card.icon className="w-5 h-5 text-success" />
              <p className={`text-4xl font-bold ${typeof card.value === 'number' ? (card.value >= 0 ? 'text-success' : 'text-danger') : 'text-success'}`}>
                {typeof card.value === 'number' ? (card.isCurrency ? formatCurrency(card.value) : card.value) : card.value}
              </p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard
          title="Daily P&L (30 Days)"
          action={<div className="flex gap-2">{PERIODS.map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${period === item ? 'bg-brand-purple text-white' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>{item}</button>)}</div>}
        >
          <div className="h-[320px]">
            <LineChart
              data={dailyPnlChart}
              xKey="time"
              yKey="value"
              height={320}
              gradient={['#00d26a', '#00a857']}
              yAxisFormatter={(v) => String(Math.round(v))}
            />
          </div>
        </GlassCard>

        <GlassCard title="Weekly Breakdown">
          <div className="h-[320px]">
            <BarChart
              data={weeklyBreakdown}
              xKey="month"
              yKey="value"
              height={320}
              colors={['#00c95f', '#ef4444']}
              yAxisFormatter={(v) => String(Math.round(v))}
            />
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard title="Top Instruments by P&L">
          <div className="space-y-3">
            {topInstruments.length ? (
              topInstruments.map((row) => (
                <div key={row.instrument} className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="font-medium">{row.instrument}</span>
                  <span className={`font-semibold ${row.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No instrument-wise realized trades available.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard title="Child Performance Comparison">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left">Follower</th>
                  <th className="px-3 py-2 text-left">Copied Trades</th>
                  <th className="px-3 py-2 text-left">Success</th>
                  <th className="px-3 py-2 text-left">P&L Today</th>
                </tr>
              </thead>
              <tbody>
                {childComparison.length ? (
                  childComparison.map((row) => (
                    <tr key={row.id} className="border-b border-border/30">
                      <td className="px-3 py-2">{row.follower}</td>
                      <td className="px-3 py-2">{row.copiedTrades}</td>
                      <td className="px-3 py-2">{row.success ? `${row.success}%` : '--'}</td>
                      <td className={`px-3 py-2 font-semibold ${row.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No child performance data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default PnLAnalytics;
