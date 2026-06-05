import React, { useEffect } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/shared/DataTable';
import { useMasterAnalytics, useMasterTradePnl } from '@/hooks/useMaster';
import { formatCompactINR, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const PnLSummary = () => {
  const { addToast } = useToast();
  const { analytics } = useMasterAnalytics();
  const { tradePnl, error: tradePnlError } = useMasterTradePnl();
  const monthlyPnL = analytics.pnl || analytics.pnlSummary || [];
  const summary = tradePnl?.summary || {};
  const totalPnLFromSummary = Number(summary.totalRealisedPnl || 0) + Number(summary.totalUnrealisedPnl || 0);
  const totalPnL = totalPnLFromSummary || monthlyPnL.reduce((sum, m) => sum + Number(m.netPnL || 0), 0);
  const totalTrades = Number(summary.totalTrades || 0) || monthlyPnL.reduce((sum, m) => sum + Number(m.trades || 0), 0);
  const avgWinRate = Number(summary.winRate || 0) || (() => {
    const totalMonthlyTrades = monthlyPnL.reduce((sum, m) => sum + Number(m.trades || 0), 0);
    if (!totalMonthlyTrades) return 0;
    return monthlyPnL.reduce((sum, m) => sum + Number(m.winRate || 0) * Number(m.trades || 0), 0) / totalMonthlyTrades;
  })();

  useEffect(() => {
    if (tradePnlError) addToast(tradePnlError, 'error');
  }, [tradePnlError, addToast]);

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
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">P&L Summary</h1>
        <p className="text-sm text-muted-foreground">
          Track your trading performance over time
        </p>
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
          <p className="text-2xl font-bold">{avgWinRate.toFixed(1)}%</p>
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
