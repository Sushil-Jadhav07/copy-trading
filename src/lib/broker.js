import api from '@/lib/api';

const ACCOUNT_COLLECTION_PATHS = ['/api/v1/brokers/accounts', '/api/v1/broker/accounts'];

const getErrorMessage = (error, fallback = 'Request failed') => {
  const backendMsg =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.details ||
    null;
  if (backendMsg) return backendMsg;
  if (error?.message && error.message !== 'Network Error') return error.message;
  return fallback;
};

const shouldRetryWithLegacyAccountPath = (error) => {
  const status = Number(error?.response?.status);
  return status === 404 || status === 405;
};

const isMissingEndpointError = (error) => {
  const status = Number(error?.response?.status);
  return status === 404 || status === 405;
};

const withAccountPathFallback = async (requestFactory) => {
  let lastError = null;

  for (let index = 0; index < ACCOUNT_COLLECTION_PATHS.length; index += 1) {
    const basePath = ACCOUNT_COLLECTION_PATHS[index];
    try {
      return await requestFactory(basePath);
    } catch (error) {
      lastError = error;
      const canRetry = shouldRetryWithLegacyAccountPath(error);
      const hasNextPath = index < ACCOUNT_COLLECTION_PATHS.length - 1;
      if (!canRetry || !hasNextPath) {
        throw error;
      }
    }
  }

  throw lastError;
};

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
  const proxyHost = String(raw.proxyHost || '').trim();
  const proxyPort = Number(raw.proxyPort ?? 0);
  const proxyConfigured = Boolean(
    parseBooleanLike(raw.proxyConfigured) ??
    (proxyHost && proxyPort > 0)
  );

  return {
    id: raw.accountId || raw.id || '',
    accountId: raw.accountId || raw.id || '',
    brokerId: raw.brokerId || '',
    brokerName: raw.brokerName || raw.brokerId || '',
    broker: raw.brokerName || raw.brokerId || '',
    clientId: raw.clientId || raw.client_id || raw.dhanClientId || raw.userId || '',
    userId: raw.clientId || raw.client_id || raw.dhanClientId || raw.userId || '',
    nickname: raw.nickname || raw.accountNickname || '',
    status,
    sessionActive,
    linkedAt: raw.linkedAt || null,
    margin: Number(raw.margin || raw.availableMargin || raw.available || raw.net || 0),
    pnl: Number(raw.pnl || raw.totalPnL || raw.dayPnL || 0),
    positions: Number(raw.positions || raw.positionCount || 0),
    orders: Number(raw.orders || raw.orderCount || 0),
    tokenExpiresAt: raw.tokenExpiresAt || raw.expiresAt || null,
    tokenExpiresInHours: (() => {
      const exp = raw.tokenExpiresAt || raw.expiresAt;
      if (!exp) return null;
      return Math.round((new Date(exp).getTime() - Date.now()) / 3600000);
    })(),
    isTokenExpiringSoon: (() => {
      const exp = raw.tokenExpiresAt || raw.expiresAt;
      if (!exp) return false;
      const hours = Math.round((new Date(exp).getTime() - Date.now()) / 3600000);
      return hours >= 0 && hours < 24;
    })(),
    isTokenExpired: (() => {
      const exp = raw.tokenExpiresAt || raw.expiresAt;
      if (!exp) return false;
      return new Date(exp).getTime() < Date.now();
    })(),
    lastOrderDetectedAt: raw.lastOrderDetectedAt || raw.lastOrderAt || null,
    proxyHost,
    proxyPort: Number.isFinite(proxyPort) ? proxyPort : 0,
    proxyUser: raw.proxyUser || '',
    proxyConfigured,
    raw,
  };
};

const normalizeLoginOptions = (payload = {}) => {
  const rawOptions = Array.isArray(payload?.loginOptions)
    ? payload.loginOptions
    : Array.isArray(payload?.options)
      ? payload.options
      : [];
  const options = rawOptions.map((option, index) => {
    if (typeof option === 'string') {
      return { method: option, description: '', requiredFields: [], endpoint: '', raw: option, index };
    }

    return {
      method: option?.method || option?.loginMethod || option?.type || `option-${index}`,
      description: option?.description || '',
      requiredFields: Array.isArray(option?.requiredFields) ? option.requiredFields : [],
      endpoint: option?.endpoint || '',
      raw: option,
      index,
    };
  });

  return {
    ...payload,
    loginOptions: options,
    loginOptionMethods: Array.isArray(payload?.loginOptionMethods)
      ? payload.loginOptionMethods
      : options.map((option) => option.method),
    oauthUrl: payload?.oauthUrl || payload?.loginUrl || payload?.url || '',
    loginField: payload?.loginField || '',
    needsCredentials: Boolean(payload?.needsCredentials),
    requiresUserCredentials: Boolean(payload?.requiresUserCredentials),
    hasStoredApiKey: Boolean(payload?.hasStoredApiKey),
    credentialFields: Array.isArray(payload?.credentialFields)
      ? payload.credentialFields
      : Array.isArray(payload?.requiredFields)
        ? payload.requiredFields
        : [],
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

const extractPositionsList = (payload) => {
  if (Array.isArray(payload)) return payload;
  
  // Handle structures like { positions: { net: [...], day: [...] } }
  if (Array.isArray(payload?.positions?.net)) return payload.positions.net;
  if (Array.isArray(payload?.data?.positions?.net)) return payload.data.positions.net;
  
  if (Array.isArray(payload?.positions)) return payload.positions;
  if (Array.isArray(payload?.data?.positions)) return payload.data.positions;
  if (Array.isArray(payload?.net)) return payload.net;
  
  if (Array.isArray(payload?.positions?.positions)) return payload.positions.positions;
  if (Array.isArray(payload?.data?.positions?.positions)) return payload.data.positions.positions;
  
  return [];
};

const extractOrdersList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.order_list)) return payload.order_list;
  if (Array.isArray(payload?.orders?.order_list)) return payload.orders.order_list;
  if (Array.isArray(payload?.data?.orders?.order_list)) return payload.data.orders.order_list;
  return [];
};

const firstNumber = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const normalizePosition = (raw = {}, index = 0) => {
  const qty = firstNumber(raw.qty, raw.quantity, raw.netQty, raw.netQuantity, raw.net_quantity, raw.positionQty, raw.position_qty) ?? 0;
  const avgPrice = firstNumber(
    raw.avgPrice,
    raw.averagePrice,
    raw.average_price,
    raw.costPrice,
    raw.cost_price,
    raw.entryPrice,
    raw.entry_price,
    raw.net_price,
    raw.debit_price,
    raw.credit_price,
    raw.buyAvg,
    raw.sellAvg
  ) ?? 0;
  const rawPnl = firstNumber(
    raw.unrealizedPnl,
    raw.unrealized_pnl,
    raw.unrealizedProfit,
    raw.unrealized_profit,
    raw.unrealised,
    raw.unrealised_pnl,
    raw.unrealized,
    raw.m2m,
    raw.mtM,
    raw.mtm,
    raw.pnl,
    raw.realised_pnl
  );
  const rawType = String(
    raw.positionType ||
    raw.position_type ||
    raw.type ||
    raw.side ||
    raw.transactionType ||
    raw.transaction_type ||
    raw.action ||
    ''
  ).toUpperCase();
  const type = String(
    rawType === 'LONG' ? 'BUY' :
    rawType === 'SHORT' ? 'SELL' :
    raw.type ||
    raw.side ||
    raw.transactionType ||
    raw.transaction_type ||
    raw.action ||
    ((Number(raw.debit_quantity ?? 0) > 0 || qty > 0) ? 'BUY' : 'SELL')
  ).toUpperCase();
  const derivedLtpFromPnl =
    rawPnl != null && avgPrice && qty
      ? (type === 'SELL'
          ? avgPrice - (Number(rawPnl) / Math.abs(qty))
          : avgPrice + (Number(rawPnl) / Math.abs(qty)))
      : null;
  const ltp = firstNumber(
    raw.ltp,
    raw.lastPrice,
    raw.last_price,
    raw.lastTradedPrice,
    raw.last_traded_price,
    raw.currentPrice,
    raw.current_price,
    raw.net_price,
    derivedLtpFromPnl
  ) ?? 0;
  const calculatedPnl = ltp && avgPrice && qty
    ? (type === 'SELL' ? (avgPrice - ltp) : (ltp - avgPrice)) * Math.abs(qty)
    : 0;
  const pnl = rawPnl ?? calculatedPnl;
  const derivedChange = avgPrice && qty
    ? ((type === 'SELL' ? (avgPrice - ltp) : (ltp - avgPrice)) / avgPrice) * 100
    : 0;

  return {
    id: raw.id || raw.positionId || raw.position_id || `${raw.symbol || raw.instrument || raw.tradingSymbol || raw.tradingsymbol || raw.trading_symbol || 'position'}-${index}`,
    symbol: raw.symbol || raw.instrument || raw.tradingSymbol || raw.tradingsymbol || raw.trading_symbol || 'N/A',
    instrument: raw.instrument || raw.symbol || raw.tradingSymbol || raw.tradingsymbol || raw.trading_symbol || 'N/A',
    side: String(raw.side || raw.type || raw.transactionType || raw.transaction_type || raw.action || type).toUpperCase(),
    type,
    qty,
    pnl,
    unrealizedPnl: pnl,
    ltp,
    avgPrice,
    entry: firstNumber(raw.entry, raw.entryPrice, raw.entry_price, raw.averagePrice, raw.average_price, raw.costPrice, raw.cost_price, raw.net_price, raw.debit_price, raw.credit_price) ?? avgPrice,
    current: firstNumber(raw.current, raw.currentPrice, raw.current_price, raw.ltp, raw.lastPrice, raw.last_price, raw.net_price) ?? ltp,
    change: firstNumber(raw.change, raw.changePct, raw.change_pct, raw.pnlPercent, raw.pnl_percent) ?? derivedChange,
    exchange: raw.exchange || raw.exch || raw.exchange_code || String(raw.exchangeSegment || raw.exchange_segment || '').split('_')[0] || '',
    product: raw.product || raw.productType || raw.market || raw.segment || 'MIS',
    market: raw.market || raw.segment || raw.exchangeSegment || raw.exchange_segment || '',
    children: raw.children || raw.copiedAccounts || [],
    triggerPrice: (
      raw.triggerPrice != null ? Number(raw.triggerPrice) :
      raw.trigger_price != null ? Number(raw.trigger_price) :
      raw.stopPrice != null ? Number(raw.stopPrice) :
      raw.triggerprice != null ? Number(raw.triggerprice) : 0
    ),
    orderType: raw.orderType || raw.order_type || raw.type || '',
    instrumentType: (() => {
      const s = String(raw.symbol || raw.instrument || raw.tradingSymbol || raw.tradingsymbol || '').toUpperCase();
      if (s.endsWith('CE')) return 'CE';
      if (s.endsWith('PE')) return 'PE';
      if (s.includes('FUT')) return 'FUT';
      return 'EQ';
    })(),
    raw,
  };
};

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


export const brokerService = {
  async getBrokers() {
    try {
      const res = await api.get('/api/v1/brokers');
      const payload = res.data?.data || res.data || {};
      return {
        brokers: extractList(payload),
        platformServerIp: payload?.platformServerIp || res.data?.platformServerIp || '',
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load brokers'));
    }
  },

  async getAccounts() {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(basePath));
      return extractList(res.data).map(normalizeBrokerAccount);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker accounts'));
    }
  },

  async getAccount(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}`));
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load account'));
    }
  },

  async addAccount(body) {
    try {
      const res = await withAccountPathFallback((basePath) => api.post(basePath, body));
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to add broker account'));
    }
  },

  async updateAccount(accountId, body) {
    try {
      const res = await withAccountPathFallback((basePath) => api.put(`${basePath}/${accountId}`, body));
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update account'));
    }
  },

  async deleteAccount(accountId) {
    try {
      await withAccountPathFallback((basePath) => api.delete(`${basePath}/${accountId}`));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete account'));
    }
  },

  async disconnectAccount(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.post(`${basePath}/${accountId}/disconnect`));
      return normalizeLoginOptions(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to disconnect broker account'));
    }
  },

  async saveAccessToken(accountId, accessToken, clientId) {
    try {
      const body = { accessToken };
      if (clientId) body.clientId = clientId;
      const res = await withAccountPathFallback((basePath) => api.put(`${basePath}/${accountId}/token`, body));
      return normalizeLoginOptions(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to save broker access token'));
    }
  },

  async getLoginOptions(accountId) {
    try {
      const payload = await withAccountPathFallback(async (basePath) => {
        try {
          const res = await api.get(`${basePath}/${accountId}/login-options`);
          return res.data?.data || res.data || {};
        } catch (error) {
          if (!isMissingEndpointError(error)) throw error;
          const fallbackRes = await api.get(`${basePath}/${accountId}/status`);
          return fallbackRes.data?.data || fallbackRes.data || {};
        }
      });
      return normalizeLoginOptions(payload);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker login options'));
    }
  },

  async getOAuthUrl(accountId) {
    try {
      const payload = await withAccountPathFallback(async (basePath) => {
        try {
          const res = await api.get(`${basePath}/${accountId}/oauth-url`);
          return res.data?.data || res.data || {};
        } catch (error) {
          if (!isMissingEndpointError(error)) throw error;
          const fallbackRes = await api.get(`${basePath}/${accountId}/status`);
          return fallbackRes.data?.data || fallbackRes.data || {};
        }
      });
      return normalizeLoginOptions(payload);
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/test`));
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/status`));
      return normalizeLoginOptions(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to get account status'));
    }
  },

  async getPositions(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/positions`));
      const data = res.data?.data || res.data;
      const raw = extractPositionsList(data).length > 0
        ? extractPositionsList(data)
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      return raw.map(normalizePosition);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getMargin(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/margin`));
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load margin'));
    }
  },

  async getHoldings(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/holdings`));
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/orders`));
      const data = res.data?.data || res.data;
      const raw = extractOrdersList(data).length > 0
        ? extractOrdersList(data)
        : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      
      return raw.map((o, index) => ({
        id: o.order_id || o.groww_order_id || o.orderId || o.id || `order-${index}`,
        symbol: o.tradingsymbol || o.trading_symbol || o.symbol || 'N/A',
        exchange: o.exchange || 'NSE',
        type: String(o.transaction_type || o.transactionType || o.type || o.side || 'BUY').toUpperCase(),
        qty: Number(o.quantity ?? o.qty ?? o.filled_quantity ?? 0),
        price: Number(o.average_fill_price ?? o.average_price ?? o.averagePrice ?? o.price ?? 0),
        status: String(o.order_status || o.status || 'UNKNOWN').toUpperCase(),
        orderType: o.order_type || o.orderType || 'MARKET',
        product: o.product || 'MIS',
        time: o.created_at || o.exchange_time || o.trade_date || o.order_timestamp || o.orderTimestamp || o.time || o.placedAt || '',
        filledQuantity: Number(o.filled_quantity ?? 0),
        remainingQuantity: Number(o.remaining_quantity ?? 0),
        triggerPrice: Number(o.trigger_price ?? 0),
        latencyMs: o.latencyMs != null ? Number(o.latencyMs) : (o.totalExecutionMs != null ? Number(o.totalExecutionMs) : null),
        raw: o,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load orders'));
    }
  },

  async getTrades(accountId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/trades`));
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

  async cancelOrder(accountId, orderId) {
    try {
      const res = await withAccountPathFallback((basePath) => api.delete(`${basePath}/${accountId}/orders/${orderId}`));
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/signal`));
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/balance-alert`));
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
      const res = await withAccountPathFallback((basePath) => api.get(`${basePath}/${accountId}/dashboard`));
      const data = res.data?.data || res.data;
      
      // Normalize everything from the dashboard response
      const account = data.account || {};
      const margin = data.margin || {};
      const rawPositions = extractPositionsList(data.positions).length > 0
        ? extractPositionsList(data.positions)
        : (Array.isArray(data.positions) ? data.positions : []);
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
          proxyHost: String(account.proxyHost || '').trim(),
          proxyPort: Number(account.proxyPort ?? 0),
          proxyUser: account.proxyUser || '',
          proxyConfigured: Boolean(
            parseBooleanLike(account.proxyConfigured) ??
            (String(account.proxyHost || '').trim() && Number(account.proxyPort ?? 0) > 0)
          ),
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
        orders: extractOrdersList(rawOrders).map((o, index) => ({
          id: o.order_id || o.groww_order_id || o.orderId || o.id || `order-${index}`,
          symbol: o.tradingsymbol || o.trading_symbol || o.symbol || 'N/A',
          exchange: o.exchange || 'NSE',
          type: String(o.transaction_type || o.transactionType || o.type || o.side || 'BUY').toUpperCase(),
          qty: Number(o.quantity ?? o.qty ?? o.filled_quantity ?? 0),
          price: Number(o.average_fill_price ?? o.average_price ?? o.averagePrice ?? o.price ?? 0),
          status: String(o.order_status || o.status || 'UNKNOWN').toUpperCase(),
          orderType: o.order_type || o.orderType || 'MARKET',
          product: o.product || 'MIS',
          time: o.created_at || o.exchange_time || o.trade_date || o.order_timestamp || o.orderTimestamp || o.time || o.placedAt || '',
          filledQuantity: Number(o.filled_quantity ?? 0),
          remainingQuantity: Number(o.remaining_quantity ?? 0),
          triggerPrice: Number(o.trigger_price ?? 0),
          latencyMs: o.latencyMs != null ? Number(o.latencyMs) : (o.totalExecutionMs != null ? Number(o.totalExecutionMs) : null),
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
