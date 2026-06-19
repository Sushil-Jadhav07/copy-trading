import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ListOrdered,
  Radio,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminService } from '@/lib/admin';

// Static fallback — only shown while API loads or if API has no chart data
const FALLBACK_EQUITY_CURVE = [
  { label: '01 Jun', equity: 285000, followers: 42000 },
  { label: '03 Jun', equity: 286400, followers: 39800 },
  { label: '05 Jun', equity: 290800, followers: 43100 },
  { label: '07 Jun', equity: 292500, followers: 41200 },
  { label: '09 Jun', equity: 296300, followers: 44800 },
  { label: '11 Jun', equity: 299700, followers: 40800 },
  { label: '13 Jun', equity: 304400, followers: 46900 },
  { label: '15 Jun', equity: 309200, followers: 43500 },
  { label: '17 Jun', equity: 313600, followers: 47600 },
  { label: '19 Jun', equity: 318900, followers: 44200 },
  { label: '21 Jun', equity: 322700, followers: 49300 },
  { label: '23 Jun', equity: 327500, followers: 45500 },
  { label: '25 Jun', equity: 333200, followers: 50700 },
  { label: '27 Jun', equity: 336100, followers: 47200 },
  { label: '29 Jun', equity: 341700, followers: 52000 },
  { label: '30 Jun', equity: 347600, followers: 48600 },
];

const FALLBACK_CHILD_PERF = [
  { name: 'Profitable', value: 9, color: '#10d2a3' },
  { name: 'Loss-making', value: 2, color: '#0c6b56' },
  { name: 'Paused', value: 1, color: '#28453f' },
];

const FALLBACK_TRADE_BREAKDOWN = [
  { name: 'Buy Orders', value: 14, color: '#13c6a0' },
  { name: 'Sell Orders', value: 9, color: '#0c6b56' },
];

const DEFAULT_ASSET_MIX = [
  { name: 'Equity', value: 52, color: '#10d2a3' },
  { name: 'F&O', value: 48, color: '#13c6a0' },
];

const panelClass = 'glass-card hover-lift relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCurrency = (value) => {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
};

const SummaryCard = ({ card }) => {
  const Icon = card.icon;

  const displayValue = (() => {
    if (typeof card.value === 'string') return card.value;
    if (card.format === 'count') {
      return typeof card.value === 'number'
        ? card.value.toLocaleString('en-IN')
        : '—';
    }
    return typeof card.value === 'number' ? formatCurrency(card.value) : card.value ?? '—';
  })();

  return (
    <section className={`${panelClass} min-h-[124px] p-4 sm:p-5`}>
      <div className="relative z-10 flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span>{card.title}</span>
            </div>
            <div className="text-[1.85rem] font-semibold tracking-[-0.04em] text-slate-900 dark:text-foreground">
              {displayValue}
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{card.note}</div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </section>
  );
};

const Overview = () => {
  const [selectedRange, setSelectedRange] = useState('1M');
  const [analytics, setAnalytics] = useState(null);
  const [equityCurveData, setEquityCurveData] = useState(FALLBACK_EQUITY_CURVE);
  const [childPerfData, setChildPerfData] = useState(FALLBACK_CHILD_PERF);
  const [tradeBreakdownData, setTradeBreakdownData] = useState(FALLBACK_TRADE_BREAKDOWN);
  const [assetMixData, setAssetMixData] = useState(DEFAULT_ASSET_MIX);

  useEffect(() => {
    adminService.getAnalytics().then((data) => {
      setAnalytics(data);

      if (Array.isArray(data.equityCurve) && data.equityCurve.length > 0) {
        setEquityCurveData(data.equityCurve);
      }

      const totalKids =
        (data.profitableChildren || 0) +
        (data.losingChildren || 0) +
        (data.pausedChildren || 0);
      if (totalKids > 0) {
        setChildPerfData([
          { name: 'Profitable', value: data.profitableChildren, color: '#10d2a3' },
          { name: 'Loss-making', value: data.losingChildren, color: '#0c6b56' },
          { name: 'Paused', value: data.pausedChildren, color: '#28453f' },
        ]);
      }

      if ((data.buyOrders || 0) + (data.sellOrders || 0) > 0) {
        setTradeBreakdownData([
          { name: 'Buy Orders', value: data.buyOrders, color: '#13c6a0' },
          { name: 'Sell Orders', value: data.sellOrders, color: '#0c6b56' },
        ]);
      }

      if (data.equityPercentage != null && data.foPercentage != null) {
        setAssetMixData([
          { name: 'Equity', value: data.equityPercentage, color: '#10d2a3' },
          { name: 'F&O', value: data.foPercentage, color: '#13c6a0' },
        ]);
      }
    }).catch(() => {});
  }, []);

  const summaryCards = useMemo(() => [
    {
      title: "Today's P&L",
      value: analytics?.todayPnl ?? null,
      note: '+2.54% vs yesterday',
      icon: ArrowUpRight,
      accent: '#00d6a2',
    },
    {
      title: 'Total Platform Users',
      value: analytics ? analytics.totalUsers : null,
      note: analytics
        ? `${analytics.totalAdmins} admins, ${analytics.totalMasters} masters, ${analytics.totalChildren} children`
        : 'Loading...',
      icon: Users,
      accent: '#7c85ff',
      format: 'count',
    },
    {
      title: 'Active Children',
      value: analytics ? analytics.activeSubscriptions : null,
      note: 'Active subscriptions',
      icon: Users,
      accent: '#7c85ff',
      format: 'count',
    },
    {
      title: 'Open Positions',
      value: analytics?.openPositions ?? null,
      note: 'Live across all masters',
      icon: Activity,
      accent: '#00d6a2',
      format: 'count',
    },
    {
      title: 'Trades Today',
      value: analytics ? analytics.totalTrades : null,
      note: 'Copied trades total',
      icon: ListOrdered,
      accent: '#00d6a2',
      format: 'count',
    },
    {
      title: 'System Latency',
      value: analytics?.latency != null ? `${analytics.latency}ms` : null,
      note: 'Execution layer stable',
      icon: Radio,
      accent: '#00d6a2',
    },
  ], [analytics]);

  const totalChildren = useMemo(
    () => childPerfData.reduce((sum, item) => sum + item.value, 0),
    [childPerfData],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Admin Overview</p>
        </div>
        <div className="pt-1 text-right text-sm text-slate-400 dark:text-muted-foreground">Last updated: just now</div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} card={card} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <article className={`${panelClass} p-4 sm:p-5`}>
          <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-foreground">Equity Curve</h2>
            <div className="flex items-center gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/[0.04]">
              {['1D', '1W', '1M', '3M', 'ALL'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedRange === range
                      ? 'bg-brand-purple text-white'
                      : 'text-slate-400 hover:bg-black/5 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-white/[0.05] dark:hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10d2a3" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#10d2a3" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatCompactCurrency}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'currentColor', fontSize: 11 }}
                  width={62}
                />
                <YAxis yAxisId="right" hide orientation="right" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(7, 18, 12, 0.96)',
                    border: '1px solid rgba(0,200,150,0.14)',
                    borderRadius: '14px',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                  }}
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'equity' ? 'Equity' : 'Follower P&L',
                  ]}
                  labelStyle={{ color: '#9aa1b5' }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="equity"
                  stroke="#10d2a3"
                  strokeWidth={2.25}
                  fill="url(#equityFill)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="followers"
                  stroke="#0c6b56"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="relative z-10 text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-foreground">Child Performance</h2>
          <div className="relative z-10 mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={childPerfData}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={3}
                  cornerRadius={5}
                >
                  {childPerfData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <text x="50%" y="48%" textAnchor="middle" fill="currentColor" className="text-4xl font-semibold">
                  {totalChildren}
                </text>
                <text x="50%" y="59%" textAnchor="middle" fill="#94a3b8" className="text-sm">
                  Active Children
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="relative z-10 space-y-3">
            {childPerfData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <article className={`${panelClass} p-4 sm:p-5`}>
          <h2 className="relative z-10 text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-foreground">Trade Breakdown</h2>
          <div className="relative z-10 mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center">
            <div className="grid gap-4 md:grid-cols-2">
              {tradeBreakdownData.map((entry) => (
                <div
                  key={entry.name}
                  className="rounded-[20px] border border-slate-200/70 bg-white/60 p-5 backdrop-blur-xl dark:border-white/6 dark:bg-white/[0.035]"
                >
                  <div
                    className="h-2 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${entry.color}, rgba(16,210,163,0.18))` }}
                  />
                  <div className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-foreground">{entry.value}</div>
                  <div className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">{entry.name}</div>
                </div>
              ))}
            </div>

            <div className="mx-auto flex w-full max-w-[220px] flex-col items-center">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetMixData}
                      dataKey="value"
                      innerRadius={0}
                      outerRadius={70}
                      startAngle={180}
                      endAngle={0}
                      stroke="none"
                    >
                      {assetMixData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 dark:text-muted-foreground">
                {assetMixData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>
                      {entry.name} {entry.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Overview;
