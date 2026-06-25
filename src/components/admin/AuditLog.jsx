import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Search } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import DownloadButton from '@/components/shared/DownloadButton';
import { useToast } from '@/components/shared/Toast';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import { adminService } from '@/lib/admin';

const ACTION_OPTIONS = [
  { value: 'IMPERSONATE_USER', label: 'Impersonate User' },
  { value: 'DELETE_USER', label: 'Delete User' },
  { value: 'CREATE_MASTER', label: 'Create Master' },
  { value: 'USER_ACTIVATE', label: 'User Activate' },
  { value: 'USER_DEACTIVATE', label: 'User Deactivate' },
  { value: 'USER_DELETE', label: 'User Delete' },
  { value: 'USER_EDIT', label: 'User Edit' },
  { value: 'MASTER_PAUSE', label: 'Master Pause' },
  { value: 'MASTER_RESUME', label: 'Master Resume' },
  { value: 'KILL_SWITCH', label: 'Kill Switch' },
  { value: 'FORCE_SQUARE_OFF', label: 'Force Square-Off' },
  { value: 'UPDATE_RISK_SETTINGS', label: 'Update Risk Settings' },
];

const ENTITY_OPTIONS = [
  { value: 'USER', label: 'User' },
  { value: 'MASTER', label: 'Master' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TRADE', label: 'Trade' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'CHILD', label: 'Child' },
];

const ACTION_COLORS = {
  IMPERSONATE_USER:     { dot: 'bg-purple-400',  pill: 'bg-purple-500/10 text-purple-400 ring-purple-500/20' },
  DELETE_USER:          { dot: 'bg-rose-400',    pill: 'bg-rose-500/10 text-rose-400 ring-rose-500/20' },
  CREATE_MASTER:        { dot: 'bg-emerald-400', pill: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  USER_ACTIVATE:        { dot: 'bg-emerald-400', pill: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  USER_DEACTIVATE:      { dot: 'bg-rose-400',    pill: 'bg-rose-500/10 text-rose-400 ring-rose-500/20' },
  USER_DELETE:          { dot: 'bg-rose-400',    pill: 'bg-rose-500/10 text-rose-400 ring-rose-500/20' },
  USER_EDIT:            { dot: 'bg-sky-400',     pill: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
  MASTER_PAUSE:         { dot: 'bg-amber-400',   pill: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
  MASTER_RESUME:        { dot: 'bg-emerald-400', pill: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  KILL_SWITCH:          { dot: 'bg-rose-400',    pill: 'bg-rose-500/10 text-rose-400 ring-rose-500/20' },
  FORCE_SQUARE_OFF:     { dot: 'bg-orange-400',  pill: 'bg-orange-500/10 text-orange-400 ring-orange-500/20' },
  UPDATE_RISK_SETTINGS: { dot: 'bg-cyan-400',    pill: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20' },
};

const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const LIMIT = 12;

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
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: now.toISOString() };
  }
  return {};
};

const fmtTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const titleCase = (value) =>
  String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const tryParseJsonString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || !['{', '['].includes(trimmed[0])) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
};

const normalizeDetailObject = (value) => {
  const parsed = tryParseJsonString(value);
  if (Array.isArray(parsed)) return parsed.map(normalizeDetailObject);
  if (parsed && typeof parsed === 'object')
    return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, normalizeDetailObject(v)]));
  return parsed;
};

const stringifyDetail = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (Array.isArray(value)) return value.map(stringifyDetail).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getDetailSource = (log) => {
  if (log.parameters && Object.keys(log.parameters).length > 0) return log.parameters;
  if (log.after && Object.keys(log.after).length > 0) return log.after;
  if (log.before && Object.keys(log.before).length > 0) return log.before;
  return {};
};


const AuditRow = ({ log }) => {
  const entityLabel = log.entityName || log.entityId || '—';
  const entityId = log.entityId || null;
  const adminEmail = log.raw?.userEmail || log.raw?.adminEmail || '';
  const colors = ACTION_COLORS[log.action] || { dot: 'bg-brand-purple', pill: 'bg-brand-purple/10 text-brand-purple ring-brand-purple/20' };

  return (
    <>
      <tr className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]">
        {/* Time */}
        <td className="whitespace-nowrap px-5 py-4">
          <p className="text-sm font-medium text-foreground">{fmtTime(log.timestamp)}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/40">Audit</p>
        </td>

        {/* Admin */}
        <td className="px-5 py-4">
          <p className="text-sm font-semibold text-foreground truncate max-w-[160px]">{log.adminName || '—'}</p>
          {adminEmail && (
            <p className="mt-0.5 text-[11px] text-muted-foreground/60 truncate max-w-[160px]">{adminEmail}</p>
          )}
        </td>

        {/* Action */}
        <td className="px-5 py-4">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${colors.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
            {titleCase(log.action)}
          </span>
        </td>

        {/* Entity */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex flex-shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {titleCase(log.entityType) || '—'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground max-w-[160px]" title={entityLabel}>
                {entityLabel}
              </p>
              {entityId && entityId !== entityLabel && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/50 max-w-[160px]" title={entityId}>
                  {entityId}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Entity ID */}
        <td className="px-5 py-4">
          {entityId ? (
            <p className="font-mono text-[11px] text-muted-foreground/70 max-w-[160px] truncate" title={entityId}>
              {entityId}
            </p>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </td>

      </tr>
    </>
  );
};

const AuditLog = () => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, timeFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const range = getTimeRange(timeFilter);

    adminService.getAuditLog({
      page,
      limit: LIMIT,
      search: search || undefined,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
      dateFrom: range.from || undefined,
      dateTo: range.to || undefined,
    })
      .then((res) => {
        if (!active) return;
        setLogs(res.logs || []);
        setTotal(res.total || 0);
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [page, search, actionFilter, entityFilter, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  const handleExport = () => {
    try {
      const rows = logs.map((log) => ({
        Time: fmtTime(log.timestamp),
        Admin: log.adminName,
        Action: titleCase(log.action),
        'Entity Type': titleCase(log.entityType),
        'Entity ID': log.entityId,
        Details: JSON.stringify(normalizeDetailObject(getDetailSource(log)) || {}, null, 2),
        Reason: log.reason,
      }));
      downloadExcelSheet({ rows, sheetName: 'Audit Log', fileName: buildExportFileName('Admin Audit Log') });
      addToast('Audit log exported', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to export audit log', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Admin Audit Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only record of every admin action — who, what, when, and what changed.
          </p>
        </div>
        <DownloadButton onClick={handleExport} disabled={logs.length === 0} label="Export Excel" />
      </section>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TIME_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeFilter(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                timeFilter === t.key
                  ? 'bg-brand-purple text-white shadow-sm shadow-brand-purple/20'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, entity ID, reason…"
              className="w-full rounded-xl border border-border bg-black/5 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5 dark:border-white/10"
            />
          </div>
          <DivSelect
            value={actionFilter}
            onChange={setActionFilter}
            placeholder="All Actions"
            options={ACTION_OPTIONS}
            triggerClassName="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
          />
          <DivSelect
            value={entityFilter}
            onChange={setEntityFilter}
            placeholder="All Entities"
            options={ENTITY_OPTIONS}
            triggerClassName="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {['Time', 'Admin', 'Action', 'Entity', 'Entity ID'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6">
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/[0.04]" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <ClipboardList className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No audit entries</p>
                        <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting your filters or time range</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => <AuditRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5">
            <span className="text-xs text-muted-foreground/60">
              {showingFrom}–{showingTo} of {total} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-muted-foreground/60">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default AuditLog;
