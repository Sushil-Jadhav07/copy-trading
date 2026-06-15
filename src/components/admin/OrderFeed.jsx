import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Download,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

const FEED_FILTERS = ['All', 'Detected', 'Replicating', 'Completed', 'Failed'];

const CONNECTED_BROKERS = [
  { name: 'Zerodha', state: 'live' },
  { name: 'Angel One', state: 'live' },
  { name: 'Groww', state: 'live' },
  { name: 'Upstox', state: 'error' },
  { name: 'Dhan', state: 'live' },
];

const FEED_ROWS = [
  {
    id: 1,
    orderId: 'ORD001',
    detectedAt: '14:32:10',
    symbol: 'RELIANCE',
    exchange: 'NSE EQ',
    side: 'BUY',
    qty: 50,
    execPrice: 2912,
    type: 'LIMIT',
    broker: 'Zerodha',
    children: '11',
    status: 'Complete',
    state: 'Completed',
    detail: {
      title: 'RELIANCE',
      market: 'NSE EQ',
      tradeLine: 'BUY 50 @ ₹2912',
      type: 'LIMIT',
      side: 'BUY',
      quantity: '50',
      price: '₹2912',
      status: 'Complete',
      masterBroker: 'Zerodha',
      orderId: 'ZER-4421992',
      detectedAt: '14:32:10.384 IST',
      latency: '38ms',
      tradeValue: '₹1,45,623',
      timeline: [
        { time: '14:32:10', text: 'Order Placed', delta: '0ms' },
        { time: '14:33:10', text: 'Risk Check', delta: '12ms' },
        { time: '14:34:10', text: 'Broker API', delta: '42ms' },
        { time: '14:35:10', text: 'Confirmation', delta: '2ms' },
      ],
      latencyFooter: 'Total end-to-end latency: 91ms ✓ (under 100ms)',
      childReplication: [
        { name: 'Child A', broker: 'Zerodha', status: 'Complete', meta: '50 @ ₹2912' },
        { name: 'Child B', broker: 'Angel One', status: 'Complete', meta: '100 @ ₹2912.5' },
        { name: 'Child C', broker: 'Upstox', status: 'Failed', meta: 'Error: Insufficient margin' },
      ],
    },
  },
  {
    id: 2,
    orderId: 'ORD002',
    detectedAt: '14:28:44',
    symbol: 'INFY',
    exchange: 'NSE EQ',
    side: 'BUY',
    qty: 200,
    execPrice: 1471,
    type: 'MARKET',
    broker: 'Angel One',
    children: '11',
    status: 'Complete',
    state: 'Completed',
  },
  {
    id: 3,
    orderId: 'ORD003',
    detectedAt: '14:15:32',
    symbol: 'HDFCBANK',
    exchange: 'NSE EQ',
    side: 'SELL',
    qty: 100,
    execPrice: 1720,
    type: 'LIMIT',
    broker: 'Zerodha',
    children: '8',
    status: 'Complete',
    state: 'Completed',
  },
  {
    id: 4,
    orderId: 'ORD004',
    detectedAt: '14:20:18',
    symbol: 'NIFTY 25JUN 24000 CE',
    exchange: 'NSE F&O',
    side: 'BUY',
    qty: 75,
    execPrice: 145,
    type: 'SL',
    broker: 'Groww',
    children: '9',
    status: 'Complete',
    state: 'Completed',
  },
  {
    id: 5,
    orderId: 'ORD005',
    detectedAt: '14:15:33',
    symbol: 'TCS',
    exchange: 'NSE EQ',
    side: 'SELL',
    qty: 50,
    execPrice: 3795,
    type: 'MARKET',
    broker: 'Dhan',
    children: '7',
    status: 'Complete',
    state: 'Completed',
  },
  {
    id: 6,
    orderId: 'ORD006',
    detectedAt: '14:10:55',
    symbol: 'BAJFINANCE',
    exchange: 'NSE EQ',
    side: 'BUY',
    qty: 25,
    execPrice: 6785,
    type: 'LIMIT',
    broker: 'Zerodha',
    children: '10',
    status: 'Pending',
    state: 'Detected',
  },
  {
    id: 7,
    orderId: 'ORD007',
    detectedAt: '14:05:12',
    symbol: 'BANKNIFTY 25JUN 51000 PE',
    exchange: 'NSE F&O',
    side: 'BUY',
    qty: 50,
    execPrice: 280,
    type: 'SL',
    broker: 'Angel One',
    children: '10',
    status: 'Trigger Pending',
    state: 'Detected',
  },
  {
    id: 8,
    orderId: 'ORD008',
    detectedAt: '13:58:44',
    symbol: 'ICICIBANK',
    exchange: 'NSE EQ',
    side: 'BUY',
    qty: 150,
    execPrice: 1124,
    type: 'MARKET',
    broker: 'Upstox',
    children: '0',
    status: 'Complete',
    state: 'Completed',
  },
  {
    id: 9,
    orderId: 'ORD009',
    detectedAt: '13:52:30',
    symbol: 'ADANIENT',
    exchange: 'NSE EQ',
    side: 'SELL',
    qty: 80,
    execPrice: 2895,
    type: 'LIMIT',
    broker: 'Upstox',
    children: '0',
    status: 'Rejected',
    state: 'Failed',
  },
  {
    id: 10,
    orderId: 'ORD010',
    detectedAt: '13:45:18',
    symbol: 'RELIANCE',
    exchange: 'NSE EQ',
    side: 'SELL',
    qty: 25,
    execPrice: 0,
    type: 'SL-M',
    broker: 'Zerodha',
    children: '0',
    status: 'Cancelled',
    state: 'Failed',
  },
  {
    id: 11,
    orderId: 'ORD011',
    detectedAt: '13:38:55',
    symbol: 'MARUTI',
    exchange: 'NSE EQ',
    side: 'BUY',
    qty: 10,
    execPrice: 11245,
    type: 'LIMIT',
    broker: 'Groww',
    children: '6',
    status: 'Complete',
    state: 'Completed',
  },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const exportCSV = (rows) => {
  const headers = ['#', 'Detected At', 'Symbol', 'Exchange', 'Side', 'Qty', 'Exec Price', 'Product', 'Broker', 'Children', 'Status'];
  const data = rows.map((row) => [
    row.id,
    row.detectedAt,
    row.symbol,
    row.exchange,
    row.side,
    row.qty,
    row.execPrice,
    row.product,
    row.broker,
    row.children,
    row.status,
  ].join(','));

  const blob = new Blob([[headers.join(','), ...data].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'trade-feed.csv';
  anchor.click();
  URL.revokeObjectURL(url);
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
  const [search, setSearch] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const state = stateMap[activeFilter];
    const query = search.trim().toLowerCase();

    return FEED_ROWS.filter((row) => {
      if (state && row.state !== state) return false;
      if (
        query &&
        !row.symbol.toLowerCase().includes(query) &&
        !row.broker.toLowerCase().includes(query) &&
        !row.exchange.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [activeFilter, search]);

  const selectedTrade = useMemo(
    () => FEED_ROWS.find((row) => row.id === selectedTradeId) || FEED_ROWS[0],
    [selectedTradeId],
  );

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
          <button
            type="button"
            onClick={() => exportCSV(filteredRows)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => exportCSV(filteredRows)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground">
                10 / page
              </div>
            </div>
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
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                        row.id === selectedTrade.id ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.04]' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-brand-purple">{row.orderId}</td>
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
          </section>
        </div>
      </section>

      {detailsOpen && (
        <>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setDetailsOpen(false)}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          />
          <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-slate-200/70 bg-background shadow-2xl dark:border-white/[0.06]">
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
                    ['Order ID', selectedTrade.detail?.orderId || 'ORD001'],
                    ['Symbol', selectedTrade.detail?.title || selectedTrade.symbol],
                    ['Type', selectedTrade.detail?.type || 'LIMIT', 'pill'],
                    ['Side', selectedTrade.detail?.side || selectedTrade.side, 'side'],
                    ['Quantity', selectedTrade.detail?.quantity || String(selectedTrade.qty)],
                    ['Price', selectedTrade.detail?.price || formatCurrency(selectedTrade.execPrice)],
                    ['Status', selectedTrade.detail?.status || 'Complete', 'status'],
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
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${detailStatusClass.Complete}`}>
                          {value}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900 dark:text-foreground">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

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
