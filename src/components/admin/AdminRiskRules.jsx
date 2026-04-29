import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { useToast } from '@/components/shared/Toast';
import { AlertTriangle } from 'lucide-react';

// NOTE: Risk endpoints (/api/v1/risk/rules, /api/v1/admin/risk/rules/{userId}) are NOT
// documented in the integration spec. We lazy-import riskService and handle 404 / network
// errors gracefully so the page doesn't crash — it shows a warning banner instead.
// When the backend team adds these endpoints, this component will work automatically.

const inputClass =
  'w-full rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5';

const AdminRiskRules = () => {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    userId: '',
    maxTradesPerDay: '',
    maxOpenPositions: '',
    maxCapitalExposure: '',
    marginCheckEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  // Track whether the backend endpoints are available
  const [endpointAvailable, setEndpointAvailable] = useState(true);
  const [checkingEndpoint, setCheckingEndpoint] = useState(true);

  // Probe the endpoint on mount to give clear feedback
  useEffect(() => {
    const checkEndpoint = async () => {
      try {
        const { riskService } = await import('@/lib/risk');
        await riskService.getRules();
        setEndpointAvailable(true);
      } catch (err) {
        const status = err?.response?.status;
        // 404 / 501 = endpoint not implemented yet
        if (status === 404 || status === 501 || status === 405) {
          setEndpointAvailable(false);
        }
        // 401 / 403 = endpoint exists but auth issue — treat as available
      } finally {
        setCheckingEndpoint(false);
      }
    };
    checkEndpoint();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.userId.trim()) {
      addToast('Please enter a User ID', 'error');
      return;
    }
    setLoading(true);
    try {
      const { riskService } = await import('@/lib/risk');
      await riskService.setRulesForUser(form.userId, {
        maxTradesPerDay: Number(form.maxTradesPerDay),
        maxOpenPositions: Number(form.maxOpenPositions),
        maxCapitalExposure: Number(form.maxCapitalExposure),
        marginCheckEnabled: Boolean(form.marginCheckEnabled),
      });
      addToast('Risk rules updated successfully', 'success');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 501 || status === 405) {
        setEndpointAvailable(false);
        addToast('Risk rules endpoint is not available on the backend yet', 'error');
      } else {
        addToast(error.message || 'Failed to update risk rules', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Risk Rules</h1>
        <p className="text-sm text-muted-foreground">Apply per-user trading limits from the admin panel.</p>
      </div>

      {/* Warning banner if endpoint is not yet available */}
      {!checkingEndpoint && !endpointAvailable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Risk endpoint not yet available</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              The backend endpoint <code className="font-mono bg-black/5 dark:bg-white/5 px-1 rounded">/api/v1/admin/risk/rules</code> is
              not in the current integration spec. The form is ready and will work once the backend team adds this endpoint.
            </p>
          </div>
        </div>
      )}

      <GlassCard title="Set User Risk Rules">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              User ID
            </label>
            <input
              value={form.userId}
              onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
              className={inputClass}
              placeholder="Paste the user's UUID here"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Max Trades / Day
            </label>
            <input
              type="number"
              min="0"
              value={form.maxTradesPerDay}
              onChange={(event) => setForm((current) => ({ ...current, maxTradesPerDay: event.target.value }))}
              className={inputClass}
              placeholder="e.g. 50"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Max Open Positions
            </label>
            <input
              type="number"
              min="0"
              value={form.maxOpenPositions}
              onChange={(event) => setForm((current) => ({ ...current, maxOpenPositions: event.target.value }))}
              className={inputClass}
              placeholder="e.g. 10"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Capital Exposure %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.maxCapitalExposure}
              onChange={(event) => setForm((current) => ({ ...current, maxCapitalExposure: event.target.value }))}
              className={inputClass}
              placeholder="e.g. 80"
              required
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <ToggleSwitch
              checked={form.marginCheckEnabled}
              onChange={() => setForm((current) => ({ ...current, marginCheckEnabled: !current.marginCheckEnabled }))}
              label="Margin check"
              showStateText
              onText="enabled"
              offText="disabled"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading || (!checkingEndpoint && !endpointAvailable)}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Rules'}
            </button>
            {!checkingEndpoint && !endpointAvailable && (
              <p className="mt-2 text-xs text-muted-foreground">
                Button disabled — backend endpoint unavailable.
              </p>
            )}
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default AdminRiskRules;
