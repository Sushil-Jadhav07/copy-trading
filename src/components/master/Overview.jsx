import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Percent, IndianRupee } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import DataTable from '@/components/shared/DataTable';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { useMasterAnalytics, useMasterTradeHistory, useMasterChildren } from '@/hooks/useMaster';
import { connectChannel } from '@/lib/websocket';
import { useAuth } from '@/context/AuthContext';

const Overview = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('1D');
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const { analytics, loading: analyticsLoading, error: analyticsError } = useMasterAnalytics();
  const { trades: recentTrades, loading: tradesLoading, error: tradesError } = useMasterTradeHistory();
  const { children } = useMasterChildren();

  useEffect(() => {
    if (analyticsError) addToast(analyticsError, 'error');
    if (tradesError) addToast(tradesError, 'error');
  }, [analyticsError, tradesError, addToast]);

  useEffect(() => {
    const connection = connectChannel(
      'trades',
      (event, data) => {
        setLiveEvents((current) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            event,
            data,
            timestamp: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 20));
      },
      () => setLiveConnected(true),
      () => setLiveConnected(false),
    );

    return () => {
      setLiveConnected(false);
      connection.close();
    };
  }, []);

  const performanceChart = analytics.performanceChart || analytics.equityCurve || analytics.chartData || [];
  const chartData = Array.isArray(performanceChart[timeRange]) ? performanceChart[timeRange] : performanceChart;
  const followers = children.map((child, index) => ({
    id: child.id || child.childId || index,
    initials: (child.name || child.childName || 'UN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    name: child.name || child.childName || 'Unknown',
    allocation: Number(child.allocation || child.allocationAmount || 0),
    status: child.status === 'ACTIVE' || child.tradingEnabled ? 'Active' : 'Paused',
    tradesCopied: Number(child.tradesCopied || child.tradeCount || 0),
    totalPnL: Number(child.totalPnL || child.pnl || 0),
  }));
  const earningsData = analytics.earningsBreakdown || [
    { name: 'Subscription Fees', value: analytics.subscriptionRevenue || analytics.revenue || 0 },
    { name: 'Performance Bonus', value: analytics.performanceBonus || 0 },
  ];
  const tradeColumns = [
    { header: 'Instrument', accessor: 'instrument' },
    { header: 'Type', accessor: 'type', isType: true },
    { header: 'Qty', accessor: 'qty' },
    { header: 'Entry Price', accessor: 'entryPrice' },
    { header: 'Current Price', accessor: 'exitPrice' },
    { header: 'P&L', accessor: 'pnl', isPnL: true },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name || 'there'}!</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Followers" value={analytics.totalChildren || analytics.totalFollowers || children.length || 0} icon={Users} />
        <StatCard title="Revenue / Earnings" value={analytics.revenue || analytics.totalEarnings || 0} isCurrency icon={IndianRupee} gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Win Rate" value={analytics.winRate || 0} suffix="%" decimals={1} icon={Percent} gradient="from-brand-teal to-success" />
        <StatCard title="Portfolio Value" value={analytics.portfolioValue || analytics.totalValue || 0} isCurrency icon={TrendingUp} gradient="from-brand-purple to-brand-teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2" title="Portfolio Performance">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['1D', '1W', '1M', '3M'].map((range) => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === range ? 'bg-brand-purple text-white' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
                {range}
              </button>
            ))}
          </div>
          {analyticsLoading ? <SkeletonLoader type="chart" /> : <LineChart data={chartData || []} height={300} />}
        </GlassCard>

        <GlassCard title="Earnings Breakdown">
          <DonutChart data={earningsData} height={250} innerRadius={50} />
          <div className="mt-4 space-y-2">
            {earningsData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: idx === 0 ? '#7C3AED' : '#2563EB' }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2" title="Recent Trades" action={<button onClick={() => addToast('Export feature coming soon!', 'info')} className="text-sm text-brand-purple hover:underline">View All</button>}>
          {tradesLoading ? <SkeletonLoader type="table" rows={5} columns={7} /> : <DataTable columns={tradeColumns} data={recentTrades.slice(0, 5)} pagination={false} emptyMessage="No data available" />}
        </GlassCard>

        <GlassCard title="Top Followers">
          <div className="space-y-3">
            {followers.slice(0, 5).map((follower) => (
              <div key={follower.id} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{follower.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{follower.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(follower.allocation)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${follower.status === 'Active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{follower.status}</span>
                </div>
              </div>
            ))}
            {!followers.length && <p className="text-sm text-muted-foreground">No data available</p>}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Copy Trading Status" subtitle="Followers currently copying your trades live">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {followers.filter((f) => f.status === 'Active').slice(0, 3).map((f) => (
            <div key={f.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{f.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.tradesCopied} trades copied</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${f.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>{f.totalPnL >= 0 ? '+' : ''}{formatCurrency(f.totalPnL)}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Live</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard
        title="Live Trade Feed"
        subtitle="Last 20 trade engine events"
        action={
          <span className={`text-xs font-semibold ${liveConnected ? 'text-emerald-500' : 'text-muted-foreground'}`}>
            {liveConnected ? '● Live' : '○ Disconnected'}
          </span>
        }
      >
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {liveEvents.map((item) => {
            const tone =
              item.event === 'TRADE_EXECUTED' ? 'bg-emerald-500/15 text-emerald-500' :
              item.event === 'TRADE_FAILED' ? 'bg-rose-500/15 text-rose-500' :
              item.event === 'TRADE_CANCELLED' ? 'bg-amber-500/15 text-amber-500' :
              'bg-brand-blue/15 text-brand-blue';
            return (
              <div key={item.id} className="rounded-lg bg-black/5 p-3 dark:bg-white/5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>{item.event}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.data?.message || item.data?.description || item.data?.symbol || 'Trade event received'}
                  </p>
                </div>
              </div>
            );
          })}
          {!liveEvents.length && <p className="text-sm text-muted-foreground">No live trade events received yet.</p>}
        </div>
      </GlassCard>

    </div>
  );
};

export default Overview;
