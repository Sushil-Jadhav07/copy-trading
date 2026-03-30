import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Percent,
  IndianRupee,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import DataTable from '@/components/shared/DataTable';
import { portfolioPerformanceData, trades, followers, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

const Overview = () => {
  const { addToast } = useToast();
  const [timeRange, setTimeRange] = useState('1D');
  const [onboardingSteps, setOnboardingSteps] = useState([
    { id: 1, label: 'Connect Broker API', completed: true },
    { id: 2, label: 'Set Risk Limits', completed: true },
    { id: 3, label: 'Go Live', completed: false },
  ]);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const toggleOnboardingStep = (id) => {
    setOnboardingSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step
      )
    );
  };

  const earningsData = [
    { name: 'Subscription Fees', value: 98000 },
    { name: 'Performance Bonus', value: 28900 },
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
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Welcome back, Rahul!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={284320}
          prefix="₹"
          isCurrency
          change={12.5}
          changeLabel="vs last month"
          icon={IndianRupee}
        />
        <StatCard
          title="Win Rate"
          value={73.4}
          suffix="%"
          decimals={1}
          change={2.1}
          changeLabel="vs last month"
          icon={Percent}
          gradient="from-brand-blue to-brand-teal"
        />
        <StatCard
          title="Active Followers"
          value={48}
          change={8}
          changeLabel="new this week"
          icon={Users}
          gradient="from-brand-teal to-success"
        />
        <StatCard
          title="Today's Return"
          value={2.1}
          suffix="%"
          decimals={1}
          change={0.5}
          changeLabel="vs yesterday"
          icon={TrendingUp}
          gradient="from-brand-purple to-brand-teal"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Performance */}
        <GlassCard className="lg:col-span-2" title="Portfolio Performance">
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
            data={portfolioPerformanceData[timeRange]}
            height={300}
          />
        </GlassCard>

        {/* Earnings Breakdown */}
        <GlassCard title="Earnings Breakdown">
          <DonutChart data={earningsData} height={250} innerRadius={50} />
          <div className="mt-4 space-y-2">
            {earningsData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        idx === 0 ? '#7C3AED' : '#2563EB',
                    }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <GlassCard
          className="lg:col-span-2"
          title="Recent Trades"
          action={
            <button
              onClick={() => addToast('Export feature coming soon!', 'info')}
              className="text-sm text-brand-purple hover:underline"
            >
              View All
            </button>
          }
        >
          <DataTable
            columns={tradeColumns}
            data={trades.slice(0, 5)}
            pagination={false}
          />
        </GlassCard>

        {/* Followers Summary */}
        <GlassCard title="Top Followers">
          <div className="space-y-3">
            {followers.slice(0, 5).map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">
                      {follower.initials}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{follower.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(follower.allocation)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      follower.status === 'Active'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {follower.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Connected Children Summary — add this block */}
      <GlassCard title="Copy Trading Status" subtitle="Followers currently copying your trades live">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {followers.filter((f) => f.status === 'Active').slice(0, 3).map((f) => (
            <div key={f.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{f.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.tradesCopied} trades copied</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${f.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                  {f.totalPnL >= 0 ? '+' : ''}{formatCurrency(f.totalPnL)}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Live</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Onboarding Checklist */}
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold">Getting Started</h3>
              <p className="text-sm text-muted-foreground">
                Complete these steps to get the most out of TradePilot
              </p>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((step) => (
              <div
                key={step.id}
                onClick={() => toggleOnboardingStep(step.id)}
                className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-lg cursor-pointer hover:bg-black/10 dark:bg-white/10 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    step.completed
                      ? 'bg-brand-purple border-brand-purple'
                      : 'border-muted-foreground'
                  }`}
                >
                  {step.completed && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm ${
                    step.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Overview;
