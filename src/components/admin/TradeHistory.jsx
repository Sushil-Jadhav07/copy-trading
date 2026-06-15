import React, { useMemo, useState } from 'react';
import { Download, Search, TrendingUp } from 'lucide-react';

const MOCK_TRADES = [
  { id: 1, date: '13 Jun 2025', time: '14:32:10', symbol: 'RELIANCE', side: 'BUY', qty: 50, entry: 2840, exit: 2912, pnl: 3600, pct: 2.54, duration: '2h 15m', product: 'MIS', broker: 'Zerodha', tag: 'Momentum' },
  { id: 2, date: '13 Jun 2025', time: '14:28:45', symbol: 'INFY', side: 'BUY', qty: 200, entry: 1450, exit: 1471, pnl: 4200, pct: 1.45, duration: '1h 45m', product: 'MIS', broker: 'Angel One', tag: 'Breakout' },
  { id: 3, date: '13 Jun 2025', time: '14:25:22', symbol: 'HDFCBANK', side: 'SELL', qty: 100, entry: 1720, exit: 1698, pnl: 2200, pct: 1.28, duration: '3h 20m', product: 'CNC', broker: 'Zerodha', tag: 'Swing' },
  { id: 4, date: '13 Jun 2025', time: '14:20:18', symbol: 'NIFTY 25JUN 24000 CE', side: 'BUY', qty: 75, entry: 145, exit: 198, pnl: 3975, pct: 36.55, duration: '45m', product: 'NRML', broker: 'Groww', tag: 'Options' },
  { id: 5, date: '13 Jun 2025', time: '14:15:33', symbol: 'TCS', side: 'SELL', qty: 50, entry: 3820, exit: 3795, pnl: -1250, pct: -0.65, duration: '1h 30m', product: 'MIS', broker: 'Dhan', tag: 'Reversal' },
  { id: 6, date: '13 Jun 2025', time: '13:58:44', symbol: 'ICICIBANK', side: 'BUY', qty: 150, entry: 1110, exit: 1124, pnl: 2100, pct: 1.26, duration: '2h', product: 'MIS', broker: 'Upstox', tag: 'Intraday' },
  { id: 7, date: '13 Jun 2025', time: '13:45:18', symbol: 'BANKNIFTY 25JUN 51000 PE', side: 'BUY', qty: 50, entry: 280, exit: 312, pnl: 1600, pct: 11.43, duration: '1h 15m', product: 'NRML', broker: 'Angel One', tag: 'Hedge' },
  { id: 8, date: '13 Jun 2025', time: '13:30:22', symbol: 'NIFTY 25JUN 24200 CE', side: 'BUY', qty: 100, entry: 67, exit: 95, pnl: 2800, pct: 41.79, duration: '30m', product: 'NRML', broker: 'Dhan', tag: 'Scalping' },
  { id: 9, date: '13 Jun 2025', time: '13:10:33', symbol: 'WIPRO', side: 'SELL', qty: 300, entry: 480, exit: 476, pnl: 1200, pct: 0.83, duration: '4h', product: 'MIS', broker: 'Groww', tag: 'Swing' },
  { id: 10, date: '12 Jun 2025', time: '15:15:00', symbol: 'RELIANCE', side: 'BUY', qty: 100, entry: 2780, exit: 2845, pnl: 6500, pct: 2.34, duration: '1d', product: 'CNC', broker: 'Zerodha', tag: 'Delivery' },
  { id: 11, date: '12 Jun 2025', time: '14:20:00', symbol: 'NIFTY 25JUN 23800 PE', side: 'BUY', qty: 150, entry: 100, exit: 78, pnl: -3300, pct: -22, duration: '2h', product: 'NRML', broker: 'Zerodha', tag: 'Options' },
  { id: 12, date: '12 Jun 2025', time: '13:45:00', symbol: 'BAJFINANCE', side: 'BUY', qty: 20, entry: 6660, exit: 6785, pnl: 2500, pct: 1.88, duration: '3h', product: 'MIS', broker: 'Angel One', tag: 'Momentum' },
  { id: 13, date: '12 Jun 2025', time: '12:30:00', symbol: 'TATAMOTORS', side: 'BUY', qty: 500, entry: 772, exit: 784, pnl: 6000, pct: 1.55, duration: '1h 30m', product: 'MIS', broker: 'Groww', tag: 'Breakout' },
  { id: 14, date: '11 Jun 2025', time: '14:00:00', symbol: 'MARUTI', side: 'BUY', qty: 15, entry: 11100, exit: 11245, pnl: 2175, pct: 1.31, duration: '2d', product: 'CNC', broker: 'Dhan', tag: 'Delivery' },
  { id: 15, date: '11 Jun 2025', time: '13:20:00', symbol: 'AXISBANK', side: 'SELL', qty: 200, entry: 1036, exit: 1028, pnl: 1600, pct: 0.77, duration: '1h 45m', product: 'MIS', broker: 'Zerodha', tag: 'Intraday' },
];

const STATS = [
  { label: 'Total Trades', value: '248', tone: 'neutral' },
  { label: 'Win Trades', value: '184', tone: 'positive' },
  { label: 'Loss Trades', value: '64', tone: 'negative' },
  { label: 'Win Rate', value: '74.2%', tone: 'neutral' },
  { label: 'Avg Profit', value: '+₹2,140', tone: 'positive' },
  { label: 'Avg Loss', value: '-₹1,380', tone: 'negative' },
  { label: 'Profit Factor', value: '2.24', tone: 'neutral' },
  { label: 'Best Trade', value: '+₹18,400', tone: 'positive' },
  { label: 'Worst Trade', value: '-₹8,600', tone: 'negative' },
];

const topSummary = [
  { label: 'This Week', value: '+₹18,240' },
  { label: 'This Month', value: '+₹1,24,500' },
  { label: 'This Quarter', value: '+₹3,08,200' },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const tagClass =
  'rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[11px] font-semibold text-brand-purple';

const productClass =
  'rounded-full border border-slate-200/80 bg-black/5 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const exportCSV = (rows) => {
  const headers = ['Date', 'Time', 'Symbol', 'B/S', 'Qty', 'Entry', 'Exit', 'P&L', '% Return', 'Duration', 'Product', 'Broker', 'Tag'];
  const data = rows.map((row) => [
    row.date,
    row.time,
    row.symbol,
    row.side,
    row.qty,
    row.entry,
    row.exit,
    row.pnl,
    row.pct,
    row.duration,
    row.product,
    row.broker,
    row.tag,
  ].join(','));

  const blob = new Blob([[headers.join(','), ...data].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'admin-trade-history.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

const TradeHistory = () => {
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return MOCK_TRADES;

    return MOCK_TRADES.filter((row) =>
      row.symbol.toLowerCase().includes(query) ||
      row.broker.toLowerCase().includes(query) ||
      row.tag.toLowerCase().includes(query),
    );
  }, [search]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Trade History</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Admin analytics archive</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => exportCSV(filteredRows)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportCSV(filteredRows)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {topSummary.map((item) => (
          <article key={item.label} className={`${panelClass} p-5`}>
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-[2rem] font-semibold tracking-[-0.04em] text-emerald-600 dark:text-emerald-400">{item.value}</div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="relative max-w-[310px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search symbol..."
          className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
        />
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['Date', 'Time', 'Symbol', 'B/S', 'Qty', 'Entry', 'Exit', 'P&L', '% Return', 'Duration', 'Product', 'Broker', 'Tag'].map((header) => (
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
              {filteredRows.map((row, index) => {
                const positive = row.pnl >= 0;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                      index === 11 ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.date}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.time}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900 dark:text-foreground">{row.symbol}</td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {row.side}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.qty}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{formatCurrency(row.entry)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{formatCurrency(row.exit)}</td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {positive ? '+' : '-'}{formatCurrency(Math.abs(row.pnl))}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {row.pct >= 0 ? '+' : ''}{row.pct}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.duration}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={productClass}>{row.product}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={tagClass}>{row.tag}</span>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    No trade history matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
        {STATS.map((stat) => (
          <article key={stat.label} className={`${panelClass} p-4 text-center`}>
            <div className="relative z-10">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">{stat.label}</div>
              <div
                className={`mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] ${
                  stat.tone === 'positive'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stat.tone === 'negative'
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-slate-900 dark:text-foreground'
                }`}
              >
                {stat.value}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default TradeHistory;
