import React from 'react';
import { DollarSign, Download } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/shared/DataTable';
import { useMasterAnalytics } from '@/hooks/useMaster';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const Earnings = () => {
  const { addToast } = useToast();
  const { analytics } = useMasterAnalytics();
  const earningsData = analytics.earnings || analytics.subscriptionRevenue || [];
  const payoutHistory = analytics.payoutHistory || [];
  const totalEarnings = earningsData.reduce((sum, e) => sum + e.total, 0);
  const currentMonth = earningsData[earningsData.length - 1] || { total: 0, subscribers: 0 };

  const columns = [
    { header: 'Month', accessor: 'month' },
    { header: 'Subscribers', accessor: 'subscribers' },
    {
      header: 'Subscription Fee',
      accessor: 'subscriptionFee',
      cell: (row) => formatCurrency(row.subscriptionFee),
    },
    {
      header: 'Performance Bonus',
      accessor: 'performanceBonus',
      cell: (row) => formatCurrency(row.performanceBonus),
    },
    {
      header: 'Total',
      accessor: 'total',
      cell: (row) => <span className="font-medium">{formatCurrency(row.total)}</span>,
    },
  ];

  const payoutColumns = [
    { header: 'Date', accessor: 'date' },
    {
      header: 'Amount',
      accessor: 'amount',
      cell: (row) => formatCurrency(row.amount),
    },
    { header: 'Method', accessor: 'method' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleExport = () => {
    addToast('Earnings report exported', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Track your income from copy trading</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-purple/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold">{formatCurrency(currentMonth.total)}</p>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-muted-foreground">Active Subscribers</p>
          <p className="text-2xl font-bold">{currentMonth.subscribers}</p>
        </GlassCard>
      </div>

      {/* Monthly Chart */}
      <GlassCard title="Monthly Earnings">
        <BarChart
          data={earningsData}
          yKeys={['subscriptionFee', 'performanceBonus']}
          stacked
          height={300}
          yAxisFormatter={(val) => `₹${val / 1000}K`}
        />
      </GlassCard>

      {/* Breakdown Table */}
      <GlassCard title="Earnings Breakdown">
        <DataTable
          columns={columns}
          data={earningsData}
          pageSize={12}
          pagination={false}
        />
      </GlassCard>

      {/* Payout History */}
      <GlassCard title="Payout History">
        <DataTable
          columns={payoutColumns}
          data={payoutHistory}
          pageSize={5}
        />
      </GlassCard>
    </div>
  );
};

export default Earnings;
