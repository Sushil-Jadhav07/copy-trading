// ─────────────────────────────────────────────────────────────────────────────
// adminMock.js — MOCK data layer for the new admin safety features (ADM-1/2/4/5).
//
// WHY THIS FILE EXISTS
// These four screens are brand-new requirements from the client and the backend
// endpoints do not exist yet. This file lets the frontend be fully demo-able now.
// Each function below stands in for exactly ONE future endpoint and returns the
// SAME shape the real API will return, so the backend swap is a one-line change.
//
// HOW TO GO LIVE (per screen)
// When the backend ships an endpoint, open this file, find the matching function,
// and replace its body with the single commented `return api.<...>` line. Nothing
// in the components needs to change — they already import from here.
//
// import api from '@/lib/api';   // ← uncomment when wiring the real endpoints
// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms = 450) => new Promise((res) => setTimeout(res, ms));

const now = () => Date.now();
const minsAgo = (m) => new Date(now() - m * 60_000).toISOString();
const hoursAgo = (h) => new Date(now() - h * 3_600_000).toISOString();

// ── Shared sample pools (Indian market flavour) ──────────────────────────────
const BROKERS = ['Zerodha', 'Groww', 'Dhan', 'Fyers', 'Angel One', 'Upstox'];
const SYMBOLS = [
  'NIFTY 24800 CE', 'BANKNIFTY 51500 PE', 'RELIANCE', 'HDFCBANK',
  'TATAMOTORS', 'INFY', 'SBIN', 'ICICIBANK', 'NIFTY 24900 PE', 'AXISBANK',
];
const MASTERS = ['Rohan Mehta', 'Priya Nair', 'Arjun Shah', 'Kavya Reddy'];
const CHILDREN = [
  'Aman Gupta', 'Sneha Iyer', 'Vikram Singh', 'Neha Joshi', 'Karan Patel',
  'Divya Rao', 'Rahul Verma', 'Pooja Desai', 'Sahil Khan', 'Meera Pillai',
];
const ADMINS = ['admin@ascentra.in', 'ops@ascentra.in'];
const pick = (arr, i) => arr[i % arr.length];

// ═════════════════════════════════════════════════════════════════════════════
// ADM-1 — GLOBAL KILL-SWITCH
//   GET  /api/v1/admin/kill-switch  → { enabled, lastChangedBy, lastChangedAt, reason }
//   POST /api/v1/admin/kill-switch  → body { enable, reason } → same object
// In-memory so the toggle persists for the demo session.
// ═════════════════════════════════════════════════════════════════════════════
let killSwitch = {
  enabled: false,            // true = copying HALTED platform-wide
  lastChangedBy: ADMINS[0],
  lastChangedAt: hoursAgo(6),
  reason: 'Routine morning resume after overnight maintenance.',
};

export const getKillSwitch = async () => {
  await delay(300);
  // return (await api.get('/api/v1/admin/kill-switch')).data;
  return { ...killSwitch };
};

export const setKillSwitch = async ({ enable, reason }) => {
  await delay(600);
  // return (await api.post('/api/v1/admin/kill-switch', { enable, reason })).data;
  killSwitch = {
    enabled: !!enable,
    lastChangedBy: ADMINS[0],
    lastChangedAt: new Date().toISOString(),
    reason: reason || '',
  };
  return { ...killSwitch };
};

// ═════════════════════════════════════════════════════════════════════════════
// ADM-4 — ADMIN AUDIT LOG  (read-only)
//   GET /api/v1/admin/audit-log
//     params: page, limit, action, entityType, search, dateFrom, dateTo
//     → { logs: [{ id, adminName, action, entityType, entityId,
//                  before, after, reason, timestamp }], total }
// ═════════════════════════════════════════════════════════════════════════════
const AUDIT_TEMPLATES = [
  { action: 'USER_DEACTIVATE', entityType: 'USER',  before: { status: 'ACTIVE' },   after: { status: 'INACTIVE' }, reason: 'KYC documents expired' },
  { action: 'USER_ACTIVATE',   entityType: 'USER',  before: { status: 'INACTIVE' }, after: { status: 'ACTIVE' },   reason: 'KYC re-verified' },
  { action: 'USER_EDIT',       entityType: 'USER',  before: { phone: '+91 98•••• 21' }, after: { phone: '+91 98•••• 87' }, reason: 'User requested phone update' },
  { action: 'MASTER_PAUSE',    entityType: 'MASTER', before: { copyingPaused: false }, after: { copyingPaused: true },  reason: 'Erratic order pattern, paused for review' },
  { action: 'MASTER_RESUME',   entityType: 'MASTER', before: { copyingPaused: true },  after: { copyingPaused: false }, reason: 'Review cleared' },
  { action: 'KILL_SWITCH',     entityType: 'SYSTEM', before: { enabled: false }, after: { enabled: true },  reason: 'Broker-wide outage at Zerodha' },
  { action: 'KILL_SWITCH',     entityType: 'SYSTEM', before: { enabled: true },  after: { enabled: false }, reason: 'Outage resolved, copying resumed' },
  { action: 'FORCE_SQUARE_OFF',entityType: 'TRADE',  before: { openPositions: 4 }, after: { openPositions: 0 }, reason: 'Margin breach — emergency close' },
  { action: 'USER_DELETE',     entityType: 'USER',  before: { exists: true }, after: { exists: false }, reason: 'Duplicate account' },
];

const AUDIT_LOGS = Array.from({ length: 42 }, (_, i) => {
  const t = AUDIT_TEMPLATES[i % AUDIT_TEMPLATES.length];
  return {
    id: `AUD-${4200 - i}`,
    adminName: pick(ADMINS, i),
    action: t.action,
    entityType: t.entityType,
    entityId: t.entityType === 'SYSTEM' ? 'platform' : `USR-${1000 + (i % 17)}`,
    before: t.before,
    after: t.after,
    reason: t.reason,
    timestamp: minsAgo(i * 37 + 5),
  };
});

export const getAuditLog = async (params = {}) => {
  await delay();
  // return (await api.get('/api/v1/admin/audit-log', { params })).data;
  const { page = 1, limit = 12, action, entityType, search, dateFrom, dateTo } = params;
  let rows = [...AUDIT_LOGS];

  if (action) rows = rows.filter((r) => r.action === action);
  if (entityType) rows = rows.filter((r) => r.entityType === entityType);
  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter(
      (r) =>
        r.adminName.toLowerCase().includes(q) ||
        r.entityId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q),
    );
  }
  if (dateFrom) rows = rows.filter((r) => new Date(r.timestamp) >= new Date(dateFrom));
  if (dateTo) rows = rows.filter((r) => new Date(r.timestamp) <= new Date(`${dateTo}T23:59:59`));

  const total = rows.length;
  const start = (page - 1) * limit;
  return { logs: rows.slice(start, start + limit), total, page, limit };
};

// ═════════════════════════════════════════════════════════════════════════════
// ADM-5 — FAILED-COPY MONITOR
//   GET /api/v1/admin/failed-copies
//     params: page, limit, status, broker, search, dateFrom, dateTo
//     → { copies: [{ id, masterName, childName, broker, symbol, status,
//                    reason, latencyMs, timestamp }], total, stats }
// ═════════════════════════════════════════════════════════════════════════════
const FAIL_REASONS = {
  SKIPPED:  ['Risk limit: daily trade cap reached', 'Symbol not in child watchlist', 'Lot size rounded to zero'],
  FAILED:   ['Broker API timeout after 3 retries', 'Insufficient margin in child account', 'Order rejected: circuit limit'],
  REJECTED: ['Broker rejected: price out of band', 'RMS block on child account', 'Instrument blocked for trading'],
  TIMEOUT:  ['No fill confirmation within 5s', 'Broker session expired mid-order', 'Network timeout to broker gateway'],
};
const STATUSES = ['SKIPPED', 'FAILED', 'REJECTED', 'TIMEOUT'];

const FAILED_COPIES = Array.from({ length: 34 }, (_, i) => {
  const status = STATUSES[i % STATUSES.length];
  const reasons = FAIL_REASONS[status];
  return {
    id: `FC-${9300 - i}`,
    masterName: pick(MASTERS, i),
    childName: pick(CHILDREN, i),
    broker: pick(BROKERS, i),
    symbol: pick(SYMBOLS, i),
    status,
    reason: reasons[i % reasons.length],
    latencyMs: status === 'TIMEOUT' ? 5000 + (i % 5) * 120 : 180 + (i * 47) % 900,
    timestamp: minsAgo(i * 23 + 2),
  };
});

export const getFailedCopies = async (params = {}) => {
  await delay();
  // return (await api.get('/api/v1/admin/failed-copies', { params })).data;
  const { page = 1, limit = 12, status, broker, search, dateFrom, dateTo } = params;
  let rows = [...FAILED_COPIES];

  if (status) rows = rows.filter((r) => r.status === status);
  if (broker) rows = rows.filter((r) => r.broker.toUpperCase().replace(/\s/g, '') === broker);
  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter(
      (r) =>
        r.masterName.toLowerCase().includes(q) ||
        r.childName.toLowerCase().includes(q) ||
        r.symbol.toLowerCase().includes(q),
    );
  }
  if (dateFrom) rows = rows.filter((r) => new Date(r.timestamp) >= new Date(dateFrom));
  if (dateTo) rows = rows.filter((r) => new Date(r.timestamp) <= new Date(`${dateTo}T23:59:59`));

  // stats are computed across the WHOLE dataset (not just the page)
  const stats = {
    total: FAILED_COPIES.length,
    skipped: FAILED_COPIES.filter((r) => r.status === 'SKIPPED').length,
    rejected: FAILED_COPIES.filter((r) => r.status === 'REJECTED').length,
    timeout: FAILED_COPIES.filter((r) => r.status === 'TIMEOUT').length,
    failed: FAILED_COPIES.filter((r) => r.status === 'FAILED').length,
  };

  const total = rows.length;
  const start = (page - 1) * limit;
  return { copies: rows.slice(start, start + limit), total, page, limit, stats };
};
