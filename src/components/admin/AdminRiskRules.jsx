import React, { useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { riskService } from '@/lib/risk';
import { useToast } from '@/components/shared/Toast';

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await riskService.setRulesForUser(form.userId, {
        maxTradesPerDay: Number(form.maxTradesPerDay),
        maxOpenPositions: Number(form.maxOpenPositions),
        maxCapitalExposure: Number(form.maxCapitalExposure),
        marginCheckEnabled: Boolean(form.marginCheckEnabled),
      });
      addToast('Risk rules updated', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Risk Rules</h1>
        <p className="text-sm text-muted-foreground">Apply per-user limits from the admin panel.</p>
      </div>

      <GlassCard title="Set User Risk Rules">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</label>
            <input value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max Trades / Day</label>
            <input type="number" min="0" value={form.maxTradesPerDay} onChange={(event) => setForm((current) => ({ ...current, maxTradesPerDay: event.target.value }))} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max Open Positions</label>
            <input type="number" min="0" value={form.maxOpenPositions} onChange={(event) => setForm((current) => ({ ...current, maxOpenPositions: event.target.value }))} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capital Exposure %</label>
            <input type="number" min="0" max="100" value={form.maxCapitalExposure} onChange={(event) => setForm((current) => ({ ...current, maxCapitalExposure: event.target.value }))} className={inputClass} required />
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
            <button type="submit" disabled={loading} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default AdminRiskRules;
