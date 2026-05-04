import React, { useState, useEffect } from 'react';
import { DollarSign, Download } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/shared/DataTable';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const Earnings = () => {
  const { addToast } = useToast();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const earningsData = await masterService.getEarnings();
        let payoutData = [];
        try {
          const payouts = await masterService.getPayouts();
          payoutData = Array.isArray(payouts?.payouts)
            ? payouts.payouts
            : Array.isArray(payouts?.data?.payouts)
            ? payouts.data.payouts
            : Array.isArray(payouts)
            ? payouts
            : [];
        } catch {
          payoutData = [];
        }

        setEarnings({
          ...earningsData,
          payouts: payoutData.length > 0
            ? payoutData
            : Array.isArray(earningsData?.payouts)
            ? earningsData.payouts
            : [],
        });
      } catch (error) {
        addToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addToast]);

  const earningsData = Array.isArray(earnings?.monthlyBreakdown) ? earnings.monthlyBreakdown : [];
  const payoutHistory = Array.isArray(earnings?.payouts) ? earnings.payouts : [];
  const totalEarnings = earnings?.totalEarnings || 0;
  const currentMonth = earnings?.thisMonth || 0;
  const pendingPayout = earnings?.pendingPayout || 0;
  const hasDetailedBreakdown = earningsData.some(
    (entry) => 'subscriptionFee' in entry || 'performanceBonus' in entry
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Earnings</h1>
          <p className="text-sm text-muted-foreground">Track your income from copy trading</p>
        </div>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
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
          <p className="text-2xl font-bold">{formatCurrency(currentMonth)}</p>
        </GlassCard>

        <GlassCard>
          <p className="text-sm text-muted-foreground">Pending Payout</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingPayout)}</p>
        </GlassCard>
      </div>

      {hasDetailedBreakdown ? (
        <>
          <GlassCard title="Monthly Earnings">
            <BarChart
              data={earningsData}
              yKeys={['subscriptionFee', 'performanceBonus']}
              stacked
              height={300}
              yAxisFormatter={(val) => `₹${val / 1000}K`}
            />
          </GlassCard>

          <GlassCard title="Earnings Breakdown">
            <DataTable
              columns={columns}
              data={earningsData}
              pageSize={12}
              pagination={false}
            />
          </GlassCard>
        </>
      ) : (
        <GlassCard title="Earnings Breakdown">
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Detailed subscription and performance bonus fields are not available in the current earnings API response.
            </p>
          </div>
        </GlassCard>
      )}

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
