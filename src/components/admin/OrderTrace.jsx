import { useEffect, useMemo, useState } from 'react';
import { Link2, LoaderCircle, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '@/components/shared/GlassCard';
import { adminService } from '@/lib/admin';
import { useToast } from '@/components/shared/Toast';

const PLACEHOLDER = '—';

const childColumns = [
  'Child',
  'Broker',
  'Scale Factor',
  'Qty Copied',
  'Order ID',
  'Status',
  'Executed At',
  'Price',
  'Latency (ms)',
  'Slippage (%)',
  'Reason',
];

const fmtDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const OrderTrace = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [inputValue, setInputValue] = useState(initialId);
  const [traceId, setTraceId] = useState(initialId);
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const nextId = searchParams.get('id') || '';
    setInputValue(nextId);
    setTraceId(nextId);
  }, [searchParams]);

  useEffect(() => {
    if (!traceId) {
      setTrace(null);
      setLoadError('');
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError('');
    adminService.getOrderTrace(traceId)
      .then((data) => {
        if (!active) return;
        setTrace(data);
      })
      .catch((error) => {
        if (!active) return;
        setTrace(null);
        setLoadError(error.message || 'Unable to load trace');
        addToast(error.message || 'Unable to load trace', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [traceId, addToast]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextId = inputValue.trim();
    setTraceId(nextId);
    setSearchParams(nextId ? { id: nextId } : {});
  };

  const summaryCards = useMemo(() => [
    { label: 'Trace ID', value: trace?.traceId || traceId || PLACEHOLDER },
    { label: 'Child Copies', value: String(trace?.summary?.childCopies ?? 0) },
    { label: 'Succeeded', value: String(trace?.summary?.succeeded ?? 0) },
    { label: 'Failed / Skipped', value: String(trace?.summary?.failedOrSkipped ?? 0) },
  ], [trace, traceId]);

  const masterOrderFields = useMemo(() => [
    ['Trace ID', trace?.masterOrder?.traceId || traceId || PLACEHOLDER],
    ['Master Order ID', trace?.masterOrder?.masterOrderId || PLACEHOLDER],
    ['Master User', trace?.masterOrder?.masterUser || PLACEHOLDER],
    ['Master Broker', trace?.masterOrder?.masterBroker || PLACEHOLDER],
    ['Symbol', trace?.masterOrder?.symbol || PLACEHOLDER],
    ['Side', trace?.masterOrder?.side || PLACEHOLDER],
    ['Quantity', String(trace?.masterOrder?.quantity ?? 0)],
    ['Order Type', trace?.masterOrder?.orderType || PLACEHOLDER],
    ['Product', trace?.masterOrder?.product || PLACEHOLDER],
    ['Exchange', trace?.masterOrder?.exchange || PLACEHOLDER],
    ['Trigger Time', fmtDateTime(trace?.masterOrder?.triggerTime)],
    ['Placed Time', fmtDateTime(trace?.masterOrder?.placedTime)],
    ['Average Price', trace?.masterOrder?.averagePrice ? String(trace.masterOrder.averagePrice) : PLACEHOLDER],
    ['Execution Status', trace?.masterOrder?.executionStatus || PLACEHOLDER],
  ], [trace, traceId]);

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
        loading ? (
          <div className="rounded-2xl border border-border bg-black/5 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading trace details…
            </div>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-600 dark:text-rose-400">
            {loadError}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-600 dark:text-emerald-400">
            Trace loaded successfully.
          </div>
        )
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
              ['Lookup Status', trace?.summary?.lookupStatus || (traceId ? 'Loading' : PLACEHOLDER)],
              ['Average Child Latency', trace?.summary?.averageLatencyMs != null ? `${trace.summary.averageLatencyMs}ms` : PLACEHOLDER],
              ['Fastest Child Latency', trace?.summary?.fastestLatencyMs != null ? `${trace.summary.fastestLatencyMs}ms` : PLACEHOLDER],
              ['Slowest Child Latency', trace?.summary?.slowestLatencyMs != null ? `${trace.summary.slowestLatencyMs}ms` : PLACEHOLDER],
              ['Failure Rate', trace?.summary?.failureRate || PLACEHOLDER],
              ['Last Backend Sync', fmtDateTime(trace?.summary?.lastBackendSync)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-black/5 px-3 py-3 text-sm dark:bg-white/5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Risk checks — spec section 6 */}
      <GlassCard>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Risk Checks
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Risk Check Passed', trace?.riskChecks?.riskCheckPassed == null ? PLACEHOLDER : String(trace.riskChecks.riskCheckPassed)],
              ['Sell-Guard Passed', trace?.riskChecks?.sellGuardPassed == null ? PLACEHOLDER : String(trace.riskChecks.sellGuardPassed)],
              ['Failed Rule', trace?.riskChecks?.failedRule || PLACEHOLDER],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
      </GlassCard>

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
              {loading ? (
                <tr>
                  <td colSpan={childColumns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">Loading trace…</td>
                </tr>
              ) : !traceId ? (
                <tr>
                  <td colSpan={childColumns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">Enter a trace ID to view child copy details.</td>
                </tr>
              ) : !trace || trace.childCopies.length === 0 ? (
                <tr>
                  <td colSpan={childColumns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">No child copy rows found for this trace.</td>
                </tr>
              ) : (
                trace.childCopies.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium">{row.child}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.broker}</td>
                    <td className="px-4 py-3 text-sm">{row.scaleFactor}</td>
                    <td className="px-4 py-3 text-sm">{row.qtyCopied}</td>
                    <td className="px-4 py-3 text-xs font-mono">{row.orderId}</td>
                    <td className="px-4 py-3 text-sm">{row.status}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDateTime(row.executedAt)}</td>
                    <td className="px-4 py-3 text-sm">{row.price || PLACEHOLDER}</td>
                    <td className="px-4 py-3 text-sm">{row.latencyMs || PLACEHOLDER}</td>
                    <td className="px-4 py-3 text-sm">{row.slippagePct || PLACEHOLDER}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.reason || PLACEHOLDER}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default OrderTrace;
