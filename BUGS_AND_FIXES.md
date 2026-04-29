# Ascentra Copy Trading — Bug Diagnosis & Fix Guide

---

## Summary of Problems Found

You reported 3 main issues:
1. **No clear reason shown why trades are not being placed**
2. **Positions tab is empty (Master & Child)**
3. **Orders tab is empty (Master & Child)**

After reading all your source files and comparing them with your API docs, here are the **root causes** and **exact fixes** for each.

---

## BUG 1 — Positions & Orders Tabs Are Empty

### Root Cause: Session Check Is Blocking Data

In both `OpenPositions.jsx` and `OrderBook.jsx`, there is this logic:

```js
const statusData = await brokerService.getAccountStatus(accountId);
const isActive =
  statusData?.sessionActive === true ||
  String(statusData?.status || '').toUpperCase() === 'ACTIVE' ||
  String(statusData?.sessionStatus || '').toUpperCase() === 'SESSION_ACTIVE';

if (!isActive) {
  setPositions([]); // ← STOPS HERE, shows empty table
  return;
}
```

Your API doc says `/api/v1/brokers/accounts/{id}/status` returns:
```json
{ "accountId": "...", "status": "ACTIVE", "sessionActive": true, "broker": "GROWW", ... }
```

**The status field name from your API is `status`, NOT `sessionStatus`.** The code checks `sessionStatus` which will always be `undefined`. It only succeeds if `sessionActive === true` (boolean) is returned.

**If your backend returns `"sessionActive": "true"` (string) or `"status": "SESSION_ACTIVE"` instead of `"ACTIVE"`, the check silently fails, data is never fetched, and the table shows empty.**

### Fix for OpenPositions.jsx and OrderBook.jsx

Replace the `isActive` check in both files. Find this block:
```js
const isActive =
  statusData?.sessionActive === true ||
  String(statusData?.status || '').toUpperCase() === 'ACTIVE' ||
  String(statusData?.sessionStatus || '').toUpperCase() === 'SESSION_ACTIVE';
```

Replace with:
```js
// Handles: boolean true, string "true", status "ACTIVE", "SESSION_ACTIVE", "CONNECTED"
const parseActive = (v) => {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const u = v.trim().toUpperCase();
    return ['TRUE', '1', 'ACTIVE', 'SESSION_ACTIVE', 'CONNECTED', 'LOGGED_IN', 'AUTHORIZED'].includes(u);
  }
  return false;
};
const isActive =
  parseActive(statusData?.sessionActive) ||
  parseActive(statusData?.isSessionActive) ||
  parseActive(statusData?.status) ||
  parseActive(statusData?.sessionStatus) ||
  parseActive(statusData?.connectionHealth);
```

**Also add a fallback** — if the status endpoint itself throws an error (e.g. 404, 500), don't block data. Change:
```js
try {
  const statusData = await brokerService.getAccountStatus(accountId);
  // ...
  if (!isActive) {
    setPositions([]);
    return;  // ← This is too aggressive — blocks even on temp errors
  }
```

To:
```js
let isActive = false;
try {
  const statusData = await brokerService.getAccountStatus(accountId);
  // ... (use the new parseActive logic above)
  isActive = parseActive(statusData?.sessionActive) || parseActive(statusData?.status);
} catch {
  // Status check failed — still attempt to fetch positions (degrade gracefully)
  isActive = true; // Let the positions call tell us if we're actually unauthorized
}
```

---

## BUG 2 — Child "Copied Trades" Tab Shows No Instrument/Symbol

### Root Cause: API Response Has No `instrument` Field

In `normalizeCopiedTrade` (in `lib/child.js`):
```js
instrument: raw.instrument || raw.symbol || raw.tradingSymbol || raw.reference || 'N/A',
```

Your API doc for `GET /api/v1/child/copied-trades` says it returns:
```json
{ "id", "master", "instrument", "type", "masterQty", "myQty", "pnl", "time", "status" }
```

The field IS `instrument` — so it should work. **BUT** the table in `CopiedTrades.jsx` does NOT show an instrument column at all! The table headers are:
```
#  |  Type  |  Status  |  Broker  |  Reference / Order ID  |  Message  |  Time
```

**The instrument/symbol column is completely missing from the table.** A user looking at copied trades has no idea which stock/F&O was traded.

### Fix for CopiedTrades.jsx

In the table header array, add `'Instrument'` and render the cell:

```jsx
// Change headers from:
{['#', 'Type', 'Status', 'Broker', 'Reference / Order ID', 'Message', 'Time'].map(...)}

// To:
{['#', 'Instrument', 'Side', 'Type', 'Status', 'Broker', 'Reference / Order ID', 'Message', 'Time'].map(...)}
```

And add the cell in the `<tbody>` rows (after the `#` column):
```jsx
{/* Instrument */}
<td className="px-4 py-3 text-sm font-semibold">
  {trade.instrument !== 'N/A' ? trade.instrument : trade.reference || '—'}
</td>

{/* Side (BUY/SELL from masterQty sign or API) */}
<td className="px-4 py-3">
  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
    trade.type === 'BUY'
      ? 'bg-success/20 text-success border-success/30'
      : trade.type === 'SELL'
      ? 'bg-danger/20 text-danger border-danger/30'
      : 'bg-brand-purple/20 text-brand-purple border-brand-purple/30'
  }`}>
    {trade.type}
  </span>
</td>
```

Also update `colSpan` from `7` to `9` in the empty state row.

---

## BUG 3 — Why Trades Are Not Being Placed (No Feedback to User)

### Root Cause: Copy Engine Errors Are Silent

When the copy engine fails to place a trade on a child's broker, the error goes to the **Logs tab** only — but there is no visible dashboard-level alert that explains WHY trades failed.

The main causes (from your API doc) are:

| Cause | What Happens |
|-------|-------------|
| Child broker session expired | Engine gets 401 from child's broker, logs FAILED |
| Master has no active account set | Engine doesn't know which account to poll |
| Polling is OFF | Engine never detects the master's trade |
| Child subscription status is PAUSED | Engine skips the child intentionally |
| Scaling factor = 0 | Engine calculates 0 qty and rejects |
| Child has insufficient margin | Broker rejects the order |

### Fix — Add a "Why No Trades?" Banner to Copy Trading Page

In `CopyTrading.jsx`, after the Engine Status card, add a diagnostic section. Here's the logic to add:

```jsx
// Add this derived value near other `useMemo` calls:
const tradeBlockers = useMemo(() => {
  const issues = [];
  if (!masterConnected) {
    issues.push({ severity: 'error', msg: 'No master account connected — engine has nothing to poll.' });
  }
  if (masterConnected && !pollingEnabled) {
    issues.push({ severity: 'warning', msg: 'Auto-polling is OFF. Enable it so the engine detects your master\'s trades.' });
  }
  if (linkedRows.length === 0) {
    issues.push({ severity: 'warning', msg: 'No child accounts linked. Link at least one child to start copying.' });
  }
  linkedRows.forEach((child) => {
    if (child.status === 'PAUSED') {
      issues.push({ severity: 'info', msg: `Child "${child.nickname || child.userId}" is PAUSED — their trades won't be copied until resumed.` });
    }
    if (child.margin < 5000) {
      issues.push({ severity: 'error', msg: `Child "${child.nickname || child.userId}" has very low margin (₹${child.margin}) — orders may be rejected by the broker.` });
    }
    if (!child.brokerAccountId) {
      issues.push({ severity: 'error', msg: `Child "${child.nickname || child.userId}" has no broker account linked — cannot place trades.` });
    }
  });
  return issues;
}, [masterConnected, pollingEnabled, linkedRows]);
```

Then render it above the linked children table:

```jsx
{tradeBlockers.length > 0 && (
  <GlassCard>
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      Why Trades May Not Be Copying
    </p>
    <div className="space-y-2">
      {tradeBlockers.map((issue, idx) => (
        <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
          issue.severity === 'error'
            ? 'bg-danger/8 border-danger/20 text-danger'
            : issue.severity === 'warning'
            ? 'bg-amber-500/8 border-amber-500/20 text-amber-500'
            : 'bg-brand-blue/8 border-brand-blue/20 text-brand-blue'
        }`}>
          <span className="font-bold shrink-0">
            {issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <span>{issue.msg}</span>
        </div>
      ))}
    </div>
  </GlassCard>
)}
```

---

## BUG 4 — Master's `useMasterSubscriptions` Calls Wrong Endpoint

### Root Cause

In `useMaster.js`:
```js
export const useMasterSubscriptions = () => {
  const { user } = useAuth();
  // ...
  const masterId = user?.userId || user?.id;
  if (!masterId) {
    setSubscriptions([]);
    return;  // ← If user object is delayed/loading, returns empty immediately
  }
  setSubscriptions(await masterService.getSubscriptionsByMaster(masterId));
```

And `getSubscriptionsByMaster` in `master.js` calls `GET /api/v1/master/children` — which is correct. BUT if `user` is null when the hook mounts (auth context still loading), it returns empty and never retries.

### Fix for useMaster.js

```js
export const useMasterSubscriptions = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Don't gate on masterId — the API uses the Bearer token for identity
      setSubscriptions(await masterService.getSubscriptionsByMaster(null));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []); // ← Remove user dependency so it loads unconditionally

  useEffect(() => {
    load();
  }, [load]);

  return { subscriptions, loading, error, refetch: load };
};
```

---

## BUG 5 — Child Overview: "Portfolio Value" Always 0

### Root Cause

`useChildAnalytics` fetches `GET /api/v1/child/analytics`. Your API doc says it returns:
```json
{ "totalPnl", "copiedTrades", "failedReplications", "winRate", "activeMasters", "pnlHistory" }
```

Notice: **`portfolioValue` is NOT in the API response.** The normalizer tries to read `raw.portfolioValue` which will always be `undefined → 0`.

### Fix

In `lib/child.js`, `normalizeChildAnalytics`, replace:
```js
portfolioValue: toNumber(raw.portfolioValue),
```

With a derived value:
```js
// API doesn't return portfolioValue, derive from totalPnl or show 0
portfolioValue: toNumber(raw.portfolioValue, raw.portfolioAmount, raw.totalAssets),
```

And in `child/Overview.jsx`, show `totalPnl` as the primary metric instead of `portfolioValue` since the API doesn't provide it:
```jsx
// Change:
<StatCard title="Portfolio Value" value={analytics.portfolioValue || 0} prefix="₹" ... />

// To:
<StatCard title="Total Copied P&L" value={analytics.totalPnl || 0} prefix="₹" isCurrency ... />
```

---

## BUG 6 — Child Overview: "Masters Copied" Shows Wrong Count

In `child/Overview.jsx`:
```js
value={analytics.activeMasters || subscriptions.length}
```

Your API returns `activeMasters` directly. But `subscriptions` is fetched separately and may not be loaded yet, causing a flash of wrong numbers.

### Fix
```js
value={analytics.activeMasters ?? subscriptions.filter(s => s.status === 'ACTIVE').length}
```

---

## Quick Checklist Before Testing

Go through this checklist to confirm the underlying setup is correct:

1. **Master must set Active Account first**
   - Go to Copy Trading → Master Account → Select your broker → Click Connect
   - Verify the "Active Trading Account" banner appears at the top

2. **Polling must be ON**
   - In Copy Trading → Engine Status → Auto-poll toggle must be GREEN
   - If OFF, the engine never detects master trades

3. **Child must have an active broker session**
   - Child must have gone to Demat Accounts, selected their broker, and clicked Connect/Login
   - Session expires daily — child must re-login each day

4. **Child must be in ACTIVE status (not PAUSED)**
   - In Copy Trading table, check the "Trading" column — must show ACTIVE (green)

5. **Positions & Orders appearing empty?**
   - Apply Bug 1 fix above (session check too strict)
   - Also try: Go to Demat Accounts → find the account → click "Connect" to refresh the session

6. **No instrument shown in Copied Trades?**
   - Apply Bug 2 fix — add Instrument column to the table

---

## Files to Change (Summary)

| File | What to Fix |
|------|-------------|
| `src/components/master/OpenPositions.jsx` | Broaden session `isActive` check (Bug 1) |
| `src/components/master/OrderBook.jsx` | Broaden session `isActive` check (Bug 1) |
| `src/components/child/CopiedTrades.jsx` | Add Instrument + Side columns (Bug 2) |
| `src/components/master/CopyTrading.jsx` | Add "Why trades not copying" diagnostic banner (Bug 3) |
| `src/hooks/useMaster.js` | Remove user guard in `useMasterSubscriptions` (Bug 4) |
| `src/lib/child.js` | Fix `portfolioValue` derivation (Bug 5) |
| `src/components/child/Overview.jsx` | Fix activeMasters count + label (Bug 6) |
