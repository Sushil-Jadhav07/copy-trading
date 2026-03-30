import React from 'react';
import { Users, TrendingUp, IndianRupee, Activity, Server, Check, AlertTriangle, X } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DataTable from '@/components/shared/DataTable';
import { platformStats, userGrowthData, trades, formatCurrency } from '@/data/mockData';

const Overview = () => {
  const systemHealth = [
    { name: 'Zerodha API', status: 'Online', latency: '45ms' },
    { name: 'Upstox API', status: 'Online', latency: '62ms' },
    { name: 'Angel One API', status: 'Degraded', latency: '245ms' },
    { name: 'Fyers API', status: 'Online', latency: '38ms' },
  ];

  const tradeColumns = [
    { header: 'User', accessor: 'instrument' },
    { header: 'Master', accessor: 'market' },
    { header: 'Instrument', accessor: 'type', isType: true },
    { header: 'Qty', accessor: 'qty' },
    { header: 'Value', accessor: 'pnl', cell: (row) => formatCurrency(row.pnl) },
    { header: 'Time', accessor: 'date' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Platform analytics and monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={284}
          change={12}
          changeLabel="new this week"
          icon={Users}
        />
        <StatCard
          title="Active Masters"
          value={42}
          change={5}
          changeLabel="new this month"
          icon={TrendingUp}
          gradient="from-brand-blue to-brand-teal"
        />
        <StatCard
          title="Volume Today"
          value={4820000}
          prefix="₹"
          isCurrency
          change={8.5}
          changeLabel="vs yesterday"
          icon={IndianRupee}
          gradient="from-brand-teal to-success"
        />
        <StatCard
          title="Revenue MTD"
          value={125000}
          prefix="₹"
          isCurrency
          change={15.2}
          changeLabel="vs last month"
          icon={Activity}
          gradient="from-brand-purple to-brand-teal"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="User Growth (Last 30 Days)">
          <LineChart data={userGrowthData} xKey="date" yKey="totalUsers" height={250} />
        </GlassCard>

        <GlassCard title="System Health">
          <div className="space-y-3">
            {systemHealth.map((api) => (
              <div key={api.name} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-muted-foreground" />
                  <span>{api.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{api.latency}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      api.status === 'Online'
                        ? 'bg-success/20 text-success'
                        : api.status === 'Degraded'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-danger/20 text-danger'
                    }`}
                  >
                    {api.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard title="Recent Activity">
        <DataTable
          columns={tradeColumns}
          data={trades.slice(0, 5)}
          pagination={false}
        />
      </GlassCard>

      {/* Top Masters by Volume */}
      <GlassCard title="Top Masters by Volume Today">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Rahul Mehta', volume: 1250000, trades: 45 },
            { name: 'Arjun Patel', volume: 980000, trades: 62 },
            { name: 'Vikram Das', volume: 750000, trades: 38 },
          ].map((master, idx) => (
            <div key={master.name} className="p-4 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-brand-purple">#{idx + 1}</span>
                <span className="font-medium">{master.name}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(master.volume)}</p>
              <p className="text-sm text-muted-foreground">{master.trades} trades today</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

export default Overview;
