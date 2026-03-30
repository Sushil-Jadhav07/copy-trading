import api from '@/lib/api';
import { authService } from '@/lib/auth';

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

export const normalizeAdminUser = (payload = {}) => {
  const user = authService.getMe ? payload : payload;

  return {
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
  };
};

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
  const type = String(log.type || log.eventType || log.status || 'EXECUTED').toUpperCase();
  const action = String(log.action || log.side || log.orderSide || 'BUY').toUpperCase();
  const status = String(log.status || log.executionStatus || '').toUpperCase();

  return {
    id: log.id || log.logId || `${type}-${index}`,
    type,
    master: log.masterName || log.master || log.userName || log.name || 'Unknown',
    symbol: log.symbol || log.instrument || log.ticker || 'N/A',
    action,
    qty: log.qty || log.quantity || 0,
    price: log.price || log.entryPrice || log.avgPrice || 0,
    broker: log.broker || log.brokerName || 'N/A',
    childName: log.childName || log.child || '',
    timestamp: log.timestamp || log.createdAt || log.time || '',
    children: log.children || log.followers || log.copiedAccounts || 0,
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

const normalizeSystemHealthEntries = (payload = {}) => {
  const entries = extractCollection(payload);

  if (entries.length) {
    return entries.map((entry, index) => ({
      id: entry.id || entry.name || `system-${index}`,
      name: entry.name || entry.service || entry.broker || `Service ${index + 1}`,
      status: entry.status || entry.health || 'UNKNOWN',
      latency: Number(entry.latency || entry.responseTime || 0),
      uptime: entry.uptime || entry.availability || 'N/A',
      activeUsers: Number(entry.activeUsers || entry.connectedUsers || 0),
      ordersToday: Number(entry.ordersToday || entry.requestsToday || 0),
      raw: entry,
    }));
  }

  return Object.entries(payload || {}).map(([key, value], index) => ({
    id: key || `system-${index}`,
    name: key.replace(/([A-Z])/g, ' $1').trim() || `Service ${index + 1}`,
    status:
      value?.status ||
      value?.health ||
      (typeof value === 'string' ? value : 'UNKNOWN'),
    latency: Number(value?.latency || value?.responseTime || 0),
    uptime: value?.uptime || value?.availability || 'N/A',
    activeUsers: Number(value?.activeUsers || value?.connectedUsers || 0),
    ordersToday: Number(value?.ordersToday || value?.requestsToday || 0),
    raw: value,
  }));
};

const normalizeAnalytics = (payload = {}) => {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;

  return {
    totalUsers: Number(source.totalUsers || source.users || source.userCount || 0),
    activeMasters: Number(source.activeMasters || source.masters || source.masterCount || 0),
    volumeToday: Number(source.volumeToday || source.todayVolume || source.tradeVolume || 0),
    revenueMtd: Number(source.revenueMtd || source.monthlyRevenue || source.revenue || 0),
    userGrowth: asArray(source.userGrowth || source.userGrowthData || source.growth),
    topMasters: asArray(source.topMasters || source.topPerformers || source.mastersByVolume),
    raw: source,
  };
};

export const adminService = {
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
      return extractCollection(response.data).map(normalizeTradeLog);
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
      return extractCollection(response.data).map(normalizeSubscription);
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
};

