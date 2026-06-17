import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { adminService } from '@/lib/admin';

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

const OpenPositions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(() => {
    adminService
      .getPositions()
      .then((data) => {
        setPositions(data);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.masterName.toLowerCase().includes(q) ||
        p.broker.toLowerCase().includes(q),
    );
  }, [positions, search]);

  const totalPnl = useMemo(
    () => filtered.reduce((sum, p) => sum + p.pnl, 0),
    [filtered],
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Open Positions
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            Live positions across all master accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400 dark:text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString('en-IN')}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Positions', value: positions.length, color: 'text-slate-900 dark:text-foreground' },
          {
            label: 'Net Unrealized P&L',
            value: (totalPnl >= 0 ? '+' : '') + formatCurrency(totalPnl),
            color: totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
          },
          {
            label: 'Long',
            value: positions.filter((p) => p.side === 'BUY').length,
            color: 'text-emerald-500',
          },
          {
            label: 'Short',
            value: positions.filter((p) => p.side === 'SELL').length,
            color: 'text-rose-500',
          },
        ].map((stat) => (
          <article key={stat.label} className={`${panelClass} p-4`}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground">
              {stat.label}
            </div>
            <div className={`mt-2 text-2xl font-semibold ${stat.color}`}>
              {stat.value}
            </div>
          </article>
        ))}
      </section>

      <section className="relative max-w-[320px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol, master or broker…"
          className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-brand-purple dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:placeholder-muted-foreground"
        />
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['Symbol', 'Master', 'Side', 'Qty', 'Avg Price', 'LTP', 'Unrealized P&L', 'P&L %', 'Product', 'Broker', 'Children'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground/75"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    Loading positions…
                  </td>
                </tr>
              )}

              {!loading && filtered.map((pos) => {
                const isBuy = pos.side === 'BUY';
                const positive = pos.pnl >= 0;
                return (
                  <tr
                    key={pos.id}
                    className="border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900 dark:text-foreground">
                      {pos.symbol}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {pos.masterName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        isBuy
                          ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {pos.side}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">
                      {pos.qty}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {formatCurrency(pos.avgPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {formatCurrency(pos.ltp)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {positive ? '+' : ''}{formatCurrency(pos.pnl)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {positive ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {pos.product}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">
                      {pos.broker}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm font-semibold text-slate-900 dark:text-foreground">
                      {pos.children}
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">
                    {search ? 'No positions match your search.' : 'No open positions at this time.'}
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

export default OpenPositions;
