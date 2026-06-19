import { useState } from 'react';
import { AlertTriangle, Power } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

// ADM-1: Global Kill Switch
// Endpoints needed:
//   GET  /api/v1/admin/kill-switch  → { enabled: bool, lastChangedBy, lastChangedAt, reason }
//   POST /api/v1/admin/kill-switch  → body: { enable: bool, reason: string }
// Until those exist: status shows "Unknown", toggle is disabled, all metadata shows —.

const WHAT_IT_DOES = [
  'Instantly stops all new copy orders being placed on any child account',
  'Orders already executing are not cancelled',
  'A reason is required for every state change',
  'Every activation is recorded in the audit log',
  'Setting persists across server restarts',
];

const KillSwitch = () => {
  // reason field is wired up for when the endpoint becomes available
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Global Kill Switch
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Instantly halt all copy-trading platform-wide in an emergency.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Kill-switch toggle is disabled until{' '}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
            POST /api/v1/admin/kill-switch
          </code>{' '}
          and{' '}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
            GET /api/v1/admin/kill-switch
          </code>{' '}
          are implemented. Current state is unknown.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status + toggle card */}
        <GlassCard>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100/60 text-slate-400 dark:bg-white/[0.04] dark:text-slate-600">
                <Power className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-foreground">
                  Copy-Trading Status
                </h2>
                <p className="text-sm text-slate-400 dark:text-muted-foreground">
                  Platform-wide kill switch
                </p>
              </div>
            </div>
            <span className="rounded-full border border-slate-200/80 bg-slate-100/60 px-3 py-1 text-sm font-semibold text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500">
              Unknown
            </span>
          </div>

          <div className="mb-6 divide-y divide-slate-100/70 dark:divide-white/[0.05]">
            {[
              ['Current Status', 'Unknown'],
              ['Last Changed By', '—'],
              ['Last Changed At', '—'],
              ['Reason on Record', '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
                <span className="font-semibold text-slate-400 dark:text-slate-600">{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-muted-foreground">
              Reason (required before toggling)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broker outage detected — halting all copying"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-black/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand-purple dark:bg-white/5"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              title="Not yet connected to backend"
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100/60 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/[0.04] dark:text-slate-600"
            >
              <Power className="h-4 w-4" />
              Halt Copying
            </button>
            <button
              type="button"
              disabled
              title="Not yet connected to backend"
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100/60 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/[0.04] dark:text-slate-600"
            >
              <Power className="h-4 w-4" />
              Resume Copying
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-muted-foreground">
            Not yet connected to backend
          </p>
        </GlassCard>

        {/* Behaviour explanation */}
        <GlassCard>
          <h2 className="text-base font-semibold text-slate-900 dark:text-foreground mb-1">
            What this does
          </h2>
          <p className="text-sm text-slate-400 dark:text-muted-foreground mb-5">
            When activated, the kill switch immediately stops all new copy orders from being placed on
            any child account. Use this during a broker outage, runaway master, or any other emergency
            that requires a complete halt.
          </p>
          <ul className="space-y-3">
            {WHAT_IT_DOES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-500 dark:text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
                {item}
              </li>
            ))}
          </ul>

          {/* Halted banner — rendered here as a preview; shown for real when GET returns enabled: true */}
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/8 px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500 dark:text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Platform Halted (banner preview)
                </p>
                <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-500">
                  This banner will be shown site-wide when the kill switch is active. Reason and
                  who triggered it will appear here.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default KillSwitch;
