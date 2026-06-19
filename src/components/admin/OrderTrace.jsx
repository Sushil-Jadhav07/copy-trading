import { useEffect, useState } from 'react';
import { Link2, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '@/components/shared/GlassCard';

const PLACEHOLDER = '—';

const summaryCards = (traceId) => [
  { label: 'Trace ID', value: traceId || PLACEHOLDER },
  { label: 'Child Copies', value: '0' },
  { label: 'Succeeded', value: '0' },
  { label: 'Failed / Skipped', value: '0' },
];

const masterOrderFields = (traceId) => [
  ['Trace ID', traceId || PLACEHOLDER],
  ['Master Order ID', PLACEHOLDER],
  ['Master User', PLACEHOLDER],
  ['Master Broker', PLACEHOLDER],
  ['Symbol', PLACEHOLDER],
  ['Side', PLACEHOLDER],
  ['Quantity', '0'],
  ['Order Type', PLACEHOLDER],
  ['Product', PLACEHOLDER],
  ['Exchange', PLACEHOLDER],
  ['Trigger Time', PLACEHOLDER],
  ['Placed Time', PLACEHOLDER],
  ['Average Price', PLACEHOLDER],
  ['Execution Status', PLACEHOLDER],
];

const childColumns = [
  'Child',
  'Child User ID',
  'Broker',
  'Copy Status',
  'Skip / Failure Reason',
  'Child Order ID',
  'Requested Qty',
  'Executed Qty',
  'Average Price',
  'Latency (ms)',
  'Placed Time',
];

const OrderTrace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [inputValue, setInputValue] = useState(initialId);
  const [traceId, setTraceId] = useState(initialId);

  useEffect(() => {
    const nextId = searchParams.get('id') || '';
    setInputValue(nextId);
    setTraceId(nextId);
  }, [searchParams]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextId = inputValue.trim();
    setTraceId(nextId);
    setSearchParams(nextId ? { id: nextId } : {});
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Order Trace
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          End-to-end traceability for a master order and every copied child execution.
        </p>
      </section>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
        Trace lookup is not yet connected to the backend. Search stays available so admins can deep-link
        into this screen, but live results require <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">GET /api/v1/admin/trace/{'{id}'}</code>.
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search by trace ID, copy group ID, or order reference"
            className="w-full rounded-xl border border-border bg-black/5 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
        >
          <Search className="h-4 w-4" />
          Search Trace
        </button>
      </form>

      {traceId ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
          Trace lookup not yet connected to backend.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-black/5 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          Enter a trace ID to inspect master and child execution details.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards(traceId).map((card) => (
          <GlassCard key={card.label}>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{card.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassCard>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Master Order</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {masterOrderFields(traceId).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 break-all text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-base font-semibold">Trace Summary</h2>
          <div className="mt-5 space-y-3">
            {[
              ['Lookup Status', traceId ? 'Unavailable' : PLACEHOLDER],
              ['Average Child Latency', PLACEHOLDER],
              ['Fastest Child Latency', PLACEHOLDER],
              ['Slowest Child Latency', PLACEHOLDER],
              ['Failure Rate', PLACEHOLDER],
              ['Last Backend Sync', PLACEHOLDER],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-black/5 px-3 py-3 text-sm dark:bg-white/5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard noPadding>
        <div className="border-b border-border/40 px-4 py-3">
          <h2 className="text-base font-semibold">Child Copy Breakdown</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every child order mapped back to the selected master trace.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                {childColumns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={childColumns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {traceId
                    ? 'Trace lookup not yet connected to backend'
                    : 'No data yet — awaiting backend integration'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default OrderTrace;
