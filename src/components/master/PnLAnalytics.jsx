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

  const loadSummary = async (nextPeriod = period) => {
    setLoading(true);
    try {
      const [summaryData, activeAccount] = await Promise.all([pnlService.getSummary(nextPeriod), masterService.getActiveAccount().catch(() => null)]);
      setSummary((summaryData || []).map(normalizeSummaryRow));
      const brokerAccountId = activeAccount?.brokerAccountId || activeAccount?.accountId;
      const unrealizedData = await pnlService.getUnrealizedPnl(brokerAccountId);
      setUnrealized(unrealizedData);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(period);
  }, [period]);

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

  const chartData = useMemo(() => summary.map((row) => ({ time: row.period, value: row.realizedPnl + row.unrealizedPnl })), [summary]);

  const columns = [
    { header: 'Period', accessor: 'period' },
    { header: 'Realized P&L', accessor: 'realizedPnl', cell: (row) => <span className={row.realizedPnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(row.realizedPnl)}</span> },
    { header: 'Unrealized P&L', accessor: 'unrealizedPnl', cell: (row) => <span className={row.unrealizedPnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(row.unrealizedPnl)}</span> },
    { header: 'Total Trades', accessor: 'totalTrades' },
    { header: 'Win Rate', accessor: 'winRate', cell: (row) => `${row.winRate}%` },
  ];

  if (loading) {
    return <SkeletonLoader type="chart" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">P&L Analytics</h1>
        <p className="text-sm text-muted-foreground">Trend, realized range queries, and unrealized positions in one view.</p>
      </div>

      <GlassCard title="Summary Trend" action={<div className="flex flex-wrap gap-2">{PERIODS.map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${period === item ? 'bg-brand-purple text-white' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>{item}</button>)}</div>}>
        {summary.length ? <LineChart data={chartData} xKey="time" yKey="value" height={280} /> : <p className="text-sm text-muted-foreground">No summary data available.</p>}
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
                <p className={`mt-1 text-lg font-semibold ${Number(realized.realizedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(Number(realized.realizedPnl || 0))}</p>
              </div>
              <div className="space-y-2">
                {(realized.trades || []).map((trade, index) => (
                  <div key={trade.id || trade.tradeId || index} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{trade.symbol || trade.instrument || 'Trade'}</span>
                      <span className={Number(trade.pnl || trade.realizedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(Number(trade.pnl || trade.realizedPnl || 0))}</span>
                    </div>
                  </div>
                ))}
                {!(realized.trades || []).length && <p className="text-sm text-muted-foreground">No trades returned for the selected range.</p>}
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Unrealized P&L">
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Current Unrealized P&L</p>
            <p className={`mt-1 text-lg font-semibold ${Number(unrealized?.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(Number(unrealized?.unrealizedPnl || 0))}</p>
          </div>
          <div className="mt-4 space-y-2">
            {(unrealized?.positions || []).map((position, index) => (
              <div key={position.id || position.symbol || index} className="flex items-center justify-between rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                <div><p className="font-semibold">{position.symbol || position.instrument || 'Position'}</p><p className="text-xs text-muted-foreground">Qty: {position.qty || position.quantity || 0}</p></div>
                <span className={Number(position.pnl || 0) >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{formatCurrency(Number(position.pnl || 0))}</span>
              </div>
            ))}
            {!(unrealized?.positions || []).length && <p className="text-sm text-muted-foreground">No open positions available.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default PnLAnalytics;
