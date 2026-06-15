import React from 'react';
import { Link2, RefreshCw, Unplug, RotateCcw } from 'lucide-react';

const BROKERS = [
  { id: 'zerodha', name: 'Zerodha', status: 'Connected', account: 'ZY1042', tokenExpiry: '6h 20m', lastSync: '2 seconds ago', ping: '42ms' },
  { id: 'groww', name: 'Groww', status: 'Connected', account: 'GR7821', tokenExpiry: '5h 45m', lastSync: '3 seconds ago', ping: '38ms' },
  { id: 'angel-one', name: 'Angel One', status: 'Connected', account: 'AO5821', tokenExpiry: '7h 10m', lastSync: '1 second ago', ping: '55ms' },
  { id: 'upstox', name: 'Upstox', status: 'Disconnected', account: 'UP3341', tokenExpiry: '—', lastSync: '2h ago', ping: '—' },
  { id: 'dhan', name: 'Dhan', status: 'Connected', account: 'DH2241', tokenExpiry: '4h 30m', lastSync: '4 seconds ago', ping: '48ms' },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const BrokerStatus = () => {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">Broker Connect</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">Admin broker access overview</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {BROKERS.map((broker) => {
          const connected = broker.status === 'Connected';

          return (
            <article
              key={broker.id}
              className={`${panelClass} p-5 ${!connected ? 'ring-1 ring-rose-500/25' : ''}`}
            >
              <div className="relative z-10">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      connected
                        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                    }`}>
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-foreground">{broker.name}</h2>
                      <div className={`mt-1 flex items-center gap-2 text-sm ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{broker.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    ['Account', broker.account],
                    ['Token Expiry', broker.tokenExpiry],
                    ['Last Sync', broker.lastSync],
                    ['Latency', broker.ping],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
                      <span className="font-semibold text-slate-900 dark:text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="my-5 h-px bg-slate-200/70 dark:bg-white/[0.06]" />

                <div className="grid grid-cols-2 gap-3">
                  {connected ? (
                    <>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-400"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-400"
                      >
                        <Unplug className="h-4 w-4" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-400"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default BrokerStatus;
