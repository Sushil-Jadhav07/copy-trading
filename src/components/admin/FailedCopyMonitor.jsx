import { useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';

// ADM-5: Failed Copy Monitor
// Endpoint needed: GET /api/v1/admin/failed-copies
//   params: status, masterId, childId, broker, dateFrom, dateTo, page, limit
//   response: { copies: [{ id, masterName, childName, broker, symbol, status, reason, timestamp, latencyMs }], total }
// Until that endpoint exists the table shows an empty state.

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

const STAT_CARDS = [
  { label: 'Total Failed/Skipped', value: 0, color: 'text-rose-400' },
  { label: 'Skipped', value: 0, color: 'text-amber-400' },
  { label: 'Rejected', value: 0, color: 'text-orange-400' },
  { label: 'Timeout', value: 0, color: 'text-slate-400' },
];

const FailedCopyMonitor = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
        No data yet — awaiting{' '}
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
          GET /api/v1/admin/failed-copies
        </code>{' '}
        backend integration.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
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
                {['Time', 'Status', 'Master', 'Child', 'Broker', 'Latency (ms)', 'Reason'].map((h) => (
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
                <td colSpan={7} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No data yet — awaiting backend integration</p>
                    <p className="max-w-sm text-xs text-muted-foreground/60">
                      Failed and skipped copies will appear here once{' '}
                      <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/5">
                        GET /api/v1/admin/failed-copies
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

export default FailedCopyMonitor;
