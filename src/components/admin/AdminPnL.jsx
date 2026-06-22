import { useCallback, useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import RefreshButton from '@/components/shared/RefreshButton';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { adminService } from '@/lib/admin';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { TrendingUp, Users, Activity, CreditCard, BarChart2, Trophy } from 'lucide-react';

const rowClass = 'border-b border-border/30';
const emptyCellClass = 'px-4 py-4 text-sm text-muted-foreground';

const AdminPnL = () => {
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [pnlData, setPnlData] = useState({ perMaster: [], perChild: [], topGainers: [], topLosers: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    try {
      const [analyticsData, platformPnl] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getPlatformPnl({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ]);
      setAnalytics(analyticsData);
      setPnlData(platformPnl);
      setLoadError('');
    } catch (error) {
      const message = error.message || 'Unable to load platform P&L';
      setLoadError(message);
      setAnalytics({
        totalTrades: 0,
        activeSubscriptions: 0,
        activeMasters: 0,
        totalChildren: 0,
        revenueMtd: 0,
        totalUsers: 0,
        totalAdmins: 0,
      });
      setPnlData({ perMaster: [], perChild: [], topGainers: [], topLosers: [] });
      addToast(message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const stats = analytics
    ? [
        {
          label: 'Total Trades',
          value: formatNumber(analytics.totalTrades ?? analytics.volumeToday ?? 0),
          icon: Activity,
          color: 'text-brand-purple',
          bg: 'bg-brand-purple/10',
        },
        {
          label: 'Active Subscriptions',
          value: formatNumber(analytics.activeSubscriptions ?? 0),
          icon: CreditCard,
          color: 'text-brand-blue',
          bg: 'bg-brand-blue/10',
        },
        {
          label: 'Active Masters',
          value: formatNumber(analytics.activeMasters ?? analytics.totalMasters ?? 0),
          icon: TrendingUp,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
        },
        {
          label: 'Total Children',
          value: formatNumber(analytics.totalChildren ?? 0),
          icon: Users,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
        },
      ]
    : [];

  const renderRows = (rows, columns, rowRenderer, colSpan) => (
    rows.length === 0 ? (
      <tr>
        <td colSpan={colSpan} className={emptyCellClass}>No data returned for this range.</td>
      </tr>
    ) : (
      rows.map(rowRenderer)
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Platform P&L</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide analytics and detailed master/child P&L breakdowns.
          </p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}><SkeletonLoader type="stat" /></GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!loading && analytics && (
        <GlassCard title="Revenue Overview">
          {loadError ? (
            <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">{loadError}</p>
          ) : null}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Revenue MTD</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(analytics.revenueMtd ?? 0)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Total Users</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalUsers ?? 0)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Total Admins</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalAdmins ?? 0)}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Date range:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none dark:bg-white/5"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none dark:bg-white/5"
        />
        <button
          onClick={handleRefresh}
          className="rounded-xl bg-brand-purple px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </div>

      <GlassCard noPadding>
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Per-Master P&L Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                {['Master', 'Total Trades', 'Volume', 'Realised P&L', 'Children', 'Subscription Revenue'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderRows(
                pnlData.perMaster,
                ['Master'],
                (row) => (
                  <tr key={row.id} className={rowClass}>
                    <td className="px-4 py-3 text-sm font-medium">{row.master}</td>
                    <td className={emptyCellClass}>{formatNumber(row.totalTrades)}</td>
                    <td className={emptyCellClass}>{formatCurrency(row.volume)}</td>
                    <td className={emptyCellClass}>{formatCurrency(row.realisedPnl)}</td>
                    <td className={emptyCellClass}>{formatNumber(row.children)}</td>
                    <td className={emptyCellClass}>{formatCurrency(row.subscriptionRevenue)}</td>
                  </tr>
                ),
                6,
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard noPadding>
        <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Per-Child P&L Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                {['Child', 'Master', 'Copies Executed', 'Copies Failed', 'Realised P&L', 'Avg Slippage (%)'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderRows(
                pnlData.perChild,
                ['Child'],
                (row) => (
                  <tr key={row.id} className={rowClass}>
                    <td className="px-4 py-3 text-sm font-medium">{row.child}</td>
                    <td className={emptyCellClass}>{row.master}</td>
                    <td className={emptyCellClass}>{formatNumber(row.copiesExecuted)}</td>
                    <td className={emptyCellClass}>{formatNumber(row.copiesFailed)}</td>
                    <td className={emptyCellClass}>{formatCurrency(row.realisedPnl)}</td>
                    <td className={emptyCellClass}>{row.avgSlippagePct}%</td>
                  </tr>
                ),
                6,
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: 'Top Gainers', color: 'text-emerald-400', rows: pnlData.topGainers },
          { label: 'Top Losers', color: 'text-rose-400', rows: pnlData.topLosers },
        ].map(({ label, color, rows }) => (
          <GlassCard key={label} noPadding>
            <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
              <Trophy className={`h-4 w-4 ${color}`} />
              <h2 className="text-sm font-semibold">{label}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                    {['#', 'Master', 'P&L'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={emptyCellClass}>No rows returned.</td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id} className={rowClass}>
                        <td className={emptyCellClass}>{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.master}</td>
                        <td className={emptyCellClass}>{formatCurrency(row.pnl)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default AdminPnL;
