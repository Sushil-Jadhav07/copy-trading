import { useState } from 'react';
import { AlertTriangle, Bell, Mail, MessageCircle, Save } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';

// ADM-15: Admin Alerting
// UI shell only — no backend yet. Endpoints needed:
//   GET  /api/v1/admin/alerts                → { alerts: [{ id, event, severity, message, channel, sentAt, acknowledged }], total }
//   GET  /api/v1/admin/alerts/config         → { channels: { email: {enabled, recipients[]}, telegram: {enabled, chatIds[]} }, events: { brokerDisconnect, copyFailureSpike, killSwitch, abnormalLoss } }
//   PUT  /api/v1/admin/alerts/config         → body matches GET shape above, returns same
//   POST /api/v1/admin/alerts/{id}/acknowledge
// Backend: critical events (broker disconnect, large-scale copy failures, kill-switch
// activation, abnormal losses) should push into this within seconds — event-driven, not
// a polling cron — and persist so admin can review alert history later.
// Once endpoints exist: replace EVENT_TOGGLES local state with data from GET .../config,
// wire handleSaveConfig to PUT .../config, and replace the empty alerts table with data
// from GET .../alerts (same pagination pattern as AuditLog.jsx).

const EVENT_DEFINITIONS = [
  { key: 'brokerDisconnect', label: 'Broker disconnect', description: 'A broker session drops or a login expires unexpectedly.' },
  { key: 'copyFailureSpike', label: 'Large-scale copy failures', description: 'Failed/skipped copies cross a threshold in a short window.' },
  { key: 'killSwitch', label: 'Kill-switch activation', description: 'Any time the platform-wide kill-switch is turned on or off.' },
  { key: 'abnormalLoss', label: 'Abnormal losses', description: 'A master or child account shows an unusually large drawdown.' },
];

const AdminAlerts = () => {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [chatIds, setChatIds] = useState('');
  const [eventToggles, setEventToggles] = useState({
    brokerDisconnect: true,
    copyFailureSpike: true,
    killSwitch: true,
    abnormalLoss: false,
  });

  const toggleEvent = (key) =>
    setEventToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Admin Alerting
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Notify admins on critical platform events via email or Telegram.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Alerting is not yet connected to the backend. This screen previews the intended
          configuration and history layout — saving and live alerts require{' '}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
            GET/PUT /api/v1/admin/alerts/config
          </code>{' '}
          and{' '}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
            GET /api/v1/admin/alerts
          </code>
          .
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Channels ── */}
        <GlassCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Notification Channels</h2>
              <p className="text-xs text-muted-foreground">Where critical alerts get sent.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Email</p>
                </div>
                <ToggleSwitch checked={emailEnabled} onChange={() => setEmailEnabled((v) => !v)} showStateText />
              </div>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                disabled={!emailEnabled}
                placeholder="ops@ascentra.in, admin@ascentra.in"
                className="w-full rounded-xl border border-border bg-black/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
              />
              <p className="mt-1 text-xs text-muted-foreground">Comma-separated recipient addresses.</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Telegram</p>
                </div>
                <ToggleSwitch checked={telegramEnabled} onChange={() => setTelegramEnabled((v) => !v)} showStateText />
              </div>
              <input
                type="text"
                value={chatIds}
                onChange={(e) => setChatIds(e.target.value)}
                disabled={!telegramEnabled}
                placeholder="Telegram chat IDs, comma-separated"
                className="w-full rounded-xl border border-border bg-black/5 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
              />
            </div>

            <button
              type="button"
              disabled
              title="Not yet connected to backend"
              className="w-full inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100/60 px-4 py-3 text-sm font-semibold text-slate-400 dark:bg-white/[0.04] dark:text-slate-600"
            >
              <Save className="h-4 w-4" />
              Save Alert Settings
            </button>
            <p className="text-center text-xs text-muted-foreground">Not yet connected to backend</p>
          </div>
        </GlassCard>

        {/* ── Events ── */}
        <GlassCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Critical Events</h2>
              <p className="text-xs text-muted-foreground">Choose which events trigger an alert.</p>
            </div>
          </div>

          <div className="space-y-4">
            {EVENT_DEFINITIONS.map((event) => (
              <div key={event.key} className="flex items-start justify-between gap-4 rounded-xl bg-black/5 p-3 dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </div>
                <ToggleSwitch checked={eventToggles[event.key]} onChange={() => toggleEvent(event.key)} />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Alert history ── */}
      <GlassCard noPadding>
        <div className="border-b border-border/40 px-4 py-3">
          <h2 className="text-base font-semibold">Alert History</h2>
          <p className="mt-1 text-xs text-muted-foreground">Past alerts sent to admins, most recent first.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                {['Time', 'Event', 'Severity', 'Message', 'Channel', 'Acknowledged'].map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No data yet — awaiting backend integration
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default AdminAlerts;
