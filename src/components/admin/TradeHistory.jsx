import { useEffect, useMemo, useState } from 'react';
import { Download, Search, TrendingUp } from 'lucide-react';
import { adminService } from '@/lib/admin';

const buildStats = (trades) => {
  const total = trades.length;
  const wins = trades.filter((t) => t.status === 'success').length;
  const losses = trades.filter((t) => t.status === 'error').length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  return [
    { label: 'Total Trades', value: String(total), tone: 'neutral' },
    { label: 'Win Trades', value: String(wins), tone: 'positive' },
    { label: 'Loss Trades', value: String(losses), tone: 'negative' },
    { label: 'Win Rate', value: `${winRate}%`, tone: 'neutral' },
  ];
};

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const tagClass =
  'rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[11px] font-semibold text-brand-purple';

const statusBadgeClass = {
  success: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  warning: 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const statusLabel = { success: 'Complete', error: 'Failed', warning: 'Pending' };

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const exportCSV = (rows) => {
  const headers = ['Timestamp', 'Symbol', 'Type', 'B/S', 'Qty', 'Price', 'Status', 'Broker', 'Master', 'Message'];
  const data = rows.map((row) => [
    formatTimestamp(row.timestamp),
    row.symbol,
    row.type,
    row.action,
    row.qty,
    row.price,
    statusLabel[row.status] || row.status,
    row.broker,
    row.master,
    `"${(row.message || '').replace(/"/g, '""')}"`,
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
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    adminService
      .getTradeLogs()
      .then(setTrades)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trades;

    return trades.filter(
      (row) =>
        row.symbol.toLowerCase().includes(query) ||
        row.broker.toLowerCase().includes(query) ||
        row.master.toLowerCase().includes(query),
    );
  }, [search, trades]);

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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buildStats(trades).map((stat) => (
          <article key={stat.label} className={`${panelClass} p-4 text-center`}>
            <div className="relative z-10">
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-muted-foreground">{stat.label}</div>
              <div
                className={`mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] ${
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

      <section className="relative max-w-[310px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search symbol or broker…"
          className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
        />
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['Timestamp', 'Symbol', 'Type', 'B/S', 'Qty', 'Price', 'Status', 'Broker', 'Master', 'Message'].map((header) => (
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
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    Loading trade logs…
                  </td>
                </tr>
              )}

              {!loading && filteredRows.map((row) => {
                const isBuy = String(row.action).toUpperCase() === 'BUY';
                const isSell = String(row.action).toUpperCase() === 'SELL';

                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{formatTimestamp(row.timestamp)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900 dark:text-foreground">{row.symbol}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={tagClass}>{row.type}</span>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${
                      isBuy
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isSell
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {row.action || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.qty || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">
                      {row.price ? formatCurrency(row.price) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[row.status] || statusBadgeClass.success}`}>
                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.master}</td>
                    <td className="max-w-[200px] truncate px-4 py-4 text-sm text-slate-400 dark:text-slate-400">{row.message || '—'}</td>
                  </tr>
                );
              })}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    No trade history matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};

export default TradeHistory;
