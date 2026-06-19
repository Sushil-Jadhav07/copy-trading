import { AlertTriangle, Link2, RefreshCw, RotateCcw, Unplug } from 'lucide-react';

const SUPPORTED_BROKERS = [
  'Zerodha',
  'Groww',
  'Upstox',
  'Dhan',
  'Fyers',
  'Angel One',
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const PlaceholderRow = ({ label }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
    <span className="font-semibold text-slate-400 dark:text-slate-600">—</span>
  </div>
);

const ActionButton = ({ icon: Icon, label }) => (
  <button
    type="button"
    disabled
    title="Not yet connected to backend"
    className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100/60 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/[0.04] dark:text-slate-600"
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const BrokerCard = ({ name }) => (
  <article className={`${panelClass} p-5`}>
    <div className="relative z-10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100/60 text-slate-400 dark:bg-white/[0.04] dark:text-slate-600">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-foreground">{name}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 dark:text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>—</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <PlaceholderRow label="Account" />
        <PlaceholderRow label="Token Expiry" />
        <PlaceholderRow label="Last Sync" />
        <PlaceholderRow label="Ping" />
      </div>

      <div className="my-5 h-px bg-slate-200/70 dark:bg-white/[0.06]" />

      <div className="grid grid-cols-3 gap-3">
        <ActionButton icon={RefreshCw} label="Refresh" />
        <ActionButton icon={RotateCcw} label="Reconnect" />
        <ActionButton icon={Unplug} label="Disconnect" />
      </div>
      <p className="mt-3 text-center text-xs text-slate-400 dark:text-muted-foreground">
        Not yet connected to backend
      </p>
    </div>
  </article>
);

const BrokerStatus = () => (
  <div className="space-y-6">
    <section>
      <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
        Broker Status
      </h1>
      <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
        Per-broker connection status, token expiry, and last sync details.
      </p>
    </section>

    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>
        Broker account status is not yet connected to a dedicated admin endpoint. All account,
        connectivity, token, sync, and ping fields show <span className="font-mono font-semibold">—</span>.
        Refresh, reconnect, and disconnect actions remain disabled until the backend is available.
      </span>
    </div>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {SUPPORTED_BROKERS.map((broker) => (
        <BrokerCard key={broker} name={broker} />
      ))}
    </section>
  </div>
);

export default BrokerStatus;
