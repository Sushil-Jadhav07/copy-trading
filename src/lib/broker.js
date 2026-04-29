import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const parseBooleanLike = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const deriveSessionActive = (raw = {}) => {
  const explicit =
    parseBooleanLike(raw.sessionActive) ??
    parseBooleanLike(raw.isSessionActive) ??
    parseBooleanLike(raw.connected);
  if (explicit !== null) return explicit;

  const statusHints = [raw.status, raw.sessionStatus, raw.loginStatus]
    .filter((value) => value != null)
    .map((value) => String(value).toUpperCase());

  if (statusHints.some((status) => ['ACTIVE', 'SESSION_ACTIVE', 'CONNECTED', 'LOGGED_IN', 'AUTHORIZED'].includes(status))) {
    return true;
  }
  if (statusHints.some((status) => ['INACTIVE', 'SESSION_EXPIRED', 'EXPIRED', 'DISCONNECTED', 'FAILED', 'LOGGED_OUT'].includes(status))) {
    return false;
  }

  return false;
};

const normalizeBrokerAccount = (raw = {}) => {
  const sessionActive = deriveSessionActive(raw);
  const status = String(raw.status || (sessionActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();

  return {
    id: raw.accountId || raw.id || '',
    accountId: raw.accountId || raw.id || '',
    brokerId: raw.brokerId || '',
    brokerName: raw.brokerName || raw.brokerId || '',
    broker: raw.brokerName || raw.brokerId || '',
    clientId: raw.clientId || '',
    userId: raw.clientId || '',
    nickname: raw.nickname || raw.accountNickname || '',
    status,
    sessionActive,
    linkedAt: raw.linkedAt || null,
    margin: Number(raw.margin || raw.availableMargin || raw.available || raw.net || 0),
    pnl: Number(raw.pnl || raw.totalPnL || raw.dayPnL || 0),
    positions: Number(raw.positions || raw.positionCount || 0),
    orders: Number(raw.orders || raw.orderCount || 0),
    raw,
  };
};

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.positions)) return data.positions;
  if (Array.isArray(data?.brokers)) return data.brokers;
  const candidates = Object.values(data || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const normalizePosition = (raw = {}, index = 0) => ({
  id: raw.id || raw.positionId || `${raw.symbol || raw.instrument || 'position'}-${index}`,
  symbol: raw.symbol || raw.instrument || raw.tradingSymbol || raw.tradingsymbol || 'N/A',
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || raw.tradingsymbol || 'N/A',
  type: String(raw.type || raw.side || raw.transactionType || raw.action || 'BUY').toUpperCase(),
  qty: Number(raw.qty || raw.quantity || raw.netQuantity || raw.positionQty || 0),
  pnl: Number(raw.pnl || raw.unrealizedPnl || raw.mtM || 0),
  unrealizedPnl: Number(raw.unrealizedPnl || raw.pnl || raw.mtM || 0),
  ltp: Number(raw.ltp || raw.lastPrice || raw.currentPrice || 0),
  avgPrice: Number(raw.avgPrice || raw.averagePrice || raw.average_price || raw.entryPrice || 0),
  entry: Number(raw.entry || raw.entryPrice || raw.averagePrice || raw.average_price || 0),
  current: Number(raw.current || raw.ltp || raw.lastPrice || raw.currentPrice || 0),
  change: Number(raw.change || raw.changePct || raw.pnlPercent || 0),
  market: raw.market || raw.segment || '',
  children: raw.children || raw.copiedAccounts || [],
  raw,
});

// ─── Signal normalizer ────────────────────────────────────────────────────────
const normalizeSignal = (raw = {}) => ({
  bars: Number(raw.signal ?? raw.bars ?? 0),
  maxBars: Number(raw.maxSignal ?? raw.maxBars ?? 4),
  quality: raw.quality || 'disconnected',
  color: raw.color || 'red',
  message: raw.message || '',
  sessionActive: deriveSessionActive(raw),
  latencyMs: raw.latencyMs != null ? Number(raw.latencyMs) : null,
  marginAvailable: Number(raw.marginAvailable ?? 0),
});

// ─── Balance Alert normalizer ─────────────────────────────────────────────────
const normalizeBalanceAlert = (raw = {}) => ({
  level: raw.alertLevel || raw.level || 'OK',
  message: raw.message || '',
  availableMargin: Number(raw.availableMargin ?? 0),
  usedMargin: Number(raw.usedMargin ?? 0),
  totalFunds: Number(raw.totalFunds ?? 0),
  thresholds: {
    critical: Number(raw.thresholds?.critical ?? 1000),
    warning: Number(raw.thresholds?.warning ?? 5000),
    low: Number(raw.thresholds?.low ?? 10000),
  },
});

const emptyDashboardSections = (message = null) => ({
  profile: null,
  margin: null,
  positions: [],
  holdings: [],
  orders: [],
  signal: null,
  balanceAlert: null,
  errors: {
    profile: message,
    margin: message,
    positions: message,
    holdings: message,
    orders: message,
  },
});

export const brokerService = {
  async getBrokers() {
    try {
      const res = await api.get('/api/v1/brokers');
      return extractList(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load brokers'));
    }
  },

  async getAccounts() {
    try {
      const res = await api.get('/api/v1/brokers/accounts');
      return extractList(res.data).map(normalizeBrokerAccount);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker accounts'));
    }
  },

  async getAccount(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}`);
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load account'));
    }
  },

  async addAccount(body) {
    try {
      const res = await api.post('/api/v1/brokers/accounts', body);
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to add broker account'));
    }
  },

  async updateAccount(accountId, body) {
    try {
      const res = await api.put(`/api/v1/brokers/accounts/${accountId}`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update account'));
    }
  },

  async deleteAccount(accountId) {
    try {
      await api.delete(`/api/v1/brokers/accounts/${accountId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete account'));
    }
  },

  async getOAuthUrl(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/oauth-url`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker login url'));
    }
  },

  async handleCallback(params = {}) {
    try {
      const res = await api.get('/api/v1/brokers/callback', { params });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to complete broker callback'));
    }
  },

  async testAccount(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/test`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Broker test failed'));
    }
  },

  async loginAccount(accountId, payload = {}) {
    try {
      const res = await api.post(`/api/v1/brokers/accounts/${accountId}/login`, payload || {});
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Broker login failed'));
    }
  },

  async getAccountStatus(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/status`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to get account status'));
    }
  },

  async getPositions(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/positions`);
      const data = res.data?.data || res.data;
      const raw = Array.isArray(data?.positions) ? data.positions :
                  Array.isArray(data?.items) ? data.items :
                  Array.isArray(data) ? data : [];
      return raw.map(normalizePosition);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getMargin(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/margin`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load margin'));
    }
  },

  async getHoldings(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/holdings`);
      const raw = Array.isArray(res.data?.holdings) ? res.data.holdings :
                  Array.isArray(res.data?.data?.holdings) ? res.data.data.holdings :
                  extractList(res.data);
      return raw.map((h, index) => ({
        id: h.id || `holding-${index}`,
        symbol: h.tradingsymbol || h.symbol || 'N/A',
        quantity: Number(h.quantity ?? 0),
        avgPrice: Number(h.average_price ?? h.averagePrice ?? 0),
        lastPrice: Number(h.last_price ?? h.lastPrice ?? 0),
        pnl: Number(h.pnl ?? ((h.last_price ?? h.lastPrice ?? 0) - (h.average_price ?? h.averagePrice ?? 0)) * (h.quantity ?? 0)),
        raw: h,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load holdings'));
    }
  },

  async getOrders(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/orders`);
      const data = res.data?.data || res.data;
      const raw = Array.isArray(data?.orders) ? data.orders :
                  Array.isArray(data?.items) ? data.items :
                  Array.isArray(data) ? data : [];
      
      return raw.map((o, index) => ({
        id: o.order_id || o.orderId || o.id || `order-${index}`,
        symbol: o.tradingsymbol || o.symbol || 'N/A',
        exchange: o.exchange || 'NSE',
        type: String(o.transaction_type || o.transactionType || o.type || o.side || 'BUY').toUpperCase(),
        qty: Number(o.quantity ?? o.qty ?? 0),
        price: Number(o.average_price ?? o.averagePrice ?? o.price ?? 0),
        status: String(o.status || 'UNKNOWN').toUpperCase(),
        orderType: o.order_type || o.orderType || 'MARKET',
        product: o.product || 'MIS',
        time: o.order_timestamp || o.orderTimestamp || o.time || o.placedAt || '',
        raw: o,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load orders'));
    }
  },

  async getTrades(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/trades`);
      const data = res.data?.data || res.data;
      const raw = Array.isArray(data?.trades) ? data.trades :
                  Array.isArray(data?.items) ? data.items :
                  Array.isArray(data) ? data : [];

      return raw.map((t, index) => ({
        id: t.trade_id || t.tradeId || t.id || `trade-${index}`,
        orderId: t.order_id || t.orderId || '',
        symbol: t.tradingsymbol || t.symbol || 'N/A',
        exchange: t.exchange || 'NSE',
        type: String(t.transaction_type || t.transactionType || t.type || t.side || 'BUY').toUpperCase(),
        qty: Number(t.quantity ?? t.qty ?? 0),
        price: Number(t.average_price ?? t.averagePrice ?? t.price ?? 0),
        time: t.trade_timestamp || t.tradeTimestamp || t.time || t.createdAt || '',
        product: t.product || 'MIS',
        raw: t,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trades'));
    }
  },

  async closePosition(accountId, { symbol, qty, type = 'SELL', product = 'MIS' } = {}) {
    try {
      const payload = { symbol, qty, type, product };
      const res = await api.post(`/api/v1/brokers/accounts/${accountId}/orders/close-position`, payload);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to close position'));
    }
  },

  async cancelOrder(accountId, orderId) {
    try {
      const res = await api.delete(`/api/v1/brokers/accounts/${accountId}/orders/${orderId}`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to cancel order'));
    }
  },

  // ─── NEW: Connection Signal API ─────────────────────────────────────────────
  // GET /api/v1/brokers/accounts/{accountId}/signal
  // Returns signal bars (0-4), quality, latency. Like mobile network bars.
  async getSignal(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/signal`);
      return normalizeSignal(res.data?.data || res.data || {});
    } catch (error) {
      // Return "disconnected" signal rather than throwing — UI degrades gracefully
      return normalizeSignal({});
    }
  },

  // ─── NEW: Balance Alert API ─────────────────────────────────────────────────
  // GET /api/v1/brokers/accounts/{accountId}/balance-alert
  // Returns CRITICAL / WARNING / LOW / OK with thresholds.
  // Also auto-pushes notifications when trades are copied to a child.
  async getBalanceAlert(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/balance-alert`);
      return normalizeBalanceAlert(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load balance alert'));
    }
  },

  // ─── UPDATED: Broker Dashboard API ─────────────────────────────────────────
  // GET /api/v1/brokers/accounts/{accountId}/dashboard
  // Single call that returns profile, margin, positions, holdings, orders
  // PLUS signal and balanceAlert (new in this version).
  // Flow: POST /brokers/accounts → POST .../login (SESSION_ACTIVE) → GET .../dashboard
  async getDashboard(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/dashboard`);
      const data = res.data?.data || res.data;
      
      // Normalize everything from the dashboard response
      const account = data.account || {};
      const margin = data.margin || {};
      const rawPositions = Array.isArray(data.positions) ? data.positions : [];
      const rawHoldings = Array.isArray(data.holdings) ? data.holdings : [];
      const rawOrders = Array.isArray(data.orders) ? data.orders : [];

      return {
        account: {
          id: account.accountId || account.id || accountId,
          brokerId: account.brokerId || '',
          brokerName: account.brokerName || account.broker || '',
          clientId: account.clientId || account.username || '',
          nickname: account.nickname || '',
          status: String(account.status || '').toUpperCase(),
          sessionActive: Boolean(account.sessionActive ?? account.isActive),
          linkedAt: account.linkedAt || account.createdAt || null,
        },
        margin: {
          availableMargin: Number(margin.availableMargin ?? margin.available ?? margin.net ?? 0),
          usedMargin: Number(margin.usedMargin ?? margin.used ?? 0),
          pnl: Number(margin.pnl || 0),
        },
        positions: rawPositions.map(normalizePosition),
        holdings: rawHoldings.map((h, index) => ({
          id: h.id || h.isin || h.symbol || `holding-${index}`,
          symbol: h.symbol || h.tradingsymbol || 'N/A',
          quantity: Number(h.quantity || h.qty || 0),
          avgPrice: Number(h.avgPrice || h.averagePrice || 0),
          lastPrice: Number(h.lastPrice || h.ltp || 0),
          pnl: Number(h.pnl || h.unrealizedPnl || 0),
          raw: h,
        })),
        orders: rawOrders.map((o, index) => ({
          id: o.order_id || o.orderId || o.id || `order-${index}`,
          symbol: o.tradingsymbol || o.symbol || 'N/A',
          exchange: o.exchange || 'NSE',
          type: String(o.transaction_type || o.transactionType || o.type || o.side || 'BUY').toUpperCase(),
          qty: Number(o.quantity ?? o.qty ?? 0),
          price: Number(o.average_price ?? o.averagePrice ?? o.price ?? 0),
          status: String(o.status || 'UNKNOWN').toUpperCase(),
          orderType: o.order_type || o.orderType || 'MARKET',
          product: o.product || 'MIS',
          time: o.order_timestamp || o.orderTimestamp || o.time || o.placedAt || '',
          raw: o,
        })),
        signal: data.signal || null,
        balanceAlert: data.balanceAlert || null,
        errors: data.errors || {},
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load dashboard'));
    }
  },

  async getAdminBrokerStatus() {
    try {
      const res = await api.get('/api/v1/admin/brokers/status');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
      return Object.entries(data || {}).map(([k, v]) => ({ name: k, ...v }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker status'));
    }
  },

  async getAdminBrokerAccounts(params = {}) {
    try {
      const res = await api.get('/api/v1/admin/brokers/accounts', { params });
      return extractList(res.data).map(normalizeBrokerAccount);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker accounts'));
    }
  },
};
