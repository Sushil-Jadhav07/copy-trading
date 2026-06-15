import React, { useMemo, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Download, Search, Filter, X } from 'lucide-react';

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_TRADES = [
  { id: 1,  date: '13 Jun 2025', time: '14:32:10', symbol: 'RELIANCE',             side: 'BUY',  qty: 50,  entry: 2840,  exit: 2912, pnl: 3600,  pct: 2.54,  duration: '2h 15m', product: 'MIS',  broker: 'Zerodha',   tag: 'Momentum' },
  { id: 2,  date: '13 Jun 2025', time: '14:28:45', symbol: 'INFY',                 side: 'BUY',  qty: 200, entry: 1450,  exit: 1471, pnl: 4200,  pct: 1.45,  duration: '1h 45m', product: 'MIS',  broker: 'Angel One', tag: 'Breakout' },
  { id: 3,  date: '13 Jun 2025', time: '14:25:22', symbol: 'HDFCBANK',             side: 'SELL', qty: 100, entry: 1720,  exit: 1698, pnl: 2200,  pct: 1.28,  duration: '3h 20m', product: 'CNC',  broker: 'Zerodha',   tag: 'Swing' },
  { id: 4,  date: '13 Jun 2025', time: '14:20:18', symbol: 'NIFTY 25JUN 24000 CE', side: 'BUY',  qty: 75,  entry: 145,   exit: 198,  pnl: 3975,  pct: 36.55, duration: '45m',    product: 'NRML', broker: 'Groww',     tag: 'Options' },
  { id: 5,  date: '13 Jun 2025', time: '14:15:33', symbol: 'TCS',                  side: 'SELL', qty: 50,  entry: 3820,  exit: 3795, pnl: -1250, pct: -0.65, duration: '1h 30m', product: 'MIS',  broker: 'Dhan',      tag: 'Reversal' },
  { id: 6,  date: '13 Jun 2025', time: '13:58:44', symbol: 'ICICIBANK',            side: 'BUY',  qty: 150, entry: 1110,  exit: 1124, pnl: 2100,  pct: 1.26,  duration: '2h',     product: 'MIS',  broker: 'Upstox',    tag: 'Intraday' },
  { id: 7,  date: '13 Jun 2025', time: '13:45:18', symbol: 'BANKNIFTY 25JUN 51000 PE', side: 'BUY', qty: 50, entry: 280, exit: 312, pnl: 1600, pct: 11.43, duration: '1h 15m', product: 'NRML', broker: 'Angel One', tag: 'Hedge' },
  { id: 8,  date: '13 Jun 2025', time: '13:30:22', symbol: 'NIFTY 25JUN 24200 CE', side: 'BUY',  qty: 100, entry: 67,    exit: 95,   pnl: 2800,  pct: 41.79, duration: '30m',    product: 'NRML', broker: 'Dhan',      tag: 'Scalping' },
  { id: 9,  date: '13 Jun 2025', time: '13:10:33', symbol: 'WIPRO',                side: 'SELL', qty: 300, entry: 480,   exit: 476,  pnl: 1200,  pct: 0.83,  duration: '4h',     product: 'MIS',  broker: 'Groww',     tag: 'Swing' },
  { id: 10, date: '12 Jun 2025', time: '15:15:00', symbol: 'RELIANCE',             side: 'BUY',  qty: 100, entry: 2780,  exit: 2845, pnl: 6500,  pct: 2.34,  duration: '1d',     product: 'CNC',  broker: 'Zerodha',   tag: 'Delivery' },
  { id: 11, date: '12 Jun 2025', time: '14:20:00', symbol: 'NIFTY 25JUN 23800 PE', side: 'BUY',  qty: 150, entry: 100,   exit: 78,   pnl: -3300, pct: -22,   duration: '2h',     product: 'NRML', broker: 'Angel One', tag: 'Options' },
  { id: 12, date: '12 Jun 2025', time: '12:05:11', symbol: 'BAJFINANCE',           side: 'BUY',  qty: 30,  entry: 7200,  exit: 7395, pnl: 5850,  pct: 2.71,  duration: '3h 55m', product: 'CNC',  broker: 'Upstox',    tag: 'Momentum' },
  { id: 13, date: '12 Jun 2025', time: '11:48:22', symbol: 'SBIN',                 side: 'SELL', qty: 500, entry: 825,   exit: 812,  pnl: 6500,  pct: 1.58,  duration: '2h 12m', product: 'MIS',  broker: 'Zerodha',   tag: 'Reversal' },
  { id: 14, date: '12 Jun 2025', time: '10:30:00', symbol: 'LTIM',                 side: 'BUY',  qty: 40,  entry: 5400,  exit: 5512, pnl: 4480,  pct: 2.07,  duration: '4h 30m', product: 'CNC',  broker: 'Dhan',      tag: 'Breakout' },
  { id: 15, date: '11 Jun 2025', time: '15:22:05', symbol: 'HCLTECH',              side: 'BUY',  qty: 200, entry: 1640,  exit: 1688, pnl: 9600,  pct: 2.93,  duration: '1d',     product: 'CNC',  broker: 'Groww',     tag: 'Swing' },
  { id: 16, date: '11 Jun 2025', time: '14:10:19', symbol: 'MARUTI',               side: 'SELL', qty: 10,  entry: 12800, exit: 12640, pnl: 1600, pct: 1.25,  duration: '2h',     product: 'MIS',  broker: 'Zerodha',   tag: 'Intraday' },
  { id: 17, date: '11 Jun 2025', time: '11:55:44', symbol: 'TATAMOTORS',           side: 'BUY',  qty: 300, entry: 945,   exit: 978,  pnl: 9900,  pct: 3.49,  duration: '3h 5m',  product: 'MIS',  broker: 'Angel One', tag: 'Momentum' },
  { id: 18, date: '11 Jun 2025', time: '10:15:30', symbol: 'AXISBANK',             side: 'BUY',  qty: 200, entry: 1195,  exit: 1178, pnl: -3400, pct: -1.42, duration: '1h 40m', product: 'MIS',  broker: 'Upstox',    tag: 'Reversal' },
  { id: 19, date: '10 Jun 2025', time: '15:18:00', symbol: 'POWERGRID',            side: 'BUY',  qty: 500, entry: 336,   exit: 349,  pnl: 6500,  pct: 3.87,  duration: '2d',     product: 'CNC',  broker: 'Dhan',      tag: 'Delivery' },
  { id: 20, date: '10 Jun 2025', time: '13:44:21', symbol: 'NIFTY 25JUN 24500 CE', side: 'BUY',  qty: 50,  entry: 42,    exit: 118,  pnl: 3800,  pct: 180.9, duration: '1h 16m', product: 'NRML', broker: 'Zerodha',   tag: 'Scalping' },
];

// ── Stat helpers ─────────────────────────────────────────────────────────────
function sumPnl(trades) {
  return trades.reduce((s, t) => s + t.pnl, 0);
}

function isInRange(trade, days) {
  const tradeDate = parseDate(trade.date);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return tradeDate >= cutoff;
}

function parseDate(str) {
  const [day, mon, yr] = str.split(' ');
  return new Date(`${mon} ${day} ${yr}`);
}

const TAG_COLORS = {
  Momentum:  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Breakout:  'bg-blue-100   text-blue-700   dark:bg-blue-500/15   dark:text-blue-300',
  Swing:     'bg-sky-100    text-sky-700    dark:bg-sky-500/15    dark:text-sky-300',
  Options:   'bg-amber-100  text-amber-700  dark:bg-amber-500/15  dark:text-amber-300',
  Reversal:  'bg-rose-100   text-rose-700   dark:bg-rose-500/15   dark:text-rose-300',
  Intraday:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Hedge:     'bg-teal-100   text-teal-700   dark:bg-teal-500/15   dark:text-teal-300',
  Scalping:  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  Delivery:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
};

function exportCSV(trades) {
  const header = 'Date,Time,Symbol,B/S,Qty,Entry,Exit,P&L,% Return,Duration,Product,Broker,Tag';
  const rows = trades.map((t) =>
    [t.date, t.time, t.symbol, t.side, t.qty, t.entry, t.exit, t.pnl, t.pct, t.duration, t.product, t.broker, t.tag].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trade_history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
const TradeHistory = () => {
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [brokerFilter, setBrokerFilter] = useState('ALL');

  const allTags = useMemo(() => ['ALL', ...Array.from(new Set(MOCK_TRADES.map((t) => t.tag)))], []);
  const allBrokers = useMemo(() => ['ALL', ...Array.from(new Set(MOCK_TRADES.map((t) => t.broker)))], []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_TRADES.filter((t) => {
      if (sideFilter !== 'ALL' && t.side !== sideFilter) return false;
      if (tagFilter !== 'ALL' && t.tag !== tagFilter) return false;
      if (brokerFilter !== 'ALL' && t.broker !== brokerFilter) return false;
      if (q && !t.symbol.toLowerCase().includes(q) && !t.broker.toLowerCase().includes(q) && !t.tag.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, sideFilter, tagFilter, brokerFilter]);

  const weekPnl   = useMemo(() => sumPnl(MOCK_TRADES.filter((t) => isInRange(t, 7))),   []);
  const monthPnl  = useMemo(() => sumPnl(MOCK_TRADES.filter((t) => isInRange(t, 30))),  []);
  const quarterPnl = useMemo(() => sumPnl(MOCK_TRADES.filter((t) => isInRange(t, 90))), []);

  const clearFilters = () => {
    setSearch('');
    setSideFilter('ALL');
    setTagFilter('ALL');
    setBrokerFilter('ALL');
  };

  const hasFilters = search || sideFilter !== 'ALL' || tagFilter !== 'ALL' || brokerFilter !== 'ALL';

  const StatCard = ({ label, value, positive }) => (
    <GlassCard className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-sm dark:border-white/6 dark:from-white/[0.04] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${positive ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
          {positive
            ? <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            : <TrendingDown className="h-5 w-5 text-rose-500 dark:text-rose-400" />}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-muted-foreground">{label}</p>
          <p className={`mt-0.5 text-2xl font-black ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {positive ? '+' : ''}{formatCurrency(Math.abs(value))}
          </p>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-foreground">Trade History</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Mock data — all platform trades across brokers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="This Week"    value={weekPnl}    positive={weekPnl >= 0} />
        <StatCard label="This Month"   value={monthPnl}   positive={monthPnl >= 0} />
        <StatCard label="This Quarter" value={quarterPnl} positive={quarterPnl >= 0} />
      </div>

      {/* Filters */}
      <GlassCard className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-4 dark:border-white/6 dark:from-white/[0.04] dark:to-white/[0.02]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol, broker, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-foreground dark:placeholder-muted-foreground"
            />
          </div>

          {/* Side filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
            {['ALL', 'BUY', 'SELL'].map((s) => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                  sideFilter === s
                    ? s === 'BUY'
                      ? 'bg-emerald-500 text-white shadow'
                      : s === 'SELL'
                      ? 'bg-rose-500 text-white shadow'
                      : 'bg-brand-purple text-white shadow'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-foreground"
          >
            {allTags.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Tags' : t}</option>)}
          </select>

          {/* Broker filter */}
          <select
            value={brokerFilter}
            onChange={(e) => setBrokerFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/5 dark:text-foreground"
          >
            {allBrokers.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'All Brokers' : b}</option>)}
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          <span className="ml-auto text-xs font-medium text-slate-400 dark:text-muted-foreground">
            {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-0 dark:border-white/6 dark:from-white/[0.04] dark:to-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {['DATE', 'TIME', 'SYMBOL', 'B/S', 'QTY', 'ENTRY', 'EXIT', 'P&L', '% RETURN', 'DURATION', 'PRODUCT', 'BROKER', 'TAG'].map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground/70"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    No trades match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const profit = t.pnl >= 0;
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-50 transition-colors hover:bg-slate-50/80 dark:border-white/[0.03] dark:hover:bg-white/[0.03] ${i % 2 === 1 ? 'bg-slate-50/40 dark:bg-white/[0.01]' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{t.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{t.time}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800 dark:text-foreground">{t.symbol}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`font-black text-xs ${t.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          {t.side}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{t.qty}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(t.entry)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatCurrency(t.exit)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 font-bold ${profit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {profit ? '+' : ''}{formatCurrency(t.pnl)}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 font-semibold ${profit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {profit ? '+' : ''}{t.pct}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">{t.duration}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {t.product}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{t.broker}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TAG_COLORS[t.tag] || 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                          {t.tag}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default TradeHistory;
