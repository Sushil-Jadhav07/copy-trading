import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Search } from 'lucide-react';

const POSITION_TABS = ['All', 'Equity', 'F&O', 'Intraday (MIS)', 'Delivery (CNC)', 'NRML'];
const SORT_OPTIONS = ['Time', 'Unrealized P&L', 'Day P&L', 'Children'];

const MOCK_POSITIONS = [
  { id: 1, symbol: 'RELIANCE', type: 'EQ', exchange: 'NSE', product: 'MIS', qty: 50, price: 2912, changePct: 2.54, unrealizedPnl: 3600, dayPnl: 3600, marginUsed: 14200, children: 11, broker: 'Zerodha' },
  { id: 2, symbol: 'NIFTY 25JUN 24000 CE', type: 'CE', exchange: 'NSE', product: 'NRML', qty: 75, price: 198, changePct: 36.55, unrealizedPnl: 3975, dayPnl: 3975, marginUsed: 54375, children: 9, broker: 'Groww' },
  { id: 3, symbol: 'HDFCBANK', type: 'EQ', exchange: 'NSE', product: 'CNC', qty: 100, price: 1698, changePct: -1.28, unrealizedPnl: -2200, dayPnl: -2200, marginUsed: 0, children: 8, broker: 'Angel One' },
  { id: 4, symbol: 'INFY', type: 'EQ', exchange: 'NSE', product: 'MIS', qty: 200, price: 1471, changePct: 1.45, unrealizedPnl: 4200, dayPnl: 4200, marginUsed: 29420, children: 11, broker: 'Dhan' },
  { id: 5, symbol: 'TCS', type: 'EQ', exchange: 'NSE', product: 'MIS', qty: 50, price: 3795, changePct: -0.65, unrealizedPnl: -1250, dayPnl: -1250, marginUsed: 18975, children: 7, broker: 'Zerodha' },
  { id: 6, symbol: 'BANKNIFTY 25JUN 51000 PE', type: 'PE', exchange: 'NSE', product: 'NRML', qty: 50, price: 312, changePct: 11.43, unrealizedPnl: 1600, dayPnl: 1600, marginUsed: 70000, children: 10, broker: 'Upstox' },
  { id: 7, symbol: 'WIPRO', type: 'EQ', exchange: 'NSE', product: 'MIS', qty: 300, price: 476, changePct: -0.83, unrealizedPnl: -1200, dayPnl: -1200, marginUsed: 14400, children: 6, broker: 'Angel One' },
];

const panelClass = 'glass-card hover-lift relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCurrency = (value) => {
  const numeric = Number(value) || 0;
  const abs = Math.abs(numeric);
  if (abs >= 10000000) return `₹${(numeric / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(numeric / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(numeric / 1000).toFixed(1)}K`;
  return formatCurrency(numeric);
};

const typeClasses = {
  EQ: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  CE: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PE: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

const productClasses = {
  MIS: 'bg-black/5 text-slate-500 dark:bg-white/[0.05] dark:text-muted-foreground',
  CNC: 'bg-black/5 text-slate-500 dark:bg-white/[0.05] dark:text-muted-foreground',
  NRML: 'bg-black/5 text-slate-500 dark:bg-white/[0.05] dark:text-muted-foreground',
};

function exportCSV(rows) {
  const headers = ['Symbol', 'Broker', 'Exchange', 'Product', 'Qty', 'Price', 'Change%', 'Unrealized P&L', 'Day P&L', 'Margin Used', 'Children'];
  const data = rows.map((row) => [
    row.symbol,
    row.broker,
    row.exchange,
    row.product,
    row.qty,
    row.price,
    row.changePct,
    row.unrealizedPnl,
    row.dayPnl,
    row.marginUsed,
    row.children,
  ].join(','));

  const blob = new Blob([[headers.join(','), ...data].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'admin-open-positions.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

const OpenPositions = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [sortBy, setSortBy] = useState('Time');
  const [query, setQuery] = useState('');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const productMap = {
      'Intraday (MIS)': 'MIS',
      'Delivery (CNC)': 'CNC',
      NRML: 'NRML',
    };

    let rows = MOCK_POSITIONS.filter((row) => {
      if (activeTab === 'Equity' && row.type !== 'EQ') return false;
      if (activeTab === 'F&O' && !['CE', 'PE'].includes(row.type)) return false;
      if (productMap[activeTab] && row.product !== productMap[activeTab]) return false;
      if (
        normalizedQuery &&
        !row.symbol.toLowerCase().includes(normalizedQuery) &&
        !row.broker.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'Unrealized P&L') return b.unrealizedPnl - a.unrealizedPnl;
      if (sortBy === 'Day P&L') return b.dayPnl - a.dayPnl;
      if (sortBy === 'Children') return b.children - a.children;
      return a.id - b.id;
    });

    return rows;
  }, [activeTab, query, sortBy]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const unrealized = filteredRows.reduce((sum, row) => sum + row.unrealizedPnl, 0);
    const margin = filteredRows.reduce((sum, row) => sum + row.marginUsed, 0);
    const exposure = filteredRows.reduce((sum, row) => sum + row.price * row.qty, 0);
    return { total, unrealized, margin, exposure };
  }, [filteredRows]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Open Positions</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Admin Trade Monitor</p>
        </div>
        <button
          type="button"
          onClick={() => exportCSV(filteredRows)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </section>

      <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {POSITION_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-slate-200/80 bg-white/75 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground dark:hover:bg-white/[0.07]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setSortMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
            >
              <span className="text-slate-400 dark:text-muted-foreground">Sort:</span>
              <span>{sortBy}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#08110d]/95">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSortBy(option);
                      setSortMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      sortBy === option
                        ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{option}</span>
                    {sortBy === option && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search symbol..."
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
            />
          </div>
        </div>
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['Symbol', 'Broker', 'Exchange', 'Product', 'Qty', 'Price', 'Change%', 'Unrealized P&L', 'Day P&L', 'Margin Used', 'Children'].map((header) => (
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
              {filteredRows.map((row) => {
                const positive = row.unrealizedPnl >= 0;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 dark:text-foreground">{row.symbol}</span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] ${typeClasses[row.type] || typeClasses.EQ}`}>
                          {row.type}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.exchange}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${productClasses[row.product] || productClasses.MIS}`}>
                        {row.product}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.qty}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{formatCurrency(row.price)}</td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {row.changePct >= 0 ? '+' : ''}
                      {row.changePct.toFixed(2)}%
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {positive ? '+' : '-'}
                      {formatCurrency(Math.abs(row.unrealizedPnl))}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {row.dayPnl >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(row.dayPnl))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{formatCurrency(row.marginUsed)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.children}</td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    No positions match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${panelClass} p-5`}>
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <div className="text-slate-500 dark:text-muted-foreground">
              Total: <span className="font-semibold text-slate-900 dark:text-foreground">{summary.total}</span>
            </div>
            <div className={`${summary.unrealized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              Unrealized: <span className="font-semibold">{summary.unrealized >= 0 ? '+' : '-'}{formatCompactCurrency(Math.abs(summary.unrealized))}</span>
            </div>
            <div className="text-slate-500 dark:text-muted-foreground">
              Margin: <span className="font-semibold text-slate-900 dark:text-foreground">{formatCompactCurrency(summary.margin)}</span>
            </div>
            <div className="text-slate-500 dark:text-muted-foreground">
              Exposure: <span className="font-semibold text-slate-900 dark:text-foreground">{formatCompactCurrency(summary.exposure)}</span>
            </div>
          </div>

          <button
            type="button"
            className="rounded-2xl border border-rose-500/15 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-400"
          >
            Close All MIS
          </button>
        </div>
      </section>
    </div>
  );
};

export default OpenPositions;
