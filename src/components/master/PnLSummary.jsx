import React, { useCallback, useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/shared/DataTable';
import RefreshButton from '@/components/shared/RefreshButton';
import { useMasterAnalytics, useMasterTradePnl } from '@/hooks/useMaster';
import { formatCompactINR, formatCurrency, safeAdd, safeSum, safeDiv, safeMul, roundTo } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const PnLSummary = () => {
  const { addToast } = useToast();
  const { analytics, refetch: refetchAnalytics } = useMasterAnalytics();
  const { tradePnl, error: tradePnlError, refetch: refetchTradePnl, loading } = useMasterTradePnl();
  const [refreshing, setRefreshing] = useState(false);
  const monthlyPnL = analytics.pnl || analytics.pnlSummary || [];
  const summary = tradePnl?.summary || {};
  const totalPnLFromSummary = safeAdd(summary.totalRealisedPnl, summary.totalUnrealisedPnl);
  const totalPnL = totalPnLFromSummary || safeSum(monthlyPnL.map((m) => m.netPnL));
  const totalTrades = Number(summary.totalTrades || 0) || safeSum(monthlyPnL.map((m) => m.trades));
  const avgWinRate = Number(summary.winRate || 0) || (() => {
    const totalMonthlyTrades = safeSum(monthlyPnL.map((m) => m.trades));
    if (!totalMonthlyTrades) return 0;
    const weightedSum = safeSum(monthlyPnL.map((m) => safeMul(m.winRate, m.trades)));
    return roundTo(safeDiv(weightedSum, totalMonthlyTrades), 1);
  })();

  useEffect(() => {
    if (tradePnlError) addToast(tradePnlError, 'error');
  }, [tradePnlError, addToast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAnalytics(), refetchTradePnl()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchAnalytics, refetchTradePnl]);

  const columns = [
    { header: 'Month', accessor: 'month' },
    { header: 'Trades', accessor: 'trades' },
    { header: 'Win', accessor: 'win' },
    { header: 'Loss', accessor: 'loss' },
    {
      header: 'Net P&L',
      accessor: 'netPnL',
      cell: (row) => (
        <span className={`font-medium ${row.netPnL >= 0 ? 'text-success' : 'text-danger'}`}>
          {row.netPnL >= 0 ? '+' : ''}
          {formatCurrency(row.netPnL)}
        </span>
      ),
    },
    { header: 'Win Rate', accessor: 'winRate', cell: (row) => `${row.winRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">P&L Summary</h1>
          <p className="text-sm text-muted-foreground">
            Track your trading performance over time
          </p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <GlassCard>
          <p className="text-sm text-muted-foreground">Total Net P&L</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnL >= 0 ? '+' : ''}
            {formatCurrency(totalPnL)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-muted-foreground">Total Trades</p>
          <p className="text-2xl font-bold">{totalTrades}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-muted-foreground">Avg Win Rate</p>
          <p className="text-2xl font-bold">{roundTo(avgWinRate, 1)}%</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassCard>
          <p className="text-sm text-muted-foreground">Realised P&L</p>
          <p className={`text-xl font-bold ${summary.totalRealisedPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {summary.totalRealisedPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalRealisedPnl || 0)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-muted-foreground">Unrealised P&L</p>
          <p className={`text-xl font-bold ${summary.totalUnrealisedPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {summary.totalUnrealisedPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalUnrealisedPnl || 0)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-muted-foreground">Today P&L</p>
          <p className={`text-xl font-bold ${summary.todayPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {summary.todayPnl >= 0 ? '+' : ''}{formatCurrency(summary.todayPnl || 0)}
          </p>
        </GlassCard>
      </div>

      <GlassCard title="Monthly P&L">
        <BarChart
          data={monthlyPnL}
          xKey="month"
          yKey="netPnL"
          height={300}
          yAxisFormatter={formatCompactINR}
        />
      </GlassCard>

      <GlassCard title="Monthly Breakdown">
        <DataTable
          columns={columns}
          data={monthlyPnL}
          pageSize={12}
          pagination={false}
        />
      </GlassCard>
    </div>
  );
};

export default PnLSummary;
