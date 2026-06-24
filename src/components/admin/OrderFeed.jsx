import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminService } from '@/lib/admin';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import DownloadButton from '@/components/shared/DownloadButton';

const FEED_FILTERS = ['All', 'Detected', 'Replicating', 'Completed', 'Failed'];

const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const PAGE_SIZE = 10;

const getTimeRange = (key) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === 'today') return { from: todayStart, to: null };
  if (key === 'yesterday') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 1);
    return { from, to: todayStart };
  }
  if (key === 'week') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 7);
    return { from, to: null };
  }
  if (key === 'month') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 30);
    return { from, to: null };
  }
  return { from: null, to: null };
};

const CONNECTED_BROKERS = [
  { name: 'Zerodha', state: 'live' },
  { name: 'Angel One', state: 'live' },
  { name: 'Groww', state: 'live' },
  { name: 'Upstox', state: 'error' },
  { name: 'Dhan', state: 'live' },
];


const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const mapLogToFeedRow = (log) => {
  const statusState = {
    success: { status: 'Complete', state: 'Completed' },
    error: { status: 'Rejected', state: 'Failed' },
    warning: { status: 'Pending', state: 'Detected' },
  }[log.status] || { status: 'Complete', state: 'Completed' };

  return {
    id: log.id,
    orderId: log.reference || `LOG-${log.id}`,
    traceId: log.reference || String(log.id),
    timestamp: log.timestamp,
    detectedAt: formatTime(log.timestamp),
    symbol: log.symbol,
    exchange: 'NSE',
    side: log.action,
    qty: log.qty,
    execPrice: log.price,
    type: log.type,
    broker: log.broker,
    children: String(log.children ?? 0),
    status: statusState.status,
    state: statusState.state,
    detail: {
      orderId: log.reference || String(log.id),
      title: log.symbol,
      type: log.type,
      side: log.action,
      quantity: String(log.qty),
      price: log.price ? formatCurrency(log.price) : '—',
      status: statusState.status,
      masterBroker: log.broker,
      timeline: [],
      childReplication: [],
      latencyFooter: log.message || '',
    },
  };
};

const exportexcel = (rows) => {
  downloadExcelSheet({
    rows: rows.map((row) => ({
      'Order ID': row.orderId,
      'Detected At': row.detectedAt,
      Symbol: row.symbol,
      Exchange: row.exchange,
      Side: row.side,
      Qty: row.qty,
      'Exec Price': row.execPrice,
      Type: row.type,
      Broker: row.broker,
      Children: row.children,
      Status: row.status,
    })),
    sheetName: 'Trade Feed',
    fileName: buildExportFileName('Trade Feed'),
  });
};

const stateMap = {
  All: null,
  Detected: 'Detected',
  Replicating: 'Replicating',
  Completed: 'Completed',
  Failed: 'Failed',
};

const brokerChipClass = {
  live: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const statusBadgeClass = {
  Complete: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Pending: 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'Trigger Pending': 'border-orange-500/15 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  Rejected: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Cancelled: 'border-slate-300/80 bg-slate-200/60 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400',
};

const detailStatusClass = {
  Complete: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Failed: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Pending: 'border-brand-purple/20 bg-brand-purple/10 text-brand-purple',
};

const OrderFeed = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedRows, setFeedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [traceDetails, setTraceDetails] = useState({});
  const [traceLoading, setTraceLoading] = useState(false);

  const fetchOrderTrace = async (rowId, traceId) => {
    if (traceDetails[rowId]) return;
    setTraceLoading(true);
    try {
      const data = await adminService.getOrderTrace(traceId);
      setTraceDetails((prev) => ({ ...prev, [rowId]: data }));
    } catch (err) {
      console.error('Failed to fetch trace details:', err);
    } finally {
      setTraceLoading(false);
    }
  };

  useEffect(() => {
    const load = () => {
      adminService
        .getTradeLogs()
        .then((res) => {
          const mapped = (res.logs || []).map(mapLogToFeedRow);
          setFeedRows(mapped);
          setSelectedTradeId((prev) => prev ?? (mapped[0]?.id ?? null));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredRows = useMemo(() => {
    const state = stateMap[activeFilter];
    const query = search.trim().toLowerCase();
    const { from, to } = getTimeRange(timeFilter);

    return feedRows.filter((row) => {
      if (state && row.state !== state) return false;
      if (
        query &&
        !row.symbol.toLowerCase().includes(query) &&
        !row.broker.toLowerCase().includes(query) &&
        !row.exchange.toLowerCase().includes(query)
      ) return false;
      if (from || to) {
        const d = new Date(row.timestamp || 0);
        if (from && d < from) return false;
        if (to && d >= to) return false;
      }
      return true;
    });
  }, [activeFilter, search, timeFilter, feedRows]);

  useEffect(() => { setPage(1); }, [activeFilter, search, timeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedTrade = useMemo(() => {
    const row = feedRows.find((r) => r.id === selectedTradeId) || feedRows[0] || null;
    if (!row) return null;
    const trace = traceDetails[row.id];
    if (trace) {
      return {
        ...row,
        detail: {
          ...row.detail,
          timeline: [
            { text: 'Detected Master Trade', time: formatTime(trace.masterOrder?.placedTime || row.timestamp), delta: '0ms' },
            { text: 'Risk Checks Evaluated', time: formatTime(trace.masterOrder?.placedTime || row.timestamp), delta: trace.riskChecks?.riskCheckPassed !== false ? 'Passed' : 'Failed' },
            { text: `Placed ${trace.summary?.childCopies || 0} child copies`, time: formatTime(trace.masterOrder?.placedTime || row.timestamp), delta: `Avg Latency: ${trace.summary?.averageLatencyMs || 0}ms` },
          ],
          childReplication: (trace.childCopies || []).map((c) => ({
            name: c.child,
            broker: c.broker,
            status: c.status === 'COMPLETED' ? 'Complete' : c.status === 'FAILED' || c.status === 'SKIPPED' ? 'Failed' : 'Pending',
            meta: `Qty: ${c.quantity || 0} | Price: ${c.price || 'Market'} | ${c.reason || ''}`,
          })),
        },
      };
    }
    return row;
  }, [selectedTradeId, feedRows, traceDetails]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Trade Detection Feed</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground">
            <span>Connected Brokers:</span>
            {CONNECTED_BROKERS.map((broker) => (
              <span
                key={broker.name}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${brokerChipClass[broker.state]}`}
              >
                {broker.name} •
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DownloadButton onClick={() => exportexcel(filteredRows)} disabled={filteredRows.length === 0} label="Export Excel" />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {FEED_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                activeFilter === filter
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-slate-200/80 bg-white/75 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground dark:hover:bg-white/[0.07]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTimeFilter(f.key)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                timeFilter === f.key
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200/80 bg-white/75 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground dark:hover:bg-white/[0.07]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-[420px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
              />
            </div>

            <p className="text-sm text-slate-400 dark:text-muted-foreground whitespace-nowrap">
              {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}
            </p>
          </div>

          <section className={`${panelClass} p-0`}>
            <div className="relative z-10 overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
                  <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                    {['Order ID', 'Time', 'Symbol', 'Type', 'B/S', 'Qty', 'Price', 'Status', 'Broker', 'Children', 'Action'].map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground/75"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                        Loading trade feed...
                      </td>
                    </tr>
                  ) : feedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                        No live trades detected yet.
                      </td>
                    </tr>
                  ) : null}
                  {!loading && pagedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                        selectedTrade && row.id === selectedTrade.id ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.04]' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-brand-purple">
                        <Link
                          to={`/admin/order-trace?id=${encodeURIComponent(row.traceId)}`}
                          className="transition-opacity hover:opacity-75"
                        >
                          {row.orderId}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.detectedAt}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900 dark:text-foreground">{row.symbol}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="rounded-full border border-slate-200/80 bg-black/5 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                          {row.type}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {row.side}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.qty}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.execPrice ? `₹${row.execPrice}` : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[row.status] || statusBadgeClass.Complete}`}>
                          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                          {row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.children}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTradeId(row.id);
                            setDetailsOpen(true);
                            fetchOrderTrace(row.id, row.traceId);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-purple/10 px-3 py-1.5 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/15"
                        >
                          Details
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && filteredRows.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-4 border-t border-slate-200/70 px-4 py-3 dark:border-white/[0.06]">
                <p className="text-sm text-slate-400 dark:text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[60px] text-center text-sm font-semibold text-slate-700 dark:text-foreground">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      {detailsOpen && selectedTrade && (
        <>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setDetailsOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          />
          <aside className="fixed !mt-0 right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-slate-200/70 bg-background shadow-2xl dark:border-white/[0.06]">
            <div className="border-b border-slate-200/70 px-6 py-6 dark:border-white/[0.06]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-900 dark:text-foreground">Order Details</h2>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="text-slate-400 transition hover:text-slate-700 dark:text-muted-foreground dark:hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <section className="rounded-[20px] border border-slate-200/80 bg-white/60 p-5 backdrop-blur-xl dark:border-white/6 dark:bg-white/[0.035]">
                <div className="space-y-4 text-sm">
                  {[
                    [
                      'Order ID',
                      <Link
                        key="order-link"
                        to={`/admin/order-trace?id=${encodeURIComponent(selectedTrade.traceId)}`}
                        className="text-brand-purple transition-opacity hover:opacity-75"
                      >
                        {selectedTrade.detail?.orderId || selectedTrade.orderId}
                      </Link>,
                    ],
                    ['Symbol', selectedTrade.detail?.title || selectedTrade.symbol],
                    ['Type', selectedTrade.detail?.type || selectedTrade.type, 'pill'],
                    ['Side', selectedTrade.detail?.side || selectedTrade.side, 'side'],
                    ['Quantity', selectedTrade.detail?.quantity || String(selectedTrade.qty)],
                    ['Price', selectedTrade.detail?.price || (selectedTrade.execPrice ? `₹${selectedTrade.execPrice}` : '—')],
                    ['Status', selectedTrade.detail?.status || selectedTrade.status, 'status'],
                    ['Broker', selectedTrade.detail?.masterBroker || selectedTrade.broker],
                  ].map(([label, value, kind]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
                      {kind === 'pill' ? (
                        <span className="rounded-full border border-slate-200/80 bg-black/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                          {value}
                        </span>
                      ) : kind === 'side' ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{value}</span>
                      ) : kind === 'status' ? (
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${detailStatusClass[value] || detailStatusClass.Complete}`}>
                          {value}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-foreground">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {traceLoading && (
                <p className="mt-4 text-sm text-slate-400 dark:text-muted-foreground animate-pulse">Loading trace data…</p>
              )}

              <section className="mt-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-foreground">Execution Timeline</h3>
                <div className="mt-5 space-y-5">
                  {(selectedTrade.detail?.timeline || []).map((item, index) => (
                    <div key={`${item.time}-${item.text}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-4 w-4 rounded-full bg-emerald-500" />
                        {index < (selectedTrade.detail?.timeline || []).length - 1 && (
                          <div className="mt-1 h-11 w-px bg-slate-200 dark:bg-white/[0.08]" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-foreground">{item.text}</div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                          {item.time} · {item.delta}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!selectedTrade.detail?.timeline || selectedTrade.detail.timeline.length === 0) && (
                    <p className="text-sm text-slate-400 dark:text-muted-foreground">No timeline data available.</p>
                  )}
                  {selectedTrade.detail?.latencyFooter && (
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">System Message / Reason</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {selectedTrade.detail.latencyFooter}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-foreground">Child Replication</h3>
                <div className="mt-4 space-y-3">
                  {(selectedTrade.detail?.childReplication || []).map((child) => (
                    <div
                      key={`${child.name}-${child.broker}`}
                      className="rounded-[18px] border border-slate-200/80 bg-white/60 px-4 py-4 backdrop-blur-xl dark:border-white/6 dark:bg-white/[0.035]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-foreground">{child.name}</div>
                          <div className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{child.broker}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${detailStatusClass[child.status] || detailStatusClass.Pending}`}>
                          {child.status === 'Complete' && <Check className="h-3.5 w-3.5" />}
                          {child.status === 'Failed' && <ShieldCheck className="h-3.5 w-3.5" />}
                          {child.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">{child.meta}</div>
                    </div>
                  ))}
                  {(!selectedTrade.detail?.childReplication || selectedTrade.detail.childReplication.length === 0) && (
                    <p className="text-sm text-slate-400 dark:text-muted-foreground">No child replication data available.</p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default OrderFeed;
