import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Save, Shield, SlidersHorizontal, UserCog } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { useToast } from '@/components/shared/Toast';
import { riskService } from '@/lib/risk';
import { adminService } from '@/lib/admin';

const DEFAULTS = {
  maxCapitalExposure: 80,
  maxTradesPerDay: 50,
  maxOpenPositions: 20,
  maxLotSize: 10,
  marginCheckEnabled: true,
};

const FIELDS = [
  { key: 'maxCapitalExposure', label: 'Max Capital Exposure (%)', min: 1, max: 100, suffix: '%' },
  { key: 'maxTradesPerDay', label: 'Daily Trade Cap', min: 1, max: 500, suffix: 'trades' },
  { key: 'maxOpenPositions', label: 'Max Open Positions', min: 1, max: 200, suffix: 'positions' },
  { key: 'maxLotSize', label: 'Max Lot Size', min: 1, max: 1000, suffix: 'lots' },
];

const clamp = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(max, Math.max(min, n));
};

const NumericField = ({ field, value, onChange }) => (
  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
    <label className="text-sm font-medium">{field.label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={field.min}
        max={field.max}
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="h-10 w-28 rounded-xl border border-border bg-black/5 px-3 text-right text-sm font-semibold tabular-nums focus:border-brand-purple focus:outline-none dark:bg-white/5"
      />
      <span className="w-16 text-xs text-muted-foreground">{field.suffix}</span>
    </div>
  </div>
);

const RiskLimits = () => {
  const { addToast } = useToast();

  const [globals, setGlobals] = useState({ ...DEFAULTS });
  const [loadingGlobals, setLoadingGlobals] = useState(true);
  const [savingGlobals, setSavingGlobals] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [overrides, setOverrides] = useState({ ...DEFAULTS });
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    setLoadingGlobals(true);
    adminService
      .getGlobalRiskSettings()
      .then((data) => {
        setGlobals({
          maxCapitalExposure: Number(data?.maxCapitalExposure ?? DEFAULTS.maxCapitalExposure),
          maxTradesPerDay: Number(data?.maxTradesPerDay ?? DEFAULTS.maxTradesPerDay),
          maxOpenPositions: Number(data?.maxOpenPositions ?? DEFAULTS.maxOpenPositions),
          maxLotSize: Number(data?.maxLotSize ?? DEFAULTS.maxLotSize),
          marginCheckEnabled: Boolean(data?.marginCheckEnabled ?? DEFAULTS.marginCheckEnabled),
        });
      })
      .catch(() => {
        addToast('Could not load current rules — using defaults', 'error');
      })
      .finally(() => setLoadingGlobals(false));

    setLoadingUsers(true);
    adminService
      .getUsers()
      .then(({ users: list }) => setUsers(list.filter((u) => u.role !== 'Admin')))
      .catch(() => addToast('Could not load user list', 'error'))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setOverrides({
        maxCapitalExposure: globals.maxCapitalExposure,
        maxTradesPerDay: globals.maxTradesPerDay,
        maxOpenPositions: globals.maxOpenPositions,
        maxLotSize: globals.maxLotSize,
        marginCheckEnabled: globals.marginCheckEnabled,
      });
      return;
    }
    
    riskService.getRulesForUser(selectedUserId)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setOverrides({
            maxCapitalExposure: Number(data.maxCapitalExposure ?? globals.maxCapitalExposure),
            maxTradesPerDay: Number(data.maxTradesPerDay ?? globals.maxTradesPerDay),
            maxOpenPositions: Number(data.maxOpenPositions ?? globals.maxOpenPositions),
            maxLotSize: Number(data.maxLotSize ?? globals.maxLotSize),
            marginCheckEnabled: Boolean(data.marginCheckEnabled ?? globals.marginCheckEnabled),
          });
        } else {
          // If no custom rules, fallback to globals
          setOverrides({
            maxCapitalExposure: globals.maxCapitalExposure,
            maxTradesPerDay: globals.maxTradesPerDay,
            maxOpenPositions: globals.maxOpenPositions,
            maxLotSize: globals.maxLotSize,
            marginCheckEnabled: globals.marginCheckEnabled,
          });
        }
      })
      .catch(() => {
        addToast('Failed to load user overrides', 'error');
        setOverrides({
          maxCapitalExposure: globals.maxCapitalExposure,
          maxTradesPerDay: globals.maxTradesPerDay,
          maxOpenPositions: globals.maxOpenPositions,
          maxLotSize: globals.maxLotSize,
          marginCheckEnabled: globals.marginCheckEnabled,
        });
      });
  }, [selectedUserId, globals]);

  const updateGlobal = (key, value) =>
    setGlobals((prev) => ({ ...prev, [key]: key === 'marginCheckEnabled' ? value : value }));

  const updateOverride = (key, value) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  const validate = (values) => {
    for (const f of FIELDS) {
      const clamped = clamp(values[f.key], f.min, f.max);
      if (clamped === null) {
        addToast(`${f.label} must be a positive number between ${f.min} and ${f.max}`, 'error');
        return null;
      }
    }
    return {
      maxCapitalExposure: clamp(values.maxCapitalExposure, 1, 100),
      maxTradesPerDay: clamp(values.maxTradesPerDay, 1, 500),
      maxOpenPositions: clamp(values.maxOpenPositions, 1, 200),
      maxLotSize: clamp(values.maxLotSize, 1, 1000),
      marginCheckEnabled: Boolean(values.marginCheckEnabled),
    };
  };

  const saveGlobals = async () => {
    const payload = validate(globals);
    if (!payload) return;
    setSavingGlobals(true);
    try {
      await adminService.saveGlobalRiskSettings(payload);
      addToast('Global limits updated successfully', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to update globals', 'error');
    } finally {
      setSavingGlobals(false);
    }
  };

  const saveOverride = async () => {
    if (!selectedUserId) {
      addToast('Select a user first', 'error');
      return;
    }
    const payload = validate(overrides);
    if (!payload) return;
    setSavingOverride(true);
    try {
      await riskService.setRulesForUser(selectedUserId, payload);
      const user = users.find((u) => u.userId === selectedUserId);
      addToast(`Override saved for ${user?.name || selectedUserId}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save override', 'error');
    } finally {
      setSavingOverride(false);
    }
  };

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.userId, label: `${u.name} (${u.email})` })),
    [users],
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Risk Limit Configuration
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Set platform-wide default risk limits and per-user overrides.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Section A: Global Default Limits ── */}
        <GlassCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Global Default Limits</h2>
              <p className="text-xs text-muted-foreground">Applies to all users unless overridden.</p>
            </div>
          </div>

          {loadingGlobals ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading current rules…
            </div>
          ) : (
            <div className="space-y-4">
              {FIELDS.map((f) => (
                <NumericField
                  key={f.key}
                  field={f}
                  value={globals[f.key]}
                  onChange={updateGlobal}
                />
              ))}

              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-sm font-medium">Margin Check</p>
                  <p className="text-xs text-muted-foreground">Validate broker margin before every copy.</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(globals.marginCheckEnabled)}
                  onChange={() => updateGlobal('marginCheckEnabled', !globals.marginCheckEnabled)}
                  showStateText
                />
              </div>

              <button
                onClick={saveGlobals}
                disabled={savingGlobals}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingGlobals ? 'Saving…' : 'Save Global Limits'}
              </button>
            </div>
          )}
        </GlassCard>

        {/* ── Section B: Per-User Override ── */}
        <GlassCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Per-User Override</h2>
              <p className="text-xs text-muted-foreground">Override global defaults for a specific user.</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select User</p>
            <DivSelect
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder={loadingUsers ? 'Loading users…' : 'Choose a user…'}
              disabled={loadingUsers}
              options={userOptions}
              triggerClassName="w-full rounded-xl border border-border bg-black/5 px-3 py-2.5 text-sm dark:bg-white/5"
            />
          </div>

          {!selectedUserId ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a user to configure their risk overrides.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {FIELDS.map((f) => (
                <NumericField
                  key={f.key}
                  field={f}
                  value={overrides[f.key]}
                  onChange={updateOverride}
                />
              ))}

              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-sm font-medium">Margin Check</p>
                  <p className="text-xs text-muted-foreground">Override margin check for this user.</p>
                </div>
                <ToggleSwitch
                  checked={Boolean(overrides.marginCheckEnabled)}
                  onChange={() => updateOverride('marginCheckEnabled', !overrides.marginCheckEnabled)}
                  showStateText
                />
              </div>

              <button
                onClick={saveOverride}
                disabled={savingOverride}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingOverride ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default RiskLimits;
