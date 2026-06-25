import { useCallback, useEffect, useState, useMemo } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import RefreshButton from '@/components/shared/RefreshButton';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { adminService } from '@/lib/admin';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { TrendingUp, Users, Activity, CreditCard, BarChart2, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

const cellCls = 'px-4 py-3 text-sm text-muted-foreground';

const AdminPnL = () => {
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [pnlData, setPnlData] = useState({ perMaster: [], perChild: [], topGainers: [], topLosers: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [masterPage, setMasterPage] = useState(1);
  const [childPage, setChildPage] = useState(1);
  const pageSize = 5;

  const load = useCallback(async () => {
    try {
      const [analyticsData, platformPnl] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getPlatformPnl(),
      ]);
      setAnalytics(analyticsData);
      setPnlData(platformPnl);
      setLoadError('');
      setMasterPage(1);
      setChildPage(1);
    } catch (error) {
      const message = error.message || 'Unable to load platform P&L';
      setLoadError(message);
      setAnalytics({ totalTrades: 0, activeSubscriptions: 0, activeMasters: 0, totalChildren: 0, totalUsers: 0, totalAdmins: 0 });
      setPnlData({ perMaster: [], perChild: [], topGainers: [], topLosers: [] });
      addToast(message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => { setRefreshing(true); await load(); };

  const stats = analytics ? [
    { label: 'Total Trades', value: formatNumber(analytics.totalTrades ?? analytics.volumeToday ?? 0), icon: Activity, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
    { label: 'Active Subscriptions', value: formatNumber(analytics.activeSubscriptions ?? 0), icon: CreditCard, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
    { label: 'Active Masters', value: formatNumber(analytics.activeMasters ?? analytics.totalMasters ?? 0), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Total Children', value: formatNumber(analytics.totalChildren ?? 0), icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ] : [];

  const EmptyRow = ({ cols }) => (
    <tr><td colSpan={cols} className={cellCls}>No data available.</td></tr>
  );

  const paginatedMasters = useMemo(() => {
    const start = (masterPage - 1) * pageSize;
    return pnlData.perMaster.slice(start, start + pageSize);
  }, [pnlData.perMaster, masterPage]);

  const totalMasterPages = Math.ceil(pnlData.perMaster.length / pageSize);

  const paginatedChildren = useMemo(() => {
    const start = (childPage - 1) * pageSize;
    return pnlData.perChild.slice(start, start + pageSize);
  }, [pnlData.perChild, childPage]);

  const totalChildPages = Math.ceil(pnlData.perChild.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Platform P&L</h1>
          <p className="text-sm text-muted-foreground">Platform-wide analytics and detailed master/child P&L breakdowns.</p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <GlassCard key={i}><SkeletonLoader type="stat" /></GlassCard>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <GlassCard key={s.label}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Top Gainers & Losers side by side (MOVED ABOVE) */}
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
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <EmptyRow cols={3} /> : rows.map((row, i) => (
                    <tr key={row.id} className="border-b border-border/30">
                      <td className={cellCls}>{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">{row.master}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${row.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(row.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Per-Master & Per-Child side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard noPadding>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Per-Master P&L</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                  {['Master', 'Trades', 'P&L', 'Children'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedMasters.length === 0 ? <EmptyRow cols={4} /> : paginatedMasters.map((row) => (
                  <tr key={row.id} className="border-b border-border/30">
                    <td className="px-4 py-3 text-sm font-medium truncate max-w-[140px]">{row.master}</td>
                    <td className={cellCls}>{formatNumber(row.totalTrades)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${row.realisedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(row.realisedPnl)}
                    </td>
                    <td className={cellCls}>{formatNumber(row.children)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalMasterPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {masterPage} of {totalMasterPages}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMasterPage(p => Math.max(1, p - 1))}
                  disabled={masterPage === 1}
                  className="rounded p-1 hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setMasterPage(p => Math.min(totalMasterPages, p + 1))}
                  disabled={masterPage === totalMasterPages}
                  className="rounded p-1 hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard noPadding>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Per-Child P&L</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                  {['Child', 'Master', 'Executed', 'P&L'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedChildren.length === 0 ? <EmptyRow cols={4} /> : paginatedChildren.map((row) => (
                  <tr key={row.id} className="border-b border-border/30">
                    <td className="px-4 py-3 text-sm font-medium truncate max-w-[140px]">{row.child}</td>
                    <td className={`${cellCls} truncate max-w-[100px]`}>{row.master}</td>
                    <td className={cellCls}>{formatNumber(row.copiesExecuted)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${row.realisedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(row.realisedPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalChildPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Page {childPage} of {totalChildPages}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setChildPage(p => Math.max(1, p - 1))}
                  disabled={childPage === 1}
                  className="rounded p-1 hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setChildPage(p => Math.min(totalChildPages, p + 1))}
                  disabled={childPage === totalChildPages}
                  className="rounded p-1 hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminPnL;
