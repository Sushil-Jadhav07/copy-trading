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
      return extractList(res.data).map(normalizePosition);
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
      const raw = Array.isArray(res.data?.orders) ? res.data.orders :
                  Array.isArray(res.data?.data?.orders) ? res.data.data.orders :
                  extractList(res.data);
      return raw.map((o, index) => ({
        id: o.order_id || o.orderId || o.id || `order-${index}`,
        symbol: o.tradingsymbol || o.symbol || 'N/A',
        type: String(o.transaction_type || o.transactionType || o.type || 'BUY').toUpperCase(),
        qty: Number(o.quantity ?? o.qty ?? 0),
        price: Number(o.price ?? o.averagePrice ?? 0),
        status: o.status || 'UNKNOWN',
        orderType: o.order_type || o.orderType || '',
        time: o.order_timestamp || o.orderTimestamp || o.time || '',
        raw: o,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load orders'));
    }
  },

  async getTrades(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/trades`);
      const raw = Array.isArray(res.data?.trades) ? res.data.trades :
                  Array.isArray(res.data?.data?.trades) ? res.data.data.trades :
                  extractList(res.data);
      return raw.map((t, index) => ({
        id: t.trade_id || t.tradeId || t.id || `trade-${index}`,
        symbol: t.tradingsymbol || t.symbol || 'N/A',
        orderId: t.order_id || t.orderId || '',
        type: String(t.transaction_type || t.transactionType || t.type || 'BUY').toUpperCase(),
        qty: Number(t.quantity ?? t.qty ?? 0),
        price: Number(t.average_price ?? t.averagePrice ?? t.price ?? 0),
        time: t.trade_timestamp || t.tradeTimestamp || t.time || '',
        raw: t,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trades'));
    }
  },

  async closePosition(accountId, { symbol, qty, type = 'SELL', product = 'MIS' } = {}) {
    try {
      const payload = { symbol, qty, type, product };
      try {
        const res = await api.post(`/api/v1/brokers/accounts/${accountId}/orders/close-position`, payload);
        return res.data?.data || res.data;
      } catch (error) {
        if (error?.response?.status === 404) {
          const res = await api.post(`/api/v1/brokers/accounts/${accountId}/orders/close`, payload);
          return res.data?.data || res.data;
        }
        throw error;
      }
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
      const accountRes = await api.get(`/api/v1/brokers/accounts/${accountId}`);
      const account = normalizeBrokerAccount(accountRes.data?.data || accountRes.data);

      if (!account.sessionActive) {
        const message = 'No active broker session. Login first.';
        return {
          account,
          ...emptyDashboardSections(message),
          raw: account.raw || {},
        };
      }

      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/dashboard`);
      const raw = res.data?.data || res.data || {};

      const sectionError = (section) =>
        section && !Array.isArray(section) && typeof section === 'object' && section.error
          ? section.error
          : null;

      const profile = raw.profile && !sectionError(raw.profile) ? raw.profile : null;

      const marginRaw = raw.margin && !sectionError(raw.margin) ? raw.margin : null;
      const margin = marginRaw
        ? {
            availableMargin: Number(marginRaw.availableMargin ?? marginRaw.available ?? marginRaw.net ?? 0),
            usedMargin: Number(marginRaw.usedMargin ?? 0),
            totalFunds: Number(marginRaw.totalFunds ?? 0),
            collateral: Number(marginRaw.collateral ?? 0),
          }
        : null;

      const positionsRaw = Array.isArray(raw.positions) ? raw.positions : [];
      const positions = positionsRaw.map((p, index) =>
        normalizePosition(
          { ...p, symbol: p.tradingsymbol || p.symbol, quantity: p.quantity, average_price: p.average_price },
          index,
        ),
      );

      const holdingsRaw = Array.isArray(raw.holdings) ? raw.holdings : [];
      const holdings = holdingsRaw.map((h, index) => ({
        id: h.id || `holding-${index}`,
        symbol: h.tradingsymbol || h.symbol || 'N/A',
        quantity: Number(h.quantity ?? 0),
        avgPrice: Number(h.average_price ?? h.averagePrice ?? 0),
        lastPrice: Number(h.last_price ?? h.lastPrice ?? 0),
        pnl: Number(((h.last_price ?? h.lastPrice ?? 0) - (h.average_price ?? h.averagePrice ?? 0)) * (h.quantity ?? 0)),
        raw: h,
      }));

      const ordersRaw = Array.isArray(raw.orders) ? raw.orders : [];
      const orders = ordersRaw.map((o, index) => ({
        id: o.order_id || o.orderId || o.id || `order-${index}`,
        symbol: o.tradingsymbol || o.symbol || 'N/A',
        type: String(o.transaction_type || o.transactionType || o.type || 'BUY').toUpperCase(),
        qty: Number(o.quantity ?? o.qty ?? 0),
        price: Number(o.price ?? o.averagePrice ?? 0),
        status: o.status || 'UNKNOWN',
        orderType: o.order_type || o.orderType || '',
        time: o.order_timestamp || o.orderTimestamp || o.time || '',
        raw: o,
      }));

      // NEW: parse signal from dashboard response
      const signal = raw.signal
        ? {
            bars: Number(raw.signal.bars ?? raw.signal.signal ?? 0),
            maxBars: Number(raw.signal.maxBars ?? raw.signal.maxSignal ?? 4),
            quality: raw.signal.quality || 'disconnected',
            color: raw.signal.color || 'red',
          }
        : null;

      // NEW: parse balanceAlert from dashboard response
      const balanceAlert = raw.balanceAlert
        ? normalizeBalanceAlert({ alertLevel: raw.balanceAlert.level || raw.balanceAlert.alertLevel, ...raw.balanceAlert })
        : null;

      const errors = {
        profile: sectionError(raw.profile),
        margin: sectionError(raw.margin),
        positions: Array.isArray(raw.positions) ? null : sectionError(raw.positions),
        holdings: Array.isArray(raw.holdings) ? null : sectionError(raw.holdings),
        orders: Array.isArray(raw.orders) ? null : sectionError(raw.orders),
      };

      const dashboardAccount = normalizeBrokerAccount({
        accountId: raw.accountId,
        brokerId: raw.brokerId,
        brokerName: raw.brokerName,
        clientId: raw.clientId,
        nickname: raw.nickname,
        status: raw.status,
        sessionActive: raw.sessionActive,
      });

      return {
        account: { ...account, ...dashboardAccount, raw },
        profile,
        margin,
        positions,
        holdings,
        orders,
        signal,
        balanceAlert,
        errors,
        raw,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker dashboard'));
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
