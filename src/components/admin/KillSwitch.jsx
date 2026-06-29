import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle, Power } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const WHAT_IT_DOES = [
  'Instantly stops all new copy orders being placed on any child account',
  'Orders already executing are not cancelled',
  'A reason is required for every state change',
  'Every activation is recorded in the audit log',
  'Setting persists across server restarts',
];

const fmtTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const normalizeKillSwitchStatus = (payload = {}) => ({
  enabled: Boolean(payload?.enabled ?? payload?.kill_switch_active ?? payload?.killSwitchActive ?? payload?.halted),
  lastChangedBy: payload?.lastChangedBy || payload?.updatedBy || '-',
  lastChangedAt: payload?.lastChangedAt || payload?.updatedAt || null,
  reason: payload?.reason || payload?.kill_switch_reason || payload?.killSwitchReason || '',
});

const KillSwitch = () => {
  const { addToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.getKillSwitch()
      .then((settings) => setStatus(normalizeKillSwitchStatus(settings)))
      .catch((error) => addToast(error.message || 'Unable to load kill-switch status', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const halted = status?.enabled === true;

  const apply = async () => {
    setSubmitting(true);
    try {
      const nextEnabled = !halted;
      const result = await adminService.setKillSwitch(nextEnabled);
      setStatus({
        ...normalizeKillSwitchStatus(result),
        enabled: normalizeKillSwitchStatus(result).enabled ?? nextEnabled,
        lastChangedAt: normalizeKillSwitchStatus(result).lastChangedAt || new Date().toISOString(),
        reason: normalizeKillSwitchStatus(result).reason || reason.trim(),
      });
      setReason('');
      setConfirmOpen(false);
      addToast(nextEnabled ? 'Copy-trading halted platform-wide' : 'Copy-trading resumed', 'success');
    } catch (error) {
      addToast(error.message || 'Action failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canHalt = !halted && reason.trim().length > 0;

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

      {halted && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Platform Halted - no new copies are being placed
            </p>
            <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-500">
              Halted by {status.lastChangedBy} · {fmtTime(status.lastChangedAt)} · Reason: {status.reason || '-'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                halted ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
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
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <span className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${
                halted ? 'bg-rose-500' : 'bg-emerald-500'
              }`}>
                {halted ? 'Halted' : 'Active'}
              </span>
            )}
          </div>

          <div className="mb-6 divide-y divide-slate-100/70 dark:divide-white/[0.05]">
            {[
              ['Current Status', loading ? '...' : halted ? 'Halted' : 'Active'],
              ['Last Changed By', status?.lastChangedBy || '-'],
              ['Last Changed At', fmtTime(status?.lastChangedAt)],
              ['Reason on Record', status?.reason || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
                <span className="max-w-[60%] text-right font-semibold text-slate-700 dark:text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {!halted && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-muted-foreground">
                Reason (required before halting)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Broker outage detected - halting all copying"
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-black/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={loading || halted || !canHalt}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100/60 disabled:text-slate-400 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-600"
            >
              <Power className="h-4 w-4" />
              Halt Copying
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={loading || !halted}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100/60 disabled:text-slate-400 dark:disabled:bg-white/[0.04] dark:disabled:text-slate-600"
            >
              <Power className="h-4 w-4" />
              Resume Copying
            </button>
          </div>
          {!halted && !canHalt && !loading && (
            <p className="mt-2 text-center text-xs text-muted-foreground">Enter a reason to enable the halt button</p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-foreground">
            What this does
          </h2>
          <p className="mb-5 text-sm text-slate-400 dark:text-muted-foreground">
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
        </GlassCard>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title={halted ? 'Resume copy-trading?' : 'Halt copy-trading?'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {halted
              ? 'This will resume copy-trading across the entire platform. New master orders will start being copied to child accounts again.'
              : 'This will immediately stop all new copy orders on every child account platform-wide. Positions already open are not affected.'}
          </p>
          {!halted && (
            <div className="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
              <span className="text-xs text-muted-foreground">Reason</span>
              <p className="mt-0.5 font-medium">{reason.trim() || '-'}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="rounded-xl border border-border bg-black/5 px-4 py-2 text-sm font-medium hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                halted ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {halted ? 'Resume' : 'Halt now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KillSwitch;
