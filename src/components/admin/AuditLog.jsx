import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import DownloadButton from '@/components/shared/DownloadButton';
import { useToast } from '@/components/shared/Toast';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import { getAuditLog } from '@/lib/adminMock';

// ADM-4: Admin Audit Log (read-only)
// DATA: @/lib/adminMock → getAuditLog(params). Backend swap: replace that function's
// body with GET /api/v1/admin/audit-log. Nothing here changes.

const ACTION_OPTIONS = [
  { value: 'USER_ACTIVATE', label: 'User Activate' },
  { value: 'USER_DEACTIVATE', label: 'User Deactivate' },
  { value: 'USER_DELETE', label: 'User Delete' },
  { value: 'USER_EDIT', label: 'User Edit' },
  { value: 'MASTER_PAUSE', label: 'Master Pause' },
  { value: 'MASTER_RESUME', label: 'Master Resume' },
  { value: 'KILL_SWITCH', label: 'Kill Switch' },
  { value: 'FORCE_SQUARE_OFF', label: 'Force Square-Off' },
];

const ENTITY_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'MASTER', label: 'Master' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRADE', label: 'Trade' },
  { value: 'SYSTEM', label: 'System' },
];

const ACTION_STYLES = {
  USER_ACTIVATE: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  USER_DEACTIVATE: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  USER_DELETE: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  USER_EDIT: 'border-sky-500/15 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  MASTER_PAUSE: 'border-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  MASTER_RESUME: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  KILL_SWITCH: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  FORCE_SQUARE_OFF: 'border-orange-500/15 bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

const LIMIT = 12;

const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const KeyVals = ({ obj, tone }) => (
  <div className="space-y-0.5">
    {Object.entries(obj || {}).map(([k, v]) => (
      <div key={k} className={`font-mono text-[11px] ${tone}`}>
        <span className="text-muted-foreground">{k}:</span> {String(v)}
      </div>
    ))}
  </div>
);

const AuditLog = () => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAuditLog({
      page,
      limit: LIMIT,
      search: search || undefined,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        if (!active) return;
        setLogs(res.logs);
        setTotal(res.total);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, search, actionFilter, entityFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  // ADM-11: exports the currently loaded page of results with the active filters applied.
  // NOTE for backend integration: once GET /api/v1/admin/audit-log is live, consider adding
  // a `limit=all` (or similarly unbounded) export mode server-side so this can export the
  // full filtered result set rather than just the visible page.
  const handleExport = () => {
    try {
      const rows = logs.map((log) => ({
        Time: fmtTime(log.timestamp),
        Admin: log.adminName,
        Action: log.action,
        'Entity Type': log.entityType,
        'Entity ID': log.entityId,
        Before: JSON.stringify(log.before || {}),
        After: JSON.stringify(log.after || {}),
        Reason: log.reason,
      }));
      downloadExcelSheet({
        rows,
        sheetName: 'Audit Log',
        fileName: buildExportFileName('Admin Audit Log'),
      });
      addToast('Audit log exported', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to export audit log', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Admin Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            Read-only record of every admin action that changes system state — who, what, when, before and after.
          </p>
        </div>
        <DownloadButton onClick={handleExport} disabled={logs.length === 0} label="Export Page" />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin, entity ID, reason…"
            className="w-full rounded-xl border border-border bg-black/5 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
          />
        </div>
        <DivSelect
          value={actionFilter}
          onChange={setActionFilter}
          placeholder="All Actions"
          options={ACTION_OPTIONS}
          triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
        />
        <DivSelect
          value={entityFilter}
          onChange={setEntityFilter}
          placeholder="All Entities"
          options={ENTITY_OPTIONS}
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
                {['Time', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Before', 'After', 'Reason'].map((h) => (
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
                      Loading audit entries…
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground">No audit entries match these filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/30 align-top hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{fmtTime(log.timestamp)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">{log.adminName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ACTION_STYLES[log.action] || 'border-slate-500/15 bg-slate-500/10 text-slate-500'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{log.entityType}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{log.entityId}</td>
                    <td className="px-4 py-3"><KeyVals obj={log.before} tone="text-rose-500/80" /></td>
                    <td className="px-4 py-3"><KeyVals obj={log.after} tone="text-emerald-600/90 dark:text-emerald-400/90" /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[240px]">{log.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {total}
            </span>
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

export default AuditLog;
