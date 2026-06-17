import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import RefreshButton from '@/components/shared/RefreshButton';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { pnlService } from '@/lib/pnl';
import { formatCurrency, safeAdd, safeSum, safeDiv, safeMul, roundTo } from '@/lib/utils';
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
  const [childPerformance, setChildPerformance] = useState([]);
  const [dailyChart, setDailyChart] = useState([]);
  const [instrumentPnlData, setInstrumentPnlData] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [masterPositions, setMasterPositions] = useState([]);
  const [bestTrade, setBestTrade] = useState(null);
  const [worstTrade, setWorstTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      try {
        const data = await masterService.getPnlAnalytics();

        const summaryPayload = data?.summary || {};
        const daily = Array.isArray(data?.dailyChart) ? data.dailyChart : [];

        setDailyChart(daily);
        setChildPerformance(Array.isArray(data?.childPerformance) ? data.childPerformance : []);
        setInstrumentPnlData(Array.isArray(data?.instrumentPnl) ? data.instrumentPnl : []);
        setAnalyticsSummary(summaryPayload);
        setMasterPositions(Array.isArray(data?.masterPositions) ? data.masterPositions : []);
        setBestTrade(data?.bestTrade ?? null);
        setWorstTrade(data?.worstTrade ?? null);
        setSummary(
          daily.map((row, index) => normalizeSummaryRow({
            id: row.id || row.date || index,
            period: row.date || row.label || `Day ${index + 1}`,
            realizedPnl: row.realizedPnl ?? row.realized ?? row.value ?? row.pnl ?? 0,
            unrealizedPnl: row.unrealizedPnl ?? row.unrealized ?? 0,
            totalTrades: row.totalTrades ?? row.trades ?? 0,
            winRate: row.winRate ?? 0,
          }, index))
        );

        setRealized({
          realizedPnl: Number(summaryPayload.totalRealisedPnl ?? summaryPayload.totalRealizedPnl ?? summaryPayload.realisedPnl ?? summaryPayload.realizedPnl ?? 0),
          trades: [],
        });
        setUnrealized({
          unrealizedPnl: Number(summaryPayload.totalUnrealisedPnl ?? summaryPayload.totalUnrealizedPnl ?? summaryPayload.unrealisedPnl ?? summaryPayload.unrealizedPnl ?? 0),
          children: Array.isArray(data?.childPerformance) ? data.childPerformance : [],
        });
        return;
      } catch {
        // Fallback to legacy P&L endpoints when master/pnl-analytics is unavailable.
      }

      const [summaryData, activeAccount] = await Promise.all([
        pnlService.getSummary(period).catch(() => []),
        masterService.getActiveAccount().catch(() => null),
      ]);

      const normalizedSummary = (Array.isArray(summaryData) ? summaryData : []).map(normalizeSummaryRow);
      setSummary(normalizedSummary);
      setDailyChart([]);
      setChildPerformance([]);

      const brokerAccountId = activeAccount?.brokerAccountId || activeAccount?.accountId;
      if (brokerAccountId) {
        const [unrealizedData, realizedData] = await Promise.all([
          pnlService.getUnrealizedPnl(brokerAccountId).catch(() => null),
          pnlService.getRealizedPnl({}).catch(() => null),
        ]);
        setUnrealized(unrealizedData);
        setRealized(realizedData);
      } else {
        setUnrealized(null);
        setRealized(null);
      }
    } catch {
      addToast('Error loading P&L data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, period]);

  useEffect(() => {
    let isMounted = true;
    const guardedLoad = async () => {
      await loadSummary(false);
    };
    if (isMounted) {
      guardedLoad();
    }
    return () => {
      isMounted = false;
    };
  }, [loadSummary]);

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
    if (Array.isArray(unrealized)) return safeSum(unrealized.map((pos) => pos.pnl));
    return 0;
  }, [unrealized]);

  const totalTrades = useMemo(() => {
    if (analyticsSummary?.totalTrades != null) return Number(analyticsSummary.totalTrades);
    if (summary.length) return safeSum(summary.map((row) => row.totalTrades));
    return realizedTrades.length;
  }, [analyticsSummary, summary, realizedTrades]);

  const avgWinRate = useMemo(() => {
    if (analyticsSummary?.winRate != null) return Number(analyticsSummary.winRate);
    if (!summary.length) return 0;
    return roundTo(safeDiv(safeSum(summary.map((row) => row.winRate)), summary.length), 1);
  }, [analyticsSummary, summary]);

  const monthlyTotal = safeAdd(realizedPnlVal, unrealizedPnlVal);
  const todayPnl = useMemo(() => {
    // summary.todayPnl is the authoritative value (unrealized P&L for current session)
    if (analyticsSummary?.todayPnl != null) return Number(analyticsSummary.todayPnl);
    if (dailyChart.length > 0) {
      const last = dailyChart[dailyChart.length - 1] || {};
      return Number(last.pnl ?? last.realizedPnl ?? last.value ?? 0);
    }
    if (summary.length > 0) {
      const last = summary[summary.length - 1] || {};
      return safeAdd(last.realizedPnl, last.unrealizedPnl);
    }
    return 0;
  }, [analyticsSummary, dailyChart, summary]);

  const dailyPnlChart = useMemo(() => {
    if (dailyChart.length > 0) {
      return dailyChart.map((row, index) => ({
        time: String(row.date || row.label || index + 1),
        value: Number(row.pnl ?? row.realizedPnl ?? 0),
        copies: Number(row.copiesSuccess ?? row.value ?? 0),
      }));
    }
    return summary.map((row, index) => ({ time: String(row.period || index + 1), value: Number(row.realizedPnl || 0) + Number(row.unrealizedPnl || 0) }));
  }, [summary, dailyChart]);

  const weeklyBreakdown = useMemo(() => {
    if (!summary.length) return [];
    const buckets = [0, 0, 0, 0];
    summary.forEach((row, idx) => {
      const bucket = Math.min(3, Math.floor((idx / Math.max(1, summary.length)) * 4));
      buckets[bucket] = safeAdd(buckets[bucket], row.realizedPnl, row.unrealizedPnl);
    });
    return buckets.map((v, i) => ({ month: `Week ${i + 1}`, value: roundTo(v, 0) }));
  }, [summary]);

  const topInstruments = useMemo(() => {
    if (instrumentPnlData.length) {
      return [...instrumentPnlData]
        .map((t) => ({ instrument: String(t.instrument || t.symbol || 'UNKNOWN').toUpperCase(), pnl: Number(t.pnl ?? 0) }))
        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
        .slice(0, 6);
    }
    const map = new Map();
    realizedTrades.forEach((t) => {
      const key = String(t.symbol || t.instrument || 'UNKNOWN').toUpperCase();
      const pnl = Number(t.pnl || t.realizedPnl || 0);
      map.set(key, safeAdd(map.get(key) ?? 0, pnl));
    });
    return Array.from(map.entries())
      .map(([instrument, pnl]) => ({ instrument, pnl }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 6);
  }, [instrumentPnlData, realizedTrades]);

  const childComparison = useMemo(
    () =>
      (childPerformance.length ? childPerformance : (Array.isArray(unrealized?.children) ? unrealized.children : []))
        .map((c, idx) => ({
          id: c.id || c.childId || idx,
          follower: c.name || c.nickname || c.childName || c.email || `Child ${idx + 1}`,
          copiedTrades: Number(c.tradesCopied || c.tradeCount || 0),
          winRate: c.winRate != null ? Number(c.winRate) : (c.successRate != null ? Number(c.successRate) : null),
          pnl: Number(c.pnlToday ?? c.pnl ?? c.totalPnL ?? 0),
          multiplier: Number(c.scalingFactor || c.multiplier || 1),
          status: String(c.copyingStatus || c.status || '').toUpperCase() || null,
          openPositions: Number(c.openPositionsCount ?? c.openPositions ?? 0),
          pnlHistory: Array.isArray(c.pnlHistory) ? c.pnlHistory : [],
          dailyPnl: Array.isArray(c.dailyPnl) ? c.dailyPnl : [],
        }))
        .slice(0, 8),
    [childPerformance, unrealized]
  );

  const pnlBreakdownData = useMemo(() => {
    const realized = Math.abs(realizedPnlVal);
    const unrealized = Math.abs(unrealizedPnlVal);
    if (realized === 0 && unrealized === 0) return [];
    return [
      { name: 'Realized P&L', value: realized },
      { name: 'Unrealized P&L', value: unrealized },
    ];
  }, [realizedPnlVal, unrealizedPnlVal]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
        </div>
        <RefreshButton onClick={() => loadSummary(true)} loading={refreshing} />
      </div>

      <GlassCard>
        <div className="text-center py-4">
          <p className="text-muted-foreground text-xl">Total P&L This Month</p>
          <p className={`mt-3 text-6xl font-extrabold tracking-wide ${monthlyTotal >= 0 ? 'text-success' : 'text-danger'}`}>
            {monthlyTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthlyTotal))}
          </p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Today's P&L", value: todayPnl, isCurrency: true },
          { label: 'Realized P&L', value: realizedPnlVal, isCurrency: true },
          { label: 'Unrealized P&L', value: unrealizedPnlVal, isCurrency: true },
          { label: 'Win Rate', value: `${avgWinRate}%` },
          { label: 'Total Trades', value: totalTrades },
        ].map((card) => (
          <GlassCard key={card.label}>
            <div className="flex flex-col items-center gap-2 py-1">
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
          title="Daily realised P&L (30 days)"
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

      {pnlBreakdownData.length > 0 && (
        <GlassCard title="Realized vs Unrealized Breakdown">
          <div className="flex flex-col items-center">
            <DonutChart
              data={pnlBreakdownData}
              nameKey="name"
              valueKey="value"
              height={280}
              innerRadius={70}
              outerRadius={110}
              colors={['#00C896', '#F59E0B']}
              showLegend={true}
              tooltipFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            />
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard title="Top Instruments by P&L">
          <div className="space-y-3">
            {(bestTrade || worstTrade) && (
              <div className="flex gap-2 mb-4">
                {bestTrade && (
                  <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-0.5">Best Trade</p>
                    <p className="text-sm font-black text-emerald-500">{bestTrade.instrument}</p>
                    <p className="text-xs font-semibold text-emerald-400">+{formatCurrency(bestTrade.pnl)} · {bestTrade.trades} trades</p>
                  </div>
                )}
                {worstTrade && (
                  <div className="flex-1 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 mb-0.5">Worst Trade</p>
                    <p className="text-sm font-black text-rose-500">{worstTrade.instrument}</p>
                    <p className="text-xs font-semibold text-rose-400">{formatCurrency(worstTrade.pnl)} · {worstTrade.trades} trades</p>
                  </div>
                )}
              </div>
            )}
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
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Follower', 'Copied Trades', 'Multiplier', 'Win Rate', 'P&L Today', 'Open Positions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childComparison.length ? (
                  childComparison.map((row) => {
                    const isUp = row.pnl >= 0;
                    const statusCls = row.status === 'ACTIVE'
                      ? 'bg-emerald-500'
                      : row.status === 'PAUSED'
                        ? 'bg-amber-500'
                        : 'bg-slate-400';
                    return (
                      <tr key={row.id} className="border-b border-border/20 hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                        {/* Follower */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.status && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCls}`} />}
                            <div>
                              <p className="text-xs font-bold capitalize">{row.follower}</p>
                              {row.status && (
                                <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                                  row.status === 'ACTIVE' ? 'text-emerald-500' : row.status === 'PAUSED' ? 'text-amber-500' : 'text-muted-foreground'
                                }`}>{row.status}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Copied Trades */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-black">{row.copiedTrades > 0 ? row.copiedTrades : '—'}</span>
                        </td>
                        {/* Multiplier */}
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple border border-brand-purple/20">
                            {row.multiplier}x
                          </span>
                        </td>
                        {/* Win Rate */}
                        <td className="px-4 py-3">
                          {row.winRate != null ? (
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                              row.winRate >= 60
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : row.winRate >= 40
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            }`}>
                              {row.winRate}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 font-bold">N/A</span>
                          )}
                        </td>
                        {/* P&L Today */}
                        <td className="px-4 py-3">
                          <span className={`text-sm font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? '+' : ''}{formatCurrency(row.pnl)}
                          </span>
                        </td>
                        {/* Open Positions */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center min-w-[28px] rounded-full px-2.5 py-0.5 text-xs font-black border ${
                            row.openPositions > 0
                              ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20'
                              : 'bg-black/5 dark:bg-white/5 text-muted-foreground border-border/30'
                          }`}>
                            {row.openPositions}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No child performance data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
      {masterPositions.length > 0 && (
        <GlassCard title={`Open Positions (${masterPositions.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Symbol', 'Side', 'Qty', 'Avg Price', 'LTP', 'Unrealized P&L', 'Change %', 'Product'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {masterPositions.map((pos, idx) => {
                  const pnl = Number(pos.unrealizedPnl ?? pos.pnl ?? 0);
                  const change = Number(pos.change ?? 0);
                  const isBuy = String(pos.side || pos.type).toUpperCase() === 'BUY';
                  return (
                    <tr key={pos.symbol || idx} className="border-b border-border/20 hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-black">{pos.symbol || pos.instrument}</p>
                        <p className="text-[10px] text-muted-foreground">{pos.exchange}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          isBuy
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{pos.qty}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(pos.avgPrice)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(pos.ltp)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-black ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border/30 text-muted-foreground">
                          {pos.product}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default PnLAnalytics;
