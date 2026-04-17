# Ascentra Copy Trading — Codex Integration Prompt

> **Purpose:** Integrate all new API endpoints (Trade Engine, Copy Engine, Risk Engine, P&L Engine, Logs, WebSocket) into the existing React frontend codebase. Follow existing code conventions exactly.

---

## Project Context

- **Base URL:** `https://copy-trading-production-3981.up.railway.app`
- **Framework:** React + Vite, TailwindCSS, React Router v6
- **API layer:** `src/lib/api.js` — axios instance with Bearer token auto-injection and refresh-token interceptor
- **Existing lib files:** `src/lib/auth.js`, `src/lib/broker.js`, `src/lib/master.js`, `src/lib/child.js`, `src/lib/admin.js`, `src/lib/notifications.js`, `src/lib/copyLogs.js`
- **Hooks pattern:** `src/hooks/useMaster.js`, `src/hooks/useBroker.js`, `src/hooks/useChild.js`
- **Router:** `src/router/AppRouter.jsx`
- **Sidebar nav:** `src/components/shared/Sidebar.jsx`

All new lib functions must export a named service object (e.g., `export const tradeService = { ... }`) matching the existing pattern. All API calls use the `api` default import from `@/lib/api`.

---

## TASK 1 — Create `src/lib/trades.js`

Create a new file `src/lib/trades.js` with the following service object. Follow the exact pattern of `src/lib/master.js` (use `getErrorMessage`, normalize raw responses, always `throw` on error).

```js
import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const tradeService = {

  // POST /api/v1/trades/execute
  // body: { brokerAccountId, instrument, exchange, segment, orderType, transactionType, quantity, price, product, validity }
  // Returns: { tradeId, brokerOrderId, status, replicationsTriggered, replicationDetails }
  executeTrade: async (body) => {
    try {
      const res = await api.post('/api/v1/trades/execute', body);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to execute trade'));
    }
  },

  // GET /api/v1/trades?status=EXECUTED
  listTrades: async (params = {}) => {
    try {
      const res = await api.get('/api/v1/trades', { params });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.trades) ? raw.trades : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch trades'));
    }
  },

  // GET /api/v1/trades/{tradeId}
  getTradeDetail: async (tradeId) => {
    try {
      const res = await api.get(`/api/v1/trades/${tradeId}`);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch trade detail'));
    }
  },

  // DELETE /api/v1/trades/{tradeId}/cancel
  cancelTrade: async (tradeId) => {
    try {
      const res = await api.delete(`/api/v1/trades/${tradeId}/cancel`);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to cancel trade'));
    }
  },

  // GET /api/v1/trades/{tradeId}/replications
  getTradeReplications: async (tradeId) => {
    try {
      const res = await api.get(`/api/v1/trades/${tradeId}/replications`);
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.replications) ? raw.replications : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch replications'));
    }
  },

  // GET /api/v1/trades/open-positions?brokerAccountId=uuid
  getOpenPositions: async (brokerAccountId) => {
    try {
      const res = await api.get('/api/v1/trades/open-positions', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.positions) ? raw.positions : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch open positions'));
    }
  },

  // POST /api/v1/trades/basket
  // body: { brokerAccountId, basketName, orders: [{ instrument, transactionType, quantity, orderType, product }] }
  placeBasketOrder: async (body) => {
    try {
      const res = await api.post('/api/v1/trades/basket', body);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to place basket order'));
    }
  },
};
```

---

## TASK 2 — Create `src/lib/engine.js`

```js
import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const engineService = {

  // POST /api/v1/engine/copy-trade  (Master only)
  // body: { symbol, qty, side, product, orderType, price }
  // Returns: { message, symbol, side, masterQty, childrenTotal, success, failed, results }
  manualCopyTrade: async (body) => {
    try {
      const res = await api.post('/api/v1/engine/copy-trade', body);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to copy trade'));
    }
  },

  // GET /api/v1/engine/status
  // Returns: { engineStatus, pollingEnabled, pollingIntervalSeconds, supportedBrokers, modes }
  getStatus: async () => {
    try {
      const res = await api.get('/api/v1/engine/status');
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch engine status'));
    }
  },

  // POST /api/v1/engine/polling  body: { enabled: boolean }
  togglePolling: async (enabled) => {
    try {
      const res = await api.post('/api/v1/engine/polling', { enabled });
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to toggle polling'));
    }
  },

  // POST /api/v1/engine/polling/reset
  resetPollingCache: async () => {
    try {
      const res = await api.post('/api/v1/engine/polling/reset');
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to reset polling cache'));
    }
  },
};
```

---

## TASK 3 — Create `src/lib/risk.js`

```js
import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const riskService = {

  // GET /api/v1/risk/rules
  // Returns: { maxTradesPerDay, maxOpenPositions, maxCapitalExposure, marginCheckEnabled }
  getRules: async () => {
    try {
      const res = await api.get('/api/v1/risk/rules');
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch risk rules'));
    }
  },

  // GET /api/v1/risk/exposure
  // Returns: { currentOpenPositions, maxOpenPositions, tradesToday, maxTradesPerDay, capitalExposurePct }
  getExposure: async () => {
    try {
      const res = await api.get('/api/v1/risk/exposure');
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch risk exposure'));
    }
  },

  // GET /api/v1/risk/margin-check?brokerAccountId=&instrument=&quantity=&orderType=
  checkMargin: async ({ brokerAccountId, instrument, quantity, orderType }) => {
    try {
      const res = await api.get('/api/v1/risk/margin-check', {
        params: { brokerAccountId, instrument, quantity, orderType },
      });
      return res.data?.data || res.data;
      // Returns: { sufficient, requiredMargin, availableMargin, shortfall }
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Margin check failed'));
    }
  },

  // PUT /api/v1/admin/risk/rules/{userId}  (Admin only)
  setRulesForUser: async (userId, body) => {
    try {
      const res = await api.put(`/api/v1/admin/risk/rules/${userId}`, body);
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to set risk rules'));
    }
  },
};
```

---

## TASK 4 — Create `src/lib/pnl.js`

```js
import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const pnlService = {

  // GET /api/v1/pnl/realized?from=YYYY-MM-DD&to=YYYY-MM-DD
  getRealizedPnl: async ({ from, to } = {}) => {
    try {
      const res = await api.get('/api/v1/pnl/realized', { params: { from, to } });
      return res.data?.data || res.data;
      // Returns: { realizedPnl, trades }
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch realized P&L'));
    }
  },

  // GET /api/v1/pnl/unrealized?brokerAccountId=uuid
  getUnrealizedPnl: async (brokerAccountId) => {
    try {
      const res = await api.get('/api/v1/pnl/unrealized', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      return res.data?.data || res.data;
      // Returns: { unrealizedPnl, positions }
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch unrealized P&L'));
    }
  },

  // GET /api/v1/pnl/summary?period=DAILY|WEEKLY|MONTHLY
  getSummary: async (period = 'DAILY') => {
    try {
      const res = await api.get('/api/v1/pnl/summary', { params: { period } });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.summary) ? raw.summary : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch P&L summary'));
    }
  },

  // GET /api/v1/pnl/child-vs-master?masterId=uuid
  getChildVsMaster: async (masterId) => {
    try {
      const res = await api.get('/api/v1/pnl/child-vs-master', {
        params: masterId ? { masterId } : {},
      });
      return res.data?.data || res.data;
      // Returns: { masterPnl, childPnl, replicationAccuracy, failedReplications }
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch child vs master P&L'));
    }
  },

  // GET /api/v1/admin/pnl/all  (Admin only)
  getAllPnl: async () => {
    try {
      const res = await api.get('/api/v1/admin/pnl/all');
      return res.data?.data || res.data;
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch platform P&L'));
    }
  },
};
```

---

## TASK 5 — Create `src/lib/logs.js`

```js
import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const logsService = {

  // GET /api/v1/logs/trades
  getUserTradeLogs: async () => {
    try {
      const res = await api.get('/api/v1/logs/trades');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch trade logs'));
    }
  },

  // GET /api/v1/logs/broker-errors?brokerAccountId=uuid
  getBrokerErrors: async (brokerAccountId) => {
    try {
      const res = await api.get('/api/v1/logs/broker-errors', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch broker error logs'));
    }
  },

  // GET /api/v1/admin/logs/trades?userId=&status=  (Admin only)
  adminTradeLogs: async (params = {}) => {
    try {
      const res = await api.get('/api/v1/admin/logs/trades', { params });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch admin trade logs'));
    }
  },

  // GET /api/v1/admin/logs/system  (Admin only)
  // Returns: { logs: [{ level, service, message, freeMemoryMB, totalMemoryMB }] }
  adminSystemLogs: async () => {
    try {
      const res = await api.get('/api/v1/admin/logs/system');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch system logs'));
    }
  },

  // GET /api/v1/admin/logs/broker-errors?brokerId=ZERODHA  (Admin only)
  adminBrokerErrors: async (brokerId) => {
    try {
      const res = await api.get('/api/v1/admin/logs/broker-errors', {
        params: brokerId ? { brokerId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (e) {
      throw new Error(getErrorMessage(e, 'Failed to fetch admin broker error logs'));
    }
  },
};
```

---

## TASK 6 — Create `src/hooks/useTradeEngine.js`

Create a custom hook that wraps `tradeService` and `engineService`. Follow the pattern of `src/hooks/useMaster.js` — use `useState`, `useCallback`, expose `loading`, `error`, and action functions.

```js
import { useState, useCallback } from 'react';
import { tradeService } from '@/lib/trades';
import { engineService } from '@/lib/engine';

export const useTradeEngine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trades, setTrades] = useState([]);
  const [engineStatus, setEngineStatus] = useState(null);

  const executeTrade = useCallback(async (body) => {
    setLoading(true); setError(null);
    try {
      const result = await tradeService.executeTrade(body);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrades = useCallback(async (params) => {
    setLoading(true); setError(null);
    try {
      const data = await tradeService.listTrades(params);
      setTrades(data);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelTrade = useCallback(async (tradeId) => {
    setLoading(true); setError(null);
    try {
      return await tradeService.cancelTrade(tradeId);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEngineStatus = useCallback(async () => {
    try {
      const data = await engineService.getStatus();
      setEngineStatus(data);
      return data;
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const manualCopyTrade = useCallback(async (body) => {
    setLoading(true); setError(null);
    try {
      return await engineService.manualCopyTrade(body);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePolling = useCallback(async (enabled) => {
    try {
      return await engineService.togglePolling(enabled);
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, []);

  return {
    loading,
    error,
    trades,
    engineStatus,
    executeTrade,
    fetchTrades,
    cancelTrade,
    fetchEngineStatus,
    manualCopyTrade,
    togglePolling,
  };
};
```

---

## TASK 7 — Create `src/hooks/useRiskPnl.js`

```js
import { useState, useCallback } from 'react';
import { riskService } from '@/lib/risk';
import { pnlService } from '@/lib/pnl';

export const useRiskPnl = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskRules, setRiskRules] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [pnlSummary, setPnlSummary] = useState([]);

  const fetchRiskRules = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await riskService.getRules();
      setRiskRules(data);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExposure = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await riskService.getExposure();
      setExposure(data);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkMargin = useCallback(async (params) => {
    setLoading(true); setError(null);
    try {
      return await riskService.checkMargin(params);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPnlSummary = useCallback(async (period = 'DAILY') => {
    setLoading(true); setError(null);
    try {
      const data = await pnlService.getSummary(period);
      setPnlSummary(data);
      return data;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealizedPnl = useCallback(async (params) => {
    setLoading(true); setError(null);
    try {
      return await pnlService.getRealizedPnl(params);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnrealizedPnl = useCallback(async (brokerAccountId) => {
    setLoading(true); setError(null);
    try {
      return await pnlService.getUnrealizedPnl(brokerAccountId);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChildVsMaster = useCallback(async (masterId) => {
    setLoading(true); setError(null);
    try {
      return await pnlService.getChildVsMaster(masterId);
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    riskRules,
    exposure,
    pnlSummary,
    fetchRiskRules,
    fetchExposure,
    checkMargin,
    fetchPnlSummary,
    fetchRealizedPnl,
    fetchUnrealizedPnl,
    fetchChildVsMaster,
  };
};
```

---

## TASK 8 — Create `src/lib/websocket.js`

Create a WebSocket utility that wraps the live channels. Pattern: singleton connections per channel, event-based callbacks.

```js
// WebSocket channels:
// ws://copy-trading-production-3981.up.railway.app/ws/{channel}?token=JWT
// Channels: trades | positions | pnl | notifications

import { getAccessToken } from '@/lib/api';

const WS_BASE = 'wss://copy-trading-production-3981.up.railway.app/ws';

const connections = {};

/**
 * Connect to a WebSocket channel.
 * @param {'trades'|'positions'|'pnl'|'notifications'} channel
 * @param {(event: string, data: any) => void} onMessage
 * @param {() => void} [onOpen]
 * @param {(err: Event) => void} [onError]
 * @returns {{ close: () => void }}
 */
export const connectChannel = (channel, onMessage, onOpen, onError) => {
  // Close existing connection for this channel
  if (connections[channel]) {
    connections[channel].close();
    delete connections[channel];
  }

  const token = getAccessToken();
  const url = `${WS_BASE}/${channel}?token=${encodeURIComponent(token || '')}`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    if (onOpen) onOpen();
  };

  ws.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      const event = payload.event || payload.type || 'MESSAGE';
      onMessage(event, payload.data ?? payload);
    } catch {
      onMessage('RAW', e.data);
    }
  };

  ws.onerror = (err) => {
    if (onError) onError(err);
  };

  ws.onclose = () => {
    delete connections[channel];
  };

  connections[channel] = ws;

  return {
    close: () => {
      ws.close();
      delete connections[channel];
    },
  };
};

/**
 * Close all active WebSocket connections (call on logout).
 */
export const disconnectAll = () => {
  Object.values(connections).forEach((ws) => ws.close());
  Object.keys(connections).forEach((k) => delete connections[k]);
};
```

---

## TASK 9 — Create `src/components/master/TradeExecutor.jsx`

Create a new component for executing trades and manual copy trades. This component should:

- Import and use `useTradeEngine` hook
- Import and use `riskService.checkMargin` before placing any order
- Show a form with fields: `instrument` (text), `exchange` (select: NSE/BSE/NFO), `orderType` (select: MARKET/LIMIT), `transactionType` (select: BUY/SELL), `quantity` (number), `price` (number, hidden when MARKET), `product` (select: MIS/CNC/NRML), `validity` (select: DAY/IOC)
- Have a "Check Margin" button that calls `riskService.checkMargin({ brokerAccountId, instrument, quantity, orderType })` and shows result inline (sufficient: green tick, insufficient: red warning with shortfall amount)
- On submit, call `tradeService.executeTrade(body)` with the active broker account ID from `masterService.getActiveAccount()`
- After success, show a result panel with: tradeId, brokerOrderId, status, replicationsTriggered, and a table of replicationDetails (childId, status, broker, message)
- Also include a "Manual Copy" button that opens a simpler form (symbol, qty, side, product) and calls `engineService.manualCopyTrade(body)`, showing results
- Use existing UI patterns: GlassCard for the card wrapper, the existing button/input styling (Tailwind classes matching the rest of the app), Toast for success/error feedback
- Export as default

File location: `src/components/master/TradeExecutor.jsx`

---

## TASK 10 — Create `src/components/master/RiskDashboard.jsx`

Create a risk monitoring dashboard component:

- On mount, call `riskService.getRules()` and `riskService.getExposure()` in parallel using `Promise.all`
- Display current risk rules in a GlassCard: Max Trades/Day, Max Open Positions, Max Capital Exposure %, Margin Check status
- Display live exposure in another GlassCard: Current Open Positions vs max (progress bar), Trades Today vs max (progress bar), Capital Exposure %
- Add a "Refresh" button to re-fetch exposure
- Color coding: green when under 50% of limit, yellow 50–80%, red >80%
- Use `StatCard` from `@/components/shared/StatCard` for the stat items

File location: `src/components/master/RiskDashboard.jsx`

---

## TASK 11 — Create `src/components/master/PnLAnalytics.jsx`

Create a comprehensive P&L analytics component (replaces/extends the existing `PnLSummary.jsx`):

- Period selector tabs: DAILY / WEEKLY / MONTHLY — on change, call `pnlService.getSummary(period)`
- Show a summary table with columns: Period, Realized P&L, Unrealized P&L, Total Trades, Win Rate
- Realized P&L section: date range picker (from/to inputs, type="date"), fetch button that calls `pnlService.getRealizedPnl({ from, to })`, show result as total and trades list
- Unrealized P&L section: calls `pnlService.getUnrealizedPnl()` on mount, shows positions list with symbol, qty, pnl
- Use `LineChart` from `@/components/charts/LineChart` to display the summary data if available

File location: `src/components/master/PnLAnalytics.jsx`

---

## TASK 12 — Create `src/components/child/ChildPnLAnalytics.jsx`

Same as PnLAnalytics but for child role. Additionally:

- Include a "Child vs Master" comparison section
- Call `pnlService.getChildVsMaster(masterId)` — master ID comes from `childService.getSubscriptions()` (pick the first active one)
- Display: Master P&L, My P&L, Replication Accuracy %, Failed Replications count — in 4 stat cards side by side

File location: `src/components/child/ChildPnLAnalytics.jsx`

---

## TASK 13 — Create `src/components/admin/AdminPnL.jsx`

Admin-only P&L overview:

- On mount, call `pnlService.getAllPnl()`
- Display whatever the API returns in a structured DataTable (use `@/components/shared/DataTable`)
- Show loading skeleton while fetching

File location: `src/components/admin/AdminPnL.jsx`

---

## TASK 14 — Create `src/components/admin/AdminRiskRules.jsx`

Admin component to set risk rules per user:

- Inputs: userId (text), maxTradesPerDay (number), maxOpenPositions (number), maxCapitalExposure (number 0-100), marginCheckEnabled (toggle)
- On submit, call `riskService.setRulesForUser(userId, body)`
- Show success/error toast

File location: `src/components/admin/AdminRiskRules.jsx`

---

## TASK 15 — Update `src/components/master/CopyTrading.jsx`

The existing `CopyTrading.jsx` already exists. Add a new section to it:

- Add an "Engine Status" widget at the top that calls `engineService.getStatus()` on mount and displays: `engineStatus` (badge: green=ACTIVE, red otherwise), `pollingEnabled` (toggle showing current state with a button to call `engineService.togglePolling(!current)`), `supportedBrokers` as badges, `modes` as text
- Add a "Reset Polling Cache" button that calls `engineService.resetPollingCache()` with confirm dialog

Import `engineService` from `@/lib/engine`. Keep all existing functionality intact.

---

## TASK 16 — Update `src/components/shared/Sidebar.jsx`

Add the following new routes to the sidebar nav. Keep all existing items intact, add below their respective groups:

**Master section** — add after existing items:
```
{ to: '/master/trade-executor', icon: Zap, label: 'Execute Trade' }
{ to: '/master/risk-dashboard', icon: Shield, label: 'Risk Monitor' }
{ to: '/master/pnl-analytics', icon: TrendingUp, label: 'P&L Analytics' }
```

**Child section** — add after existing items:
```
{ to: '/child/pnl-analytics', icon: TrendingUp, label: 'P&L Analytics' }
```

**Admin section** — add after existing items:
```
{ to: '/admin/pnl', icon: DollarSign, label: 'Platform P&L' }
{ to: '/admin/risk-rules', icon: Shield, label: 'Risk Rules' }
```

Import `Zap` and `Shield` from `lucide-react` (they are already available).

---

## TASK 17 — Update `src/router/AppRouter.jsx`

Add the following new routes inside the existing `<Route path="/" ...>` protected wrapper. Keep all existing routes intact.

```jsx
// New imports to add at top:
import TradeExecutor from '@/components/master/TradeExecutor';
import RiskDashboard from '@/components/master/RiskDashboard';
import PnLAnalytics from '@/components/master/PnLAnalytics';
import ChildPnLAnalytics from '@/components/child/ChildPnLAnalytics';
import AdminPnL from '@/components/admin/AdminPnL';
import AdminRiskRules from '@/components/admin/AdminRiskRules';

// New routes to add in the Master section:
<Route path="master/trade-executor" element={<TradeExecutor />} />
<Route path="master/risk-dashboard" element={<RiskDashboard />} />
<Route path="master/pnl-analytics" element={<PnLAnalytics />} />

// New routes to add in the Child section:
<Route path="child/pnl-analytics" element={<ChildPnLAnalytics />} />

// New routes to add in the Admin section:
<Route path="admin/pnl" element={<AdminPnL />} />
<Route path="admin/risk-rules" element={<AdminRiskRules />} />
```

---

## TASK 18 — Update `src/components/master/Logs.jsx`

The existing `Logs.jsx` shows copy logs. Extend it with two additional tabs:

1. **Trade Logs tab** — calls `logsService.getUserTradeLogs()` from `@/lib/logs`, displays in a table with columns: id, instrument/symbol, transaction type, quantity, status, placed at
2. **Broker Errors tab** — calls `logsService.getBrokerErrors()`, shows broker account selector (dropdown from `brokerService.listAccounts()`), on change re-fetches with that `brokerAccountId`, displays error message, broker, timestamp

Import `logsService` from `@/lib/logs`. Keep existing copy logs tab intact.

---

## TASK 19 — Update `src/components/admin/SystemLogs.jsx`

The existing `SystemLogs.jsx` likely uses mock data or a different endpoint. Update it to call `logsService.adminSystemLogs()` from `@/lib/logs` and also add a "Broker Error Logs" tab that calls `logsService.adminBrokerErrors(brokerId)` with a broker selector dropdown (values: GROWW, ZERODHA, FYERS, UPSTOX, DHAN).

Keep the existing tab for copy/trade logs and add these two new tabs.

---

## TASK 20 — Update `src/context/AuthContext.jsx`

On logout, call `disconnectAll()` from `@/lib/websocket` to close all WebSocket connections cleanly.

```js
import { disconnectAll } from '@/lib/websocket';

// Inside the logout function, after clearing tokens, add:
disconnectAll();
```

---

## TASK 21 — Add WebSocket Live Feed to `src/components/master/Overview.jsx`

In the existing master Overview component, add a real-time trade feed section at the bottom:

- On mount, call `connectChannel('trades', handler)` from `@/lib/websocket`
- On unmount (useEffect cleanup), call the returned `close()` function
- `handler(event, data)` — maintain a local state array of last 20 events, prepend new ones
- Display as a live scrolling list showing: event type badge (TRADE_EXECUTED=green, TRADE_FAILED=red, TRADE_CANCELLED=orange, TRADE_DETECTED=blue), timestamp, and a brief description from the data payload
- Show a connection status indicator: "● Live" in green when connected, "○ Disconnected" in gray otherwise

---

## General Instructions for Codex

1. **Never modify `src/lib/api.js`** — it is the foundation and must remain unchanged.
2. **All new components** must use Tailwind CSS classes only — no inline styles, no new CSS files.
3. **Existing component patterns** to follow: GlassCard from `@/components/shared/GlassCard`, StatCard from `@/components/shared/StatCard`, DataTable from `@/components/shared/DataTable`, Toast from `@/components/shared/Toast`.
4. **Error handling in components:** wrap API calls in try/catch, show error using the Toast context (pattern: `const { showToast } = useToast()` or however it's called in the existing components — check `src/components/shared/Toast.jsx` for the exact hook name).
5. **Loading states:** use `src/components/shared/SkeletonLoader.jsx` for loading skeletons.
6. **All new lib files** go in `src/lib/`. All new hooks go in `src/hooks/`. All new components go in their respective `src/components/{role}/` folder.
7. **Import alias:** `@/` maps to `src/` — always use this for imports.
8. **Do not remove or rename** any existing exports from any file. Only add to existing files.
9. **WebSocket note:** The API docs show `ws://` but production is on HTTPS so use `wss://` in the websocket.js utility.
10. **No TypeScript** — all new files use `.jsx` or `.js`, not `.tsx` or `.ts` (the existing UI components in `src/components/ui/` are `.tsx` — do not modify those).

---

## Summary of Files to Create

| File | Type |
|------|------|
| `src/lib/trades.js` | New lib |
| `src/lib/engine.js` | New lib |
| `src/lib/risk.js` | New lib |
| `src/lib/pnl.js` | New lib |
| `src/lib/logs.js` | New lib |
| `src/lib/websocket.js` | New lib |
| `src/hooks/useTradeEngine.js` | New hook |
| `src/hooks/useRiskPnl.js` | New hook |
| `src/components/master/TradeExecutor.jsx` | New component |
| `src/components/master/RiskDashboard.jsx` | New component |
| `src/components/master/PnLAnalytics.jsx` | New component |
| `src/components/child/ChildPnLAnalytics.jsx` | New component |
| `src/components/admin/AdminPnL.jsx` | New component |
| `src/components/admin/AdminRiskRules.jsx` | New component |

## Summary of Files to Modify

| File | Change |
|------|--------|
| `src/components/master/CopyTrading.jsx` | Add Engine Status section + Reset Polling Cache |
| `src/components/master/Logs.jsx` | Add Trade Logs + Broker Errors tabs |
| `src/components/master/Overview.jsx` | Add WebSocket live trade feed |
| `src/components/admin/SystemLogs.jsx` | Wire real API + add Broker Errors tab |
| `src/components/shared/Sidebar.jsx` | Add new nav items |
| `src/router/AppRouter.jsx` | Add new routes |
| `src/context/AuthContext.jsx` | Call `disconnectAll()` on logout |
