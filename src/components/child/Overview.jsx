import React, { useState } from 'react';
import { TrendingUp, Users, IndianRupee, Percent, UserMinus } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DataTable from '@/components/shared/DataTable';
import { childPortfolioData, myMasters, copiedTrades, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

const Overview = () => {
  const { addToast } = useToast();
  const [timeRange, setTimeRange] = useState('1D');
  const [masters, setMasters] = useState(myMasters);

  const handleUnfollow = (id) => {
    setMasters((prev) => prev.filter((m) => m.id !== id));
    addToast('Unfollowed master', 'success');
  };

  const tradeColumns = [
    { header: 'Master', accessor: 'master' },
    { header: 'Instrument', accessor: 'instrument' },
    { header: 'Type', accessor: 'type', isType: true },
    { header: 'My Qty', accessor: 'myQty' },
    {
      header: 'My P&L',
      accessor: 'pnl',
      cell: (row) => (
        <span className={row.pnl >= 0 ? 'text-success' : 'text-danger'}>
          {row.pnl >= 0 ? '+' : ''}₹{row.pnl.toFixed(2)}
        </span>
      ),
    },
    { header: 'Time', accessor: 'time' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Welcome back, Amit!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Portfolio Value"
          value={124500}
          prefix="₹"
          isCurrency
          change={5.2}
          changeLabel="vs last week"
          icon={IndianRupee}
        />
        <StatCard
          title="Total Invested"
          value={100000}
          prefix="₹"
          isCurrency
          icon={TrendingUp}
          gradient="from-brand-blue to-brand-teal"
        />
        <StatCard
          title="Total Return"
          value={24.5}
          suffix="%"
          decimals={1}
          change={3.2}
          changeLabel="vs last month"
          icon={Percent}
          gradient="from-brand-teal to-success"
        />
        <StatCard
          title="Masters Copied"
          value={3}
          change={1}
          changeLabel="new this month"
          icon={Users}
          gradient="from-brand-purple to-brand-teal"
        />
      </div>

      {/* Portfolio Chart */}
      <GlassCard title="Portfolio Performance">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['1D', '1W', '1M', '3M'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-brand-purple text-foreground'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        <LineChart
          data={childPortfolioData[timeRange]}
          height={300}
        />
      </GlassCard>

      {/* My Masters */}
      <GlassCard title="My Masters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {masters.map((master) => (
            <div key={master.id} className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{master.name}</h3>
                <button
                  onClick={() => handleUnfollow(master.id)}
                  className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"
                >
                  <UserMinus className="w-4 h-4 text-danger" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allocation</span>
                  <span>{formatCurrency(master.allocation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multiplier</span>
                  <span>{master.multiplier}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades Today</span>
                  <span>{master.tradesCopiedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total P&L</span>
                  <span className={master.totalPnL >= 0 ? 'text-success' : 'text-danger'}>
                    {master.totalPnL >= 0 ? '+' : ''}{formatCurrency(master.totalPnL)}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    master.status === 'Active'
                      ? 'bg-success/20 text-success'
                      : 'bg-warning/20 text-warning'
                  }`}
                >
                  {master.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Copied Trades */}
      <GlassCard title="Recent Copied Trades">
        <DataTable
          columns={tradeColumns}
          data={copiedTrades}
          pagination={false}
        />
      </GlassCard>
    </div>
  );
};

export default Overview;
