import { useEffect, useState } from 'react';
import { AlertCircle, Search, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { adminService } from '@/lib/admin';

// ADM-5: Failed Copy Monitor
// DATA: @/lib/adminMock → getFailedCopies(params). Backend swap: replace that
// function's body with GET /api/v1/admin/failed-copies. Nothing here changes.

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

const FailedCopyMonitor = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [copies, setCopies] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, skipped: 0, rejected: 0, timeout: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [search, statusFilter, brokerFilter, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminService.getFailedCopies({
      page,
      limit: LIMIT,
      search: search || undefined,
      status: statusFilter || undefined,
      broker: brokerFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        if (!active) return;
        setCopies(res.copies);
        setTotal(res.total);
        setStats(res.stats);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, search, statusFilter, brokerFilter, dateFrom, dateTo]);

  const statCards = [
    { label: 'Total Failed/Skipped', value: stats.total, color: 'text-rose-400' },
    { label: 'Skipped', value: stats.skipped, color: 'text-amber-400' },
    { label: 'Rejected', value: stats.rejected, color: 'text-orange-400' },
    { label: 'Timeout', value: stats.timeout, color: 'text-slate-400' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Failed Copy Monitor
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Every copy that was skipped, rejected, or errored — with a human-readable reason and latency.
        </p>
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
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none dark:bg-white/5"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none dark:bg-white/5"
        />
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-black/[0.03] dark:bg-white/[0.03]">
                {['Time', 'Status', 'Master', 'Child', 'Broker', 'Symbol', 'Latency (ms)', 'Reason'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
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
                  <tr key={c.id} className="border-b border-border/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{fmtTime(c.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{c.masterName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{c.childName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{c.broker}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">{c.symbol}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${c.latencyMs >= 5000 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {c.latencyMs.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[260px]">{c.reason}</td>
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
