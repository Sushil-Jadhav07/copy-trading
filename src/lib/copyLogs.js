import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/**
 * Normalize a copy-log entry to include the new timing & latency fields
 * added in the May 2026 API update.
 */
const normalizeCopyLog = (entry) => ({
  ...entry,
  // Timing fields
  masterTriggeredAt: entry.masterTriggeredAt || entry.triggeredAt || null,
  completedAt: entry.completedAt || null,
  totalExecutionMs: entry.totalExecutionMs != null ? Number(entry.totalExecutionMs) : null,
  // Trade metadata
  exchange: entry.exchange || '',
  segment: entry.segment || '',
  product: entry.product || '',
  orderType: entry.orderType || '',
  // Per-child results (if returned)
  results: Array.isArray(entry.results)
    ? entry.results.map((r) => ({
        ...r,
        latencyMs: r.latencyMs != null ? Number(r.latencyMs) : null,
        placedAt: r.placedAt || null,
      }))
    : [],
});

export const copyLogService = {
  async getAll() {
    try {
      const res = await api.get('/api/v1/master/copy/logs');
      const raw = res.data?.logs || res.data || [];
      return Array.isArray(raw) ? raw.map(normalizeCopyLog) : raw;
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/child/copy/logs');
        const raw = fallback.data?.logs || fallback.data || [];
        return Array.isArray(raw) ? raw.map(normalizeCopyLog) : raw;
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load copy logs'));
      }
    }
  },
};
