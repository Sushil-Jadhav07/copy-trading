import React from 'react';
import GlassCard from '@/components/shared/GlassCard';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/shared/DataTable';
import { monthlyPnL, formatCurrency } from '@/data/mockData';

const PnLSummary = () => {
  const totalPnL = monthlyPnL.reduce((sum, m) => sum + m.netPnL, 0);
  const totalTrades = monthlyPnL.reduce((sum, m) => sum + m.trades, 0);
  const avgWinRate =
    monthlyPnL.reduce((sum, m) => sum + m.winRate, 0) / monthlyPnL.length;

  const columns = [
    { header: 'Month', accessor: 'month' },
    { header: 'Trades', accessor: 'trades' },
    { header: 'Win', accessor: 'win' },
    { header: 'Loss', accessor: 'loss' },
    {
      header: 'Net P&L',
      accessor: 'netPnL',
      cell: (row) => (
        <span
          className={`font-medium ${
            row.netPnL >= 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {row.netPnL >= 0 ? '+' : ''}
          {formatCurrency(row.netPnL)}
        </span>
      ),
    },
    { header: 'Win Rate', accessor: 'winRate', cell: (row) => `${row.winRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Summary</h1>
          <p className="text-muted-foreground">
            Track your trading performance over time
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <p className="text-sm text-muted-foreground">Total Net P&L</p>
          <p
            className={`text-2xl font-bold ${
              totalPnL >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
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

      {/* Monthly Chart */}
      <GlassCard title="Monthly P&L">
        <BarChart
          data={monthlyPnL}
          xKey="month"
          yKey="netPnL"
          height={300}
          yAxisFormatter={(val) => `₹${val / 1000}K`}
        />
      </GlassCard>

      {/* Breakdown Table */}
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
