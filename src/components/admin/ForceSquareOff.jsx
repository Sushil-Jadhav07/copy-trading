import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

// ADM-3: Force Square-Off
// Endpoint needed: POST /api/v1/admin/force-square-off
//   body: { targetId, scope: 'user' | 'master-group', confirmationText }
//   response: [{ positionId, symbol, status: 'success' | 'failed', reason }]
// The submit button is disabled until that endpoint is available.
//
// Positions preview passes real params to adminService.getPositions() — shows data if
// the backend supports ?masterId= / ?userId= filtering; otherwise shows empty state.

const CONFIRM_PHRASE = 'SQUARE OFF';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const ForceSquareOff = () => {
  const { addToast } = useToast();

  const [scope, setScope] = useState('user');
  const [masters, setMasters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);

  const [targetId, setTargetId] = useState('');
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const [confirmText, setConfirmText] = useState('');

  // Load master and user lists once
  useEffect(() => {
    setLoadingTargets(true);
    Promise.all([
      adminService.getUsers({ role: 'MASTER' }),
      adminService.getUsers(),
    ])
      .then(([mastersResp, allResp]) => {
        setMasters(mastersResp.users);
        setAllUsers(allResp.users.filter((u) => u.role !== 'Admin'));
      })
      .catch(() => addToast('Unable to load target list', 'error'))
      .finally(() => setLoadingTargets(false));
  }, []);

  // Reset target + positions when scope changes
  useEffect(() => {
    setTargetId('');
    setPositions([]);
    setConfirmText('');
  }, [scope]);

  // Fetch positions whenever a target is selected
  useEffect(() => {
    if (!targetId) {
      setPositions([]);
      return;
    }
    setLoadingPositions(true);
    const params = scope === 'master-group' ? { masterId: targetId } : { userId: targetId };
    adminService
      .getPositions(params)
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoadingPositions(false));
  }, [targetId, scope]);

  const targetOptions = useMemo(() => {
    const list = scope === 'master-group' ? masters : allUsers;
    return list.map((u) => ({ value: u.userId, label: `${u.name} (${u.email})` }));
  }, [scope, masters, allUsers]);

  const targetUser = useMemo(
    () => (scope === 'master-group' ? masters : allUsers).find((u) => u.userId === targetId),
    [targetId, scope, masters, allUsers],
  );

  const netPnl = useMemo(() => positions.reduce((s, p) => s + p.pnl, 0), [positions]);
  const confirmed = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
          Force Square-Off
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
          Emergency close of open copied positions for a user or an entire master-group.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-600 dark:text-rose-400">
        <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          The close action is disabled until{' '}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">
            POST /api/v1/admin/force-square-off
          </code>{' '}
          is implemented. The positions preview below uses the real positions API — it may be empty
          if the backend does not yet support filtering by target.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* ── Controls panel ── */}
        <GlassCard>
          <div className="space-y-5">
            {/* Scope toggle */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</p>
              <div className="flex gap-2">
                {[
                  { value: 'user', label: 'Single User' },
                  { value: 'master-group', label: 'Master + Children' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScope(opt.value)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                      scope === opt.value
                        ? 'bg-rose-500 text-white'
                        : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target selector */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Target {scope === 'master-group' ? 'Master' : 'User'}
              </p>
              <DivSelect
                value={targetId}
                onChange={setTargetId}
                placeholder={loadingTargets ? 'Loading…' : `Select ${scope === 'master-group' ? 'master' : 'user'}…`}
                disabled={loadingTargets}
                options={targetOptions}
                triggerClassName="w-full rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5"
              />
            </div>

            {/* Confirmation */}
            {targetId && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    This closes <strong>all open positions</strong> for{' '}
                    <strong>{targetUser?.name ?? '—'}</strong>
                    {scope === 'master-group' ? ' and all their child accounts' : ''}. This cannot be undone.
                  </span>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to enable the button
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    className="w-full rounded-xl border border-border bg-black/5 px-3 py-2 font-mono text-sm placeholder:text-muted-foreground/50 focus:border-rose-500 focus:outline-none dark:bg-white/5"
                  />
                </div>
              </div>
            )}

            {/* Submit — always disabled; confirmed state wired for when endpoint arrives */}
            <button
              type="button"
              disabled
              title="Not yet connected to backend"
              className={`w-full inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                confirmed && targetId
                  ? 'bg-rose-500/30 text-rose-400'
                  : 'bg-slate-100/60 text-slate-400 dark:bg-white/[0.04] dark:text-slate-600'
              }`}
            >
              <AlertOctagon className="h-4 w-4" />
              Initiate Square-Off
            </button>
            <p className="text-center text-xs text-muted-foreground">Not yet connected to backend</p>
          </div>
        </GlassCard>

        {/* ── Positions preview ── */}
        <GlassCard noPadding>
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Open Positions Preview</h2>
              <p className="text-xs text-muted-foreground">
                {targetId
                  ? `Showing positions for ${targetUser?.name ?? '—'}`
                  : 'Select a target to preview positions'}
              </p>
            </div>
            {positions.length > 0 && (
              <span
                className={`text-sm font-semibold ${netPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                Net P&L: {netPnl >= 0 ? '+' : ''}{fmt(netPnl)}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/[0.03] dark:bg-white/[0.03]">
                  {['Symbol', 'Side', 'Qty', 'Avg Price', 'LTP', 'Unrealised P&L', 'Broker', 'Children'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!targetId ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Select a target to preview open positions.
                    </td>
                  </tr>
                ) : loadingPositions ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Loading positions…
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No open positions found for this target.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => {
                    const isBuy = pos.side === 'BUY';
                    const positive = pos.pnl >= 0;
                    return (
                      <tr
                        key={pos.id}
                        className="border-b border-border/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">{pos.symbol}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              isBuy
                                ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {pos.side}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold">{pos.qty}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{fmt(pos.avgPrice)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{fmt(pos.ltp)}</td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${
                            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                          }`}
                        >
                          {positive ? '+' : ''}{fmt(pos.pnl)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{pos.broker}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-muted-foreground">{pos.children}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ForceSquareOff;
