import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { adminService } from '@/lib/admin';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import DownloadButton from '@/components/shared/DownloadButton';

const MsgCell = ({ msg }) => {
  if (!msg || msg === '—' || msg === '-') return <span className="text-sm text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0 max-w-[120px]">
      <span className="text-sm text-slate-400 dark:text-slate-400 truncate">{msg}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="shrink-0 text-slate-400/50 hover:text-slate-600 dark:hover:text-foreground transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm text-xs leading-relaxed break-words whitespace-normal">
            {msg}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

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
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const exportexcel = (rows) => {
  downloadExcelSheet({
    rows: rows.map((row) => ({
      Timestamp: formatTimestamp(row.timestamp),
      Symbol: row.symbol,
      Type: row.type,
      'B/S': row.action,
      Qty: row.qty,
      Price: row.price,
      Status: statusLabel[row.status] || row.status,
      Master: row.master,
      Message: row.message || '',
    })),
    sheetName: 'Trade History',
    fileName: buildExportFileName('Admin Trade History'),
  });
};

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    setLoading(true);
    adminService
      .getTradeLogs({ page, limit: PAGE_SIZE })
      .then((res) => {
        setTrades(res.logs || []);
        setTotalItems(res.meta?.total || 0);
      })
      .catch((err) => {
        console.error('[TradeHistory] Failed to load trade logs:', err?.message || err);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trades;

    return trades.filter(
      (row) =>
        row.symbol.toLowerCase().includes(query) ||
        row.master.toLowerCase().includes(query),
    );
  }, [search, trades]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pagedRows = filteredRows;
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Trade History</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Admin analytics archive</p>
        </div>

        <div className="flex items-center gap-3">
          <DownloadButton onClick={() => exportexcel(filteredRows)} disabled={filteredRows.length === 0} label="Export Excel" />
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
          placeholder="Search symbol or master…"
          className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
        />
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['Timestamp', 'Symbol', 'Type', 'B/S', 'Qty', 'Price', 'Status', 'Master', 'Message'].map((header) => (
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
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    Loading trade logs…
                  </td>
                </tr>
              )}

              {!loading && pagedRows.map((row) => {
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
                      {row.price != null && row.price !== 0 ? formatCurrency(row.price) : (row.price === 0 ? formatCurrency(0) : '—')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[row.status] || statusBadgeClass.success}`}>
                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.master}</td>
                    <td className="w-[1%] px-4 py-4"><MsgCell msg={row.message || '—'} /></td>
                  </tr>
                );
              })}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    No trade history matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-3 text-sm dark:border-white/[0.06]">
            <span className="text-slate-400 dark:text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {filteredRows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs text-slate-400 dark:text-muted-foreground">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/10"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};

export default TradeHistory;
