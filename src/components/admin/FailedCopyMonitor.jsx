import { useEffect, useState } from 'react';
import { AlertCircle, Search, LoaderCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { adminService } from '@/lib/admin';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import DownloadButton from '@/components/shared/DownloadButton';

const STATUS_OPTIONS = [
  { value: 'SKIPPED', label: 'Skipped' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'TIMEOUT', label: 'Timeout' },
];

const BROKER_OPTIONS = [
  { value: 'ZERODHA', label: 'Zerodha' },
  { value: 'GROWW', label: 'Groww' },
  { value: 'UPSTOX', label: 'Upstox' },
  { value: 'DHAN', label: 'Dhan' },
  { value: 'ANGELONE', label: 'Angel One' },
  { value: 'FYERS', label: 'Fyers' },
];

const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const STATUS_STYLES = {
  SKIPPED: 'border-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  FAILED: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  REJECTED: 'border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  TIMEOUT: 'border-slate-500/15 bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

const LIMIT = 12;

const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getTimeRange = (key) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === 'today') return { from: todayStart.toISOString(), to: now.toISOString() };
  if (key === 'yesterday') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 1);
    return { from: from.toISOString(), to: todayStart.toISOString() };
  }
  if (key === 'week') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    return { from: from.toISOString(), to: now.toISOString() };
  }
  if (key === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  return {};
};

const FailedCopyMonitor = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [page, setPage] = useState(1);

  const [copies, setCopies] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, skipped: 0, rejected: 0, timeout: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [search, statusFilter, brokerFilter, timeFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const range = getTimeRange(timeFilter);
    adminService.getFailedCopies({
      page,
      limit: LIMIT,
      search: search || undefined,
      status: statusFilter || undefined,
      broker: brokerFilter || undefined,
      dateFrom: range.from || undefined,
      dateTo: range.to || undefined,
    })
      .then((res) => {
        if (!active) return;
        setCopies(res.copies);
        setTotal(res.total);
        setStats(res.stats);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, search, statusFilter, brokerFilter, timeFilter]);

  const statCards = [
    { label: 'Total Failed/Skipped', value: stats.total, color: 'text-rose-400' },
    { label: 'Skipped', value: stats.skipped, color: 'text-amber-400' },
    { label: 'Rejected', value: stats.rejected, color: 'text-orange-400' },
    { label: 'Timeout', value: stats.timeout, color: 'text-slate-400' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  const handleExport = () => {
    try {
      downloadExcelSheet({
        rows: copies.map((c) => ({
          Time: fmtTime(c.timestamp),
          Status: c.status,
          Master: c.masterName,
          Child: c.childName,
          Broker: c.broker,
          Symbol: c.symbol,
          'Latency (ms)': c.latencyMs > 0 ? c.latencyMs : '',
          Reason: c.reason,
        })),
        sheetName: 'Failed Copies',
        fileName: buildExportFileName('Failed Copy Monitor'),
      });
    } catch {}
  };

  const pillCls = (active) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
      active
        ? 'bg-brand-purple text-white'
        : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
    }`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Failed Copy Monitor
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            Every copy that was skipped, rejected, or errored — with a human-readable reason and latency.
          </p>
        </div>
        <DownloadButton onClick={handleExport} disabled={copies.length === 0} label="Export Excel" />
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TIME_FILTERS.map((t) => (
            <button key={t.key} onClick={() => setTimeFilter(t.key)} className={pillCls(timeFilter === t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search master, child, symbol…"
              className="w-full rounded-xl border border-border bg-black/5 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
            />
          </div>
          <DivSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={STATUS_OPTIONS}
            triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
          />
          <DivSelect
            value={brokerFilter}
            onChange={setBrokerFilter}
            placeholder="All Brokers"
            options={BROKER_OPTIONS}
            triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
          />
        </div>
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed">
            <thead>
              <tr className="border-b border-border/50 bg-black/[0.03] dark:bg-white/[0.03]">
                <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
                <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Master</th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Child</th>
                <th className="w-[10%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Broker</th>
                <th className="w-[10%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symbol</th>
                <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latency</th>
                <th className="w-[22%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading failed copies…
                    </div>
                  </td>
                </tr>
              ) : copies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">No failed or skipped copies match these filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                copies.map((c) => (
                  <tr key={`${c.id}-${c.broker}`} className="border-b border-border/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtTime(c.timestamp)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[c.status] || STATUS_STYLES.FAILED}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-medium truncate">{c.masterName}</td>
                    <td className="px-3 py-3 text-sm truncate">{c.childName}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{c.broker}</td>
                    <td className="px-3 py-3 text-sm font-semibold truncate">{c.symbol}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {c.latencyMs > 0 ? (
                        <span className={c.latencyMs >= 5000 ? 'text-rose-500 font-semibold' : ''}>
                          {c.latencyMs.toLocaleString('en-IN')}ms
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground truncate">{c.reason.length > 30 ? `${c.reason.slice(0, 30)}…` : c.reason}</span>
                        {c.reason && c.reason !== 'N/A' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm text-xs leading-relaxed break-words whitespace-normal">
                                {c.reason}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Showing {showingFrom}–{showingTo} of {total}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default FailedCopyMonitor;
