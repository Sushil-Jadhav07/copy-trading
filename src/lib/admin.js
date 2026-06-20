import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const toFiniteNumberOrNull = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toDateLabel = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-IN');
};

const pickRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();

  if (normalized === 'admin' || normalized === 'administrator') {
    return 'Admin';
  }

  if (normalized === 'master' || normalized === 'provider') {
    return 'Master';
  }

  return 'Child';
};

export const normalizeAdminUser = (payload = {}) => ({
  id: payload.userId || payload.id || payload._id || '',
  userId: payload.userId || payload.id || payload._id || '',
  name: payload.name || payload.fullName || 'User',
  email: payload.email || '',
  phone: payload.phone || '',
  role: pickRole(payload.role || payload.userType),
  status: String(payload.status || 'ACTIVE').toUpperCase(),
  joinedDate: toDateLabel(payload.createdAt || payload.created_at),
  createdAt: payload.createdAt || payload.created_at || null,
  twoFactorEnabled: Boolean(payload.twoFactorEnabled),
  brokerAccounts: asArray(payload.brokerAccounts),
  raw: payload,
});

const extractCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.subscriptions)) {
    return payload.subscriptions;
  }

  if (Array.isArray(payload?.logs)) {
    return payload.logs;
  }

  const candidates = Object.values(payload || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const extractMeta = (payload = {}) => ({
  total:
    payload.total ||
    payload.totalElements ||
    payload.totalCount ||
    payload.count ||
    null,
  page: payload.page || payload.currentPage || 1,
  limit: payload.limit || payload.pageSize || 20,
});

const normalizeTradeLog = (log = {}, index = 0) => {
  // API returns: { id, masterId, childId, type, status, message, broker, reference, createdAt }
  const type = String(log.type || log.eventType || 'REPLICATED').toUpperCase();
  const status = String(log.status || log.executionStatus || 'EXECUTED').toUpperCase();

  return {
    id: log.id || `log-${index}`,
    type,
    // API has masterId not masterName — show masterId as identifier
    master: log.masterName || log.master || log.masterId || 'Unknown',
    // API has reference for order/trade reference, no symbol field
    symbol: log.symbol || log.instrument || log.reference || log.ticker || 'N/A',
    // API has type field (REPLICATED/MANUAL), not action/side
    action: log.action || log.side || log.orderSide || type,
    qty: log.qty || log.quantity || 0,
    price: log.price || log.entryPrice || log.avgPrice || 0,
    broker: log.broker || log.brokerName || 'N/A',
    childName: log.childName || log.child || log.childId || '',
    timestamp: log.timestamp || log.createdAt || log.time || '',
    children: log.children || log.followers || log.copiedAccounts || 0,
    message: log.message || '',
    reference: log.reference || '',
    error: log.error || log.reason || '',
    status:
      status === 'FAILED' || type === 'ERROR'
        ? 'error'
        : status === 'CANCELLED'
        ? 'warning'
        : 'success',
    raw: log,
  };
};

const normalizeSubscription = (subscription = {}, index = 0) => ({
  id: subscription.id || subscription.subscriptionId || `${subscription.masterId || 'subscription'}-${index}`,
  user: subscription.userName || subscription.masterName || subscription.name || 'Unknown',
  email: subscription.email || '',
  role: pickRole(subscription.role || 'MASTER'),
  plan: subscription.planName || subscription.plan || 'Subscription',
  status: String(subscription.status || 'ACTIVE')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()),
  startDate: toDateLabel(subscription.startDate || subscription.createdAt),
  nextBilling: toDateLabel(subscription.nextBillingDate || subscription.renewalDate),
  amount: Number(subscription.amount || subscription.price || subscription.subscriptionAmount || 0),
  masterId: subscription.masterId || subscription.userId || '',
  raw: subscription,
});

const normalizeAdminPosition = (pos = {}, index = 0) => ({
  id: pos.id || pos.positionId || `pos-${index}`,
  masterId: pos.masterId || '',
  masterName: pos.masterName || pos.master || 'Unknown',
  symbol: pos.symbol || pos.instrument || pos.tradingSymbol || 'N/A',
  exchange: pos.exchange || 'NSE',
  side: String(pos.side || pos.positionType || pos.direction || 'BUY').toUpperCase(),
  qty: Number(pos.qty || pos.quantity || pos.netQty || 0),
  avgPrice: Number(pos.avgPrice || pos.averagePrice || pos.entryPrice || 0),
  ltp: Number(pos.ltp || pos.lastPrice || pos.currentPrice || 0),
  pnl: Number(pos.pnl || pos.unrealizedPnl || pos.mtm || 0),
  pnlPct: Number(pos.pnlPct || pos.pnlPercent || pos.changePercent || 0),
  product: String(pos.product || pos.productType || 'MIS').toUpperCase(),
  broker: pos.broker || pos.brokerName || 'N/A',
  children: Number(pos.children || pos.childCount || pos.copiedCount || 0),
  raw: pos,
});

const normalizeMasterChildMap = (entry = {}, index = 0) => {
  const children = Array.isArray(entry.children) ? entry.children : [];

  return {
    id: entry.masterId || `master-map-${index}`,
    masterId: entry.masterId || `master-map-${index}`,
    masterName: entry.masterName || entry.name || 'Unknown',
    masterEmail: entry.masterEmail || entry.email || '',
    children: children.map((child, childIndex) => ({
      id: child.childId || `child-${childIndex}`,
      childId: child.childId || `child-${childIndex}`,
      name: child.name || child.childName || 'Unknown',
      email: child.email || '',
      status: String(child.status || 'UNKNOWN').toUpperCase(),
      scalingFactor: Number(child.scalingFactor ?? child.multiplier ?? 1),
      raw: child,
    })),
    childCount: children.length,
    raw: entry,
  };
};

const normalizeSystemHealthEntries = (payload = {}) => {
  // API returns a flat object: { status, database, kafka, redis, uptime }
  // NOT an array — handle the flat shape first, then fall back to array shape
  const source = payload?.data || payload;

  // Detect flat object shape (has a top-level "status" key that is a string like "UP")
  const isFlatObject =
    typeof source === 'object' &&
    !Array.isArray(source) &&
    typeof source.status === 'string' &&
    ['UP', 'DOWN', 'DISABLED', 'UNKNOWN'].includes(String(source.status).toUpperCase());

  if (isFlatObject) {
    // Convert flat health response into display-friendly rows
    const { uptime, status: overallStatus, ...services } = source;
    return Object.entries(services).map(([key, value], index) => {
      const isObjectValue = value && typeof value === 'object' && !Array.isArray(value);
      const serviceStatus = String(
        isObjectValue ? value.status || overallStatus || 'UNKNOWN' : value || 'UNKNOWN',
      ).toUpperCase();
      return {
        id: key || `service-${index}`,
        name: key.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, (c) => c.toUpperCase()),
        status: serviceStatus,
        latency: null,
        uptime: uptime || 'N/A',
        activeUsers: null,
        ordersToday: null,
        metric: isObjectValue
          ? [value.used, value.max].filter(Boolean).join(' / ') || serviceStatus
          : serviceStatus,
        raw: { key, value },
      };
    });
  }

  // Array shape fallback
  const entries = extractCollection(source);
  if (entries.length) {
    return entries.map((entry, index) => ({
      id: entry.id || entry.name || `system-${index}`,
      name: entry.name || entry.service || entry.broker || `Service ${index + 1}`,
      status: entry.status || entry.health || 'UNKNOWN',
      latency: toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs),
      uptime: entry.uptime || entry.availability || 'N/A',
      activeUsers: toFiniteNumberOrNull(entry.activeUsers, entry.connectedUsers),
      ordersToday: toFiniteNumberOrNull(entry.ordersToday, entry.requestsToday, entry.todayTrades),
      metric:
        entry.metric ||
        entry.value ||
        entry.currentValue ||
        (toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs) != null
          ? `${toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs)}ms`
          : entry.uptime || entry.availability || 'N/A'),
      raw: entry,
    }));
  }

  return [];
};

const normalizeAnalytics = (payload = {}) => {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;

  // Equity curve: try multiple field names, normalize to {label, equity, followers}
  const rawCurve = asArray(
    source.equityCurve || source.dailyStats || source.performanceChart || source.chartData,
  );
  const equityCurve = rawCurve.map((pt, i) => ({
    label: pt.label || pt.date || pt.day || `Day ${i + 1}`,
    equity: Number(pt.equity || pt.totalPnl || pt.pnl || pt.value || 0),
    followers: Number(pt.followerPnl || pt.followersValue || pt.followers || 0),
  }));

  return {
    totalUsers: Number(source.totalUsers ?? source.users ?? source.userCount ?? 0),
    activeMasters: Number(source.totalMasters ?? source.activeMasters ?? source.masterCount ?? 0),
    totalMasters: Number(source.totalMasters ?? source.activeMasters ?? 0),
    totalChildren: Number(source.totalChildren ?? source.childCount ?? 0),
    totalAdmins: Number(source.totalAdmins ?? 0),
    volumeToday: Number(source.totalTrades ?? source.volumeToday ?? source.todayVolume ?? 0),
    totalTrades: Number(source.totalTrades ?? 0),
    activeSubscriptions: Number(source.activeSubscriptions ?? 0),
    revenueMtd: Number(source.revenueMtd ?? source.monthlyRevenue ?? source.revenue ?? 0),
    // Child performance breakdown
    profitableChildren: Number(source.profitableChildren ?? source.profitable ?? 0),
    losingChildren: Number(source.losingChildren ?? source.lossMaking ?? source.losing ?? 0),
    pausedChildren: Number(source.pausedChildren ?? source.paused ?? 0),
    // Trade direction split
    buyOrders: Number(source.buyOrders ?? source.buys ?? source.buyCount ?? 0),
    sellOrders: Number(source.sellOrders ?? source.sells ?? source.sellCount ?? 0),
    // Other live fields
    openPositions: source.openPositions != null ? Number(source.openPositions) : null,
    todayPnl: source.todayPnl != null ? Number(source.todayPnl) : null,
    latency: source.latency != null ? Number(source.latency) : null,
    equityCurve,
    userGrowth: asArray(source.userGrowth || source.userGrowthData || source.growth),
    topMasters: asArray(source.topMasters || source.topPerformers || source.mastersByVolume),
    raw: source,
  };
};

export const adminService = {
  // ADM-12: pass through page/limit from params. Backend should honor these and
  // return total count (see extractMeta below) so the UI can stop client-side slicing.
  async getUsers(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/users', { params });
      return {
        users: extractCollection(response.data).map(normalizeAdminUser),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load users'));
    }
  },

  async getUser(userId) {
    try {
      const response = await api.get(`/api/v1/admin/users/${userId}`);
      return normalizeAdminUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load user details'));
    }
  },

  async updateUser(userId, body) {
    try {
      const response = await api.put(`/api/v1/admin/users/${userId}`, body);
      return normalizeAdminUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update user'));
    }
  },

  async deleteUser(userId) {
    try {
      await api.delete(`/api/v1/admin/users/${userId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete user'));
    }
  },

  async createMaster(body) {
    try {
      await api.post('/api/v1/admin/users/master', body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create master'));
    }
  },

  async createChild(body) {
    try {
      await api.post('/api/v1/admin/users/child', body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create child'));
    }
  },

  async activateUser(userId) {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/activate`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to activate user'));
    }
  },

  async deactivateUser(userId) {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/deactivate`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to deactivate user'));
    }
  },

  async getTradeLogs(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/trade-logs', { params });
      return {
        logs: extractCollection(response.data).map(normalizeTradeLog),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trade logs'));
    }
  },

  async getSystemHealth() {
    try {
      const response = await api.get('/api/v1/admin/system-health');
      return normalizeSystemHealthEntries(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load system health'));
    }
  },

  async getSubscriptions(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/subscriptions', { params });
      return {
        subscriptions: extractCollection(response.data).map(normalizeSubscription),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load subscriptions'));
    }
  },

  async getAnalytics() {
    try {
      const response = await api.get('/api/v1/admin/analytics');
      return normalizeAnalytics(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load analytics'));
    }
  },

  async getPositions(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/positions', { params });
      return extractCollection(response.data).map(normalizeAdminPosition);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getMasterChildMap() {
    try {
      const response = await api.get('/api/v1/admin/master-child-map');
      const payload = response.data?.data || response.data || {};
      const masters = Array.isArray(payload.masters) ? payload.masters : extractCollection(payload);
      return {
        masters: masters.map(normalizeMasterChildMap),
        total: Number(payload.total ?? masters.length),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load master-child map'));
    }
  },

  async getGlobalRiskSettings() {
    try {
      const response = await api.get('/api/v1/admin/settings/risk');
      // The backend returns a JSON string, which Axios parses if it's JSON.
      // If the backend returns empty string, we default to empty object.
      let data = response.data?.data || response.data || {};
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
      }
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load global risk settings'));
    }
  },

  async saveGlobalRiskSettings(settings) {
    try {
      await api.post('/api/v1/admin/settings/risk', JSON.stringify(settings), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to save global risk settings'));
    }
  },
};
