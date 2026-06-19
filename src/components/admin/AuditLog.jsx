import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';

// ADM-4: Admin Audit Log
// Endpoint needed: GET /api/v1/admin/audit-log
//   params: page, limit, adminId, action, entityType, dateFrom, dateTo
//   response: { logs: [{ id, adminName, action, entityType, entityId, before, after, timestamp, reason }], total }
// Until that endpoint exists the table shows an empty state.

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

const AuditLog = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Admin Audit Log
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Read-only record of every admin action that changes system state — who, what, when, before and after.
        </p>
      </section>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
        No data yet — awaiting{' '}
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
          GET /api/v1/admin/audit-log
        </code>{' '}
        backend integration.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin or entity ID…"
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
              <tr>
                <td colSpan={8} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No data yet — awaiting backend integration</p>
                    <p className="max-w-sm text-xs text-muted-foreground/60">
                      Audit entries will appear here once{' '}
                      <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/5">
                        GET /api/v1/admin/audit-log
                      </code>{' '}
                      is available.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default AuditLog;
