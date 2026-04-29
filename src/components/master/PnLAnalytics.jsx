import React, { useEffect, useMemo, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import DataTable from '@/components/shared/DataTable';
import LineChart from '@/components/charts/LineChart';
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
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [fetchingRealized, setFetchingRealized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const [summaryData, activeAccount] = await Promise.all([
          pnlService.getSummary(period).catch((err) => {
            console.warn('Summary Fetch Failed:', err);
            return [];
          }),
          masterService.getActiveAccount().catch(() => null)
        ]);
        
        if (!isMounted) return;

        const normalizedSummary = (Array.isArray(summaryData) ? summaryData : []).map(normalizeSummaryRow);
        setSummary(normalizedSummary);
        
        const brokerAccountId = activeAccount?.brokerAccountId || activeAccount?.accountId;
        if (brokerAccountId) {
          const unrealizedData = await pnlService.getUnrealizedPnl(brokerAccountId).catch((err) => {
            console.warn('Unrealized PnL Fetch Failed:', err);
            return null;
          });
          if (isMounted) setUnrealized(unrealizedData);
        }
      } catch (error) {
        console.error('PnL Summary Load Error:', error);
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

  const handleRealizedFetch = async () => {
    setFetchingRealized(true);
    try {
      const data = await pnlService.getRealizedPnl(dateRange);
      setRealized(data);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setFetchingRealized(false);
    }
  };

  const chartData = useMemo(() => {
    try {
      if (!summary || !Array.isArray(summary) || summary.length === 0) {
        return [];
      }
      return summary.map((row) => ({ 
        time: String(row.period || row.label || 'N/A'), 
        value: Number(row.realizedPnl || 0) + Number(row.unrealizedPnl || 0) 
      }));
    } catch (e) {
      console.error('Chart Data Error:', e);
      return [];
    }
  }, [summary]);

  const columns = [
    { header: 'Period', accessor: 'period' },
    { header: 'Realized P&L', accessor: 'realizedPnl', cell: (row) => <span className={row.realizedPnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(row.realizedPnl)}</span> },
    { header: 'Unrealized P&L', accessor: 'unrealizedPnl', cell: (row) => <span className={row.unrealizedPnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(row.unrealizedPnl)}</span> },
    { header: 'Total Trades', accessor: 'totalTrades' },
    { header: 'Win Rate', accessor: 'winRate', cell: (row) => `${row.winRate}%` },
  ];

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
    if (Array.isArray(unrealized)) {
      return unrealized.reduce((sum, pos) => sum + Number(pos.pnl || 0), 0);
    }
    return 0;
  }, [unrealized]);

  const unrealizedPositions = useMemo(() => {
    if (!unrealized) return [];
    if (Array.isArray(unrealized.positions)) return unrealized.positions;
    if (Array.isArray(unrealized)) return unrealized;
    return [];
  }, [unrealized]);

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
        <h1 className="text-xl font-bold sm:text-2xl">P&L Analytics</h1>
        <p className="text-sm text-muted-foreground">Trend, realized range queries, and unrealized positions in one view.</p>
      </div>

      <GlassCard title="Summary Trend" action={<div className="flex flex-wrap gap-2">{PERIODS.map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${period === item ? 'bg-brand-purple text-white' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>{item}</button>)}</div>}>
        <div className="h-[400px]">
          {chartData.length > 0 ? (
            <LineChart data={chartData} xKey="time" yKey="value" height={400} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard title="P&L Summary Table">
        <DataTable columns={columns} data={summary} pagination={false} emptyMessage="No summary rows available" />
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title="Realized P&L">
          <div className="grid gap-3 md:grid-cols-3">
            <input type="date" value={dateRange.from} onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))} className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5" />
            <input type="date" value={dateRange.to} onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))} className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5" />
            <button type="button" onClick={handleRealizedFetch} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90">{fetchingRealized ? 'Fetching...' : 'Fetch'}</button>
          </div>
          {realized && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
                <p className="text-xs text-muted-foreground">Total Realized P&L</p>
                <p className={`mt-1 text-lg font-semibold ${realizedPnlVal >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(realizedPnlVal)}</p>
              </div>
              <div className="space-y-2">
                {realizedTrades.map((trade, index) => (
                  <div key={trade.id || trade.tradeId || index} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{trade.symbol || trade.instrument || 'Trade'}</span>
                      <span className={Number(trade.pnl || trade.realizedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(Number(trade.pnl || trade.realizedPnl || 0))}</span>
                    </div>
                  </div>
                ))}
                {!realizedTrades.length && <p className="text-sm text-muted-foreground">No trades returned for the selected range.</p>}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Unrealized P&L">
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Current Unrealized P&L</p>
            <p className={`mt-1 text-lg font-semibold ${unrealizedPnlVal >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(unrealizedPnlVal)}</p>
          </div>
          <div className="mt-4 space-y-2">
            {unrealizedPositions.map((position, index) => (
              <div key={position.id || position.symbol || index} className="flex items-center justify-between rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                <div><p className="font-semibold">{position.symbol || position.instrument || 'Position'}</p><p className="text-xs text-muted-foreground">Qty: {position.qty || position.quantity || 0}</p></div>
                <span className={Number(position.pnl || 0) >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(Number(position.pnl || 0))}</span>
              </div>
            ))}
            {!unrealizedPositions.length && <p className="text-sm text-muted-foreground">No open positions available.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default PnLAnalytics;
