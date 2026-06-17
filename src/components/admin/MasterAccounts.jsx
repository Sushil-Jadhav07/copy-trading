import React from 'react';
import { Pause, Play, Plus, TrendingUp, Trash2, Users, Zap } from 'lucide-react';

const SUMMARY_CARDS = [
  { label: 'Total Masters', value: '6', icon: Users, tone: 'neutral' },
  { label: 'Active Masters', value: '5', icon: TrendingUp, tone: 'positive' },
  { label: 'Children Linked', value: '13', icon: Users, tone: 'positive' },
  { label: 'Trades Copied Today', value: '134', icon: Zap, tone: 'positive' },
  { label: 'Total AUM', value: '₹8.40L', icon: TrendingUp, tone: 'positive' },
];

const MASTER_ROWS = [
  { id: 1, name: 'Rahul Verma',    broker: 'Zerodha',   accountId: 'ZY0011', children: 4, status: 'Active', todayPnl: 12400, totalPnl: 184000, tradesCopied: 34, lastActive: '1 min ago' },
  { id: 2, name: 'Anita Shah',     broker: 'Angel One', accountId: 'AO4422', children: 2, status: 'Active', todayPnl:  8640, totalPnl: 126500, tradesCopied: 28, lastActive: '3 min ago' },
  { id: 3, name: 'Suresh Pillai',  broker: 'Upstox',    accountId: 'UP9901', children: 3, status: 'Active', todayPnl:  3200, totalPnl:  74200, tradesCopied: 21, lastActive: '5 min ago' },
  { id: 4, name: 'Divya Kapoor',   broker: 'Dhan',      accountId: 'DH3310', children: 1, status: 'Active', todayPnl: -2100, totalPnl:  41800, tradesCopied: 18, lastActive: '9 min ago' },
  { id: 5, name: 'Manish Gupta',   broker: 'Groww',     accountId: 'GR5577', children: 2, status: 'Active', todayPnl:  6800, totalPnl:  98300, tradesCopied: 24, lastActive: '2 min ago' },
  { id: 6, name: 'Pooja Menon',    broker: 'Zerodha',   accountId: 'ZY7743', children: 1, status: 'Paused', todayPnl:     0, totalPnl:  31600, tradesCopied:  0, lastActive: '3 days ago' },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const MasterAccounts = () => {
  const total   = MASTER_ROWS.length;
  const paused  = MASTER_ROWS.filter((r) => r.status === 'Paused').length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Master Accounts</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            {total} total{paused > 0 ? `, ${paused} paused` : ''}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-gradient-h px-5 py-3 text-sm font-semibold text-white shadow-btn-primary transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Add Master
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {SUMMARY_CARDS.map((card) => (
          <article key={card.label} className={`${panelClass} p-4`}>
            <div className="relative z-10 flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  card.tone === 'positive'
                    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                    : card.tone === 'warning'
                    ? 'bg-amber-500/12 text-amber-600 dark:text-amber-300'
                    : 'bg-brand-purple/10 text-brand-purple'
                }`}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground">{card.label}</div>
                <div className="mt-1 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-900 dark:text-foreground">{card.value}</div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                {['#', 'Master Name', 'Broker', 'Account ID', 'Children', 'Status', 'Today P&L', 'Total P&L', 'Trades Copied', 'Last Active', 'Actions'].map((h) => (
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
              {MASTER_ROWS.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                    index % 2 === 0 ? '' : 'bg-black/[0.01] dark:bg-white/[0.01]'
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.id}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-brand-purple">{row.name}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.accountId}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple">
                      <Users className="h-3 w-3" />
                      {row.children}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        row.status === 'Active'
                          ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${row.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {row.status}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.todayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {row.todayPnl > 0 ? '+' : row.todayPnl < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(row.todayPnl))}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-4 text-sm font-semibold ${row.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {row.totalPnl > 0 ? '+' : row.totalPnl < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(row.totalPnl))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.tradesCopied}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.lastActive}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          row.status === 'Active'
                            ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {row.status === 'Active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {row.status === 'Active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/12 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MasterAccounts;
