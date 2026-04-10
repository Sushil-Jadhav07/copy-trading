import React, { useEffect } from 'react';
import { TrendingUp, Users, IndianRupee, Percent, UserMinus } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DataTable from '@/components/shared/DataTable';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildAnalytics, useChildSubscriptions, useChildCopiedTrades } from '@/hooks/useChild';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const Overview = () => {
  const { addToast } = useToast();
  const { analytics, loading: analyticsLoading, error: analyticsError } = useChildAnalytics();
  const { subscriptions, refetch } = useChildSubscriptions();
  const { trades: copiedTrades, loading: tradesLoading, error: tradesError } = useChildCopiedTrades();

  useEffect(() => {
    if (analyticsError) addToast(analyticsError, 'error');
    if (tradesError) addToast(tradesError, 'error');
  }, [analyticsError, tradesError, addToast]);

  const handleUnfollow = async (id) => {
    try {
      await childService.unsubscribe(id);
      addToast('Unfollowed master', 'success');
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const tradeColumns = [
    { header: 'Master', accessor: 'master' },
    { header: 'Instrument', accessor: 'instrument' },
    { header: 'Type', accessor: 'type', isType: true },
    { header: 'My Qty', accessor: 'myQty' },
    { header: 'My P&L', accessor: 'pnl', cell: (row) => <span className={row.pnl >= 0 ? 'text-success' : 'text-danger'}>{row.pnl >= 0 ? '+' : ''}₹{row.pnl.toFixed(2)}</span> },
    { header: 'Time', accessor: 'time' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back, Amit!</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Portfolio Value" value={analytics.portfolioValue || 0} prefix="₹" isCurrency icon={IndianRupee} />
        <StatCard title="Total P&L" value={analytics.totalPnL || 0} prefix="₹" isCurrency icon={TrendingUp} gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Win Rate" value={analytics.winRate || 0} suffix="%" decimals={1} icon={Percent} gradient="from-brand-teal to-success" />
        <StatCard title="Masters Copied" value={analytics.activeMasters || subscriptions.length} icon={Users} gradient="from-brand-purple to-brand-teal" />
      </div>

      <GlassCard title="Portfolio Performance">
        {analyticsLoading ? <SkeletonLoader type="chart" /> : <LineChart data={analytics.performanceChart || analytics.equityCurve || []} height={300} />}
      </GlassCard>

      <GlassCard title="My Masters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptions.map((master) => (
            <div key={master.id || master.masterId} className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{master.masterName || master.name}</h3>
                <button onClick={() => handleUnfollow(master.id || master.masterId)} className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"><UserMinus className="w-4 h-4 text-danger" /></button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Allocation</span><span>{formatCurrency(master.allocation || master.allocationAmount || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Multiplier</span><span>{master.multiplier || 1}x</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trades Today</span><span>{master.tradesCopiedToday || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total P&L</span><span className={(master.totalPnL || master.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}>{(master.totalPnL || master.pnl || 0) >= 0 ? '+' : ''}{formatCurrency(master.totalPnL || master.pnl || 0)}</span></div>
              </div>
              <div className="mt-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${master.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{master.status === 'ACTIVE' ? 'Active' : 'Paused'}</span></div>
            </div>
          ))}
          {!subscriptions.length && <p className="text-sm text-muted-foreground">No data available</p>}
        </div>
      </GlassCard>

      <GlassCard title="Recent Copied Trades">
        {tradesLoading ? <SkeletonLoader type="table" rows={5} columns={6} /> : <DataTable columns={tradeColumns} data={copiedTrades.slice(0, 10)} pagination={false} />}
      </GlassCard>
    </div>
  );
};

export default Overview;
