import { useCallback, useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import RefreshButton from '@/components/shared/RefreshButton';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { adminService } from '@/lib/admin';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { TrendingUp, Users, Activity, CreditCard, BarChart2, Trophy } from 'lucide-react';

// Breakdown sections (per-master, per-child, top gainers/losers) await:
//   GET /api/v1/admin/pnl?dateFrom=&dateTo=
// Until that endpoint exists all breakdown tables show empty states.

// FIX: Was calling pnlService.getAllPnl() → POST /api/v1/admin/pnl/all — not in spec.
// Now uses adminService.getAnalytics() (spec 6.9: GET /admin/analytics) which returns
// totalTrades, activeSubscriptions, totalMasters, totalChildren, revenueMtd.

const placeholderCellClass = 'px-4 py-3 text-sm text-muted-foreground';
const placeholderRowClass = 'border-b border-border/30';

const AdminPnL = () => {
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getAnalytics();
      setAnalytics(data);
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
      addToast(message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Platform P&L</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide analytics from admin overview. Detailed P&L breakdowns are available per-master in Master Analytics.
          </p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}><SkeletonLoader type="stat" /></GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Revenue row */}
      {!loading && analytics && (
        <GlassCard title="Revenue Overview">
          {loadError ? (
            <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
              Live analytics are temporarily unavailable. Showing fallback values.
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Revenue MTD</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(analytics.revenueMtd ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Users</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalUsers ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Admins</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalAdmins ?? 0)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Data from <code className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /api/v1/admin/analytics</code>.
            For granular per-master P&L, view individual master profiles.
          </p>
        </GlassCard>
      )}

      {/* ── Breakdown sections — await GET /api/v1/admin/pnl ── */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-600 dark:text-amber-400">
        Per-master, per-child, and date-filtered P&L tables below are disabled until{' '}
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/5">GET /api/v1/admin/pnl</code>{' '}
        is implemented.
      </div>

      {/* Date-range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Date range:</span>
        <input
          type="date"
          disabled
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm opacity-50 cursor-not-allowed focus:outline-none dark:bg-white/5"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          disabled
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm opacity-50 cursor-not-allowed focus:outline-none dark:bg-white/5"
        />
        <button
          disabled
          title="Not yet connected to backend"
          className="rounded-xl bg-brand-purple/20 px-4 py-2 text-sm font-medium text-brand-purple opacity-50 cursor-not-allowed"
        >
          Apply
        </button>
        <span className="text-xs text-muted-foreground">No data — endpoint not yet available</span>
      </div>

      {/* Per-master breakdown */}
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
              <tr className={placeholderRowClass}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <td key={index} className={placeholderCellClass}>—</td>
                ))}
              </tr>
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">
                  No data yet — awaiting <code className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /api/v1/admin/pnl</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Per-child breakdown */}
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
              <tr className={placeholderRowClass}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <td key={index} className={placeholderCellClass}>—</td>
                ))}
              </tr>
              <tr>
                <td colSpan={6} className="px-4 py-4 text-sm text-muted-foreground">
                  No data yet — awaiting <code className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /api/v1/admin/pnl</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Top gainers / losers */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { label: 'Top Gainers', color: 'text-emerald-400' },
          { label: 'Top Losers', color: 'text-rose-400' },
        ].map(({ label, color }) => (
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
                  <tr className={placeholderRowClass}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <td key={index} className={placeholderCellClass}>—</td>
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm text-muted-foreground">
                      No data yet — awaiting <code className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /api/v1/admin/pnl</code>
                    </td>
                  </tr>
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
