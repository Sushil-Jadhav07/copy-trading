import React from 'react';
import { Pause, Plus, Trash2, TrendingUp, Users, UserRoundX } from 'lucide-react';

const SUMMARY_CARDS = [
  { label: 'Total Children', value: '13', icon: Users, tone: 'neutral' },
  { label: 'Profitable Today', value: '9', icon: TrendingUp, tone: 'positive' },
  { label: 'Copying Live', value: '11', icon: Users, tone: 'positive' },
  { label: 'Paused', value: '2', icon: UserRoundX, tone: 'warning' },
  { label: 'Total AUM', value: '₹4.20L', icon: TrendingUp, tone: 'positive' },
];

const CHILD_ROWS = [
  { id: 1, name: 'Arjun Mehta', broker: 'Zerodha', accountId: 'ZY1042', scaling: '1x', status: 'Active', todayPnl: 2840, totalPnl: 38200, trades: 23, lastActive: '2 min ago' },
  { id: 2, name: 'Priya Sharma', broker: 'Angel One', accountId: 'AO5821', scaling: '2x', status: 'Active', todayPnl: 5680, totalPnl: 76400, trades: 23, lastActive: '3 min ago' },
  { id: 3, name: 'Rohit Kumar', broker: 'Upstox', accountId: 'UP3341', scaling: '0.5x', status: 'Active', todayPnl: 1420, totalPnl: 19100, trades: 21, lastActive: '5 min ago' },
  { id: 4, name: 'Sneha Patel', broker: 'Groww', accountId: 'GR7821', scaling: '1x', status: 'Active', todayPnl: 2840, totalPnl: 31500, trades: 23, lastActive: '2 min ago' },
  { id: 5, name: 'Vikram Nair', broker: 'Dhan', accountId: 'DH2241', scaling: '1.5x', status: 'Active', todayPnl: 4260, totalPnl: 52100, trades: 23, lastActive: '4 min ago' },
  { id: 6, name: 'Meera Joshi', broker: 'Zerodha', accountId: 'ZY8834', scaling: '1x', status: 'Active', todayPnl: -1200, totalPnl: 12400, trades: 22, lastActive: '6 min ago' },
  { id: 7, name: 'Aakash Reddy', broker: 'Angel One', accountId: 'AO9012', scaling: '2x', status: 'Active', todayPnl: 5680, totalPnl: 88300, trades: 23, lastActive: '3 min ago' },
  { id: 8, name: 'Kavya Singh', broker: 'Upstox', accountId: 'UP6634', scaling: '0.5x', status: 'Active', todayPnl: 1420, totalPnl: 22700, trades: 20, lastActive: '8 min ago' },
  { id: 9, name: 'Dev Malhotra', broker: 'Groww', accountId: 'GR4451', scaling: '1x', status: 'Active', todayPnl: 2840, totalPnl: 18900, trades: 23, lastActive: '2 min ago' },
  { id: 10, name: 'Riya Desai', broker: 'Dhan', accountId: 'DH8812', scaling: '1x', status: 'Active', todayPnl: 2840, totalPnl: 41200, trades: 23, lastActive: '3 min ago' },
  { id: 11, name: 'Farhan Khan', broker: 'Zerodha', accountId: 'ZY3318', scaling: '2x', status: 'Active', todayPnl: -2400, totalPnl: -4200, trades: 19, lastActive: '12 min ago' },
  { id: 12, name: 'Tanvi Bhatt', broker: 'Angel One', accountId: 'AO2291', scaling: '0.5x', status: 'Paused', todayPnl: 0, totalPnl: 8100, trades: 0, lastActive: '2 days ago' },
  { id: 13, name: 'Nikhil Soni', broker: 'Groww', accountId: 'GR2198', scaling: '1x', status: 'Paused', todayPnl: 0, totalPnl: 12400, trades: 0, lastActive: '5 days ago' },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const ChildAccounts = () => {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Child Accounts</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">13 total, 2 paused</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-gradient-h px-5 py-3 text-sm font-semibold text-white shadow-btn-primary transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Invite Child
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
                {['#', 'Child Name', 'Broker', 'Account ID', 'Scaling', 'Status', 'Today P&L', 'Total P&L', 'Trades', 'Last Active', 'Actions'].map((header) => (
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
              {CHILD_ROWS.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                    index === 2 ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.id}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-brand-purple">{row.name}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-300">{row.broker}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.accountId}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.scaling}</td>
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
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 dark:text-foreground">{row.trades}</td>
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
                        <Pause className="h-3.5 w-3.5" />
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

export default ChildAccounts;
