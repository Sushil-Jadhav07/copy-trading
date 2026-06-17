import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { engineService } from '@/lib/engine';
import { useToast } from '@/components/shared/Toast';
import { safeSum, safeDiv, safeMul, roundTo } from '@/lib/utils';

const RANGE_OPTIONS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
  { key: 'month',     label: 'This Month' },
  { key: 'all',       label: 'All' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Events' },
  { value: 'SUCCESS', label: 'Has Success' },
  { value: 'FAILED', label: 'Has Failed' },
  { value: 'PARTIAL', label: 'Partial' },
];

const SIDE_OPTIONS = [
  { value: 'ALL', label: 'All Sides' },
  { value: 'BUY', label: 'BUY' },
  { value: 'SELL', label: 'SELL' },
];

const toApiIso = (date) => date.toISOString();

const getRange = (key) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  if (key === 'today') return { from: todayStart, to: todayEnd, statsDays: 1 };

  if (key === 'yesterday') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 1);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to, statsDays: 1 };
  }

  if (key === 'week') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    return { from, to: todayEnd, statsDays: 7 };
  }

  if (key === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to: todayEnd, statsDays: 30 };
  }

  if (key === 'all') return { from: new Date(0), to: todayEnd, statsDays: 30 };

  return { from: todayStart, to: todayEnd, statsDays: 1 };
};

const fmtTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  const prefix = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${prefix}, ${fmtTime(iso)}`;
};

const getEventTimestamp = (event) => {
  const raw = event?.masterTriggeredAt || event?.triggeredAt || event?.createdAt || event?.updatedAt;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const LatencyBar = ({ ms, maxMs = 1000 }) => {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return <span className="text-xs text-muted-foreground">-</span>;
  const pct = Math.min(100, Math.round((value / maxMs) * 100));
  const color = value < 300 ? 'bg-emerald-500' : value < 600 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor = value < 300 ? 'text-emerald-500' : value < 600 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`shrink-0 text-xs font-black tabular-nums ${textColor}`}>{value}ms</span>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, accent = 'emerald' }) => {
  const tone =
    accent === 'rose' ? 'text-rose-500' :
    accent === 'amber' ? 'text-amber-500' :
    accent === 'cyan' ? 'text-cyan-500' :
    'text-emerald-500';

  return (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: 'easeOut' }}
  >
    <GlassCard hover={false} className="border-border/60 transition-colors duration-200 hover:border-emerald-500/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-black tabular-nums ${tone}`}>{value ?? '-'}</p>
          {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
            <Icon className={`h-4.5 w-4.5 ${tone}`} />
          </div>
        )}
      </div>
    </GlassCard>
  </motion.div>
  );
};

const LatencyHistory = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({ content: [], totalElements: 0 });
  const [page, setPage] = useState(0);
  const [rangeKey, setRangeKey] = useState('today');
  const [sideFilter, setSideFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventDetail, setEventDetail] = useState({});

  const selectedRange = useMemo(() => getRange(rangeKey), [rangeKey]);

  const loadStats = useCallback(async (range) => {
    try {
      const res = await engineService.getLatencyStats(range.statsDays === 30 ? 30 : range.statsDays === 1 ? 1 : 7);
      setStats(res);
    } catch (e) {
      addToast(e.message || 'Failed to load latency stats', 'error');
    }
  }, [addToast]);

  const loadHistory = useCallback(async (p = 0, range = selectedRange, side = sideFilter) => {
    setLoadingHistory(true);
    try {
      const params = {
        // Engine trade-history endpoint is 0-based: first page is page=0.
        page: p,
        size: 20,
        from: toApiIso(range.from),
        to: toApiIso(range.to),
        ...(side !== 'ALL' ? { side } : {}),
      };
      const res = await engineService.getTradeHistory(params);
      setHistory(res);
      setPage(p);
    } catch (e) {
      addToast(e.message || 'Failed to load trade history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [addToast, selectedRange, sideFilter]);

  const loadAll = useCallback(async (range = selectedRange) => {
    setLoading(true);
    await Promise.all([loadStats(range), loadHistory(0, range, sideFilter)]);
    setLoading(false);
  }, [loadStats, loadHistory, selectedRange, sideFilter]);

  useEffect(() => {
    loadAll(selectedRange);
  }, []);

  const handleRangeChange = (nextKey) => {
    const nextRange = getRange(nextKey);
    setRangeKey(nextKey);
    setExpandedEvent(null);
    loadAll(nextRange);
  };

  const handleSideChange = (nextSide) => {
    setSideFilter(nextSide);
    setExpandedEvent(null);
    loadHistory(0, selectedRange, nextSide);
  };

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rangeStartMs = selectedRange.from.getTime();
    const rangeEndMs = selectedRange.to.getTime();

    const list = (history.content || []).filter((event) => {
      const ts = getEventTimestamp(event);
      if (ts == null || ts < rangeStartMs || ts > rangeEndMs) return false;

      const childrenTotal = Number(event.childrenTotal || 0);
      const childrenSucceeded = Number(event.childrenSucceeded || 0);
      const childrenFailed = Number(event.childrenFailed || 0);
      const eventStatus =
        childrenTotal > 0 && childrenSucceeded === childrenTotal
          ? 'SUCCESS'
          : childrenSucceeded > 0 && childrenFailed > 0
          ? 'PARTIAL'
          : childrenFailed > 0
          ? 'FAILED'
          : 'UNKNOWN';

      if (statusFilter !== 'ALL' && eventStatus !== statusFilter) return false;

      if (!search) return true;
      return [
        event.symbol,
        event.side,
        event.eventId,
        event.masterQty,
      ].some((value) => String(value || '').toLowerCase().includes(search));
    });

    return list.sort((a, b) => {
      const aTs = getEventTimestamp(a) ?? 0;
      const bTs = getEventTimestamp(b) ?? 0;
      return bTs - aTs;
    });
  }, [history.content, query, statusFilter, selectedRange]);

  const displayStats = useMemo(() => {
    const latencies = filteredEvents
      .map((event) => Number(event.avgChildLatencyMs))
      .filter((value) => Number.isFinite(value) && value > 0);
    const avgLatency = latencies.length
      ? roundTo(safeDiv(safeSum(latencies), latencies.length), 0)
      : null;
    const totalChildren = safeSum(filteredEvents.map((e) => e.childrenTotal));
    const succeeded     = safeSum(filteredEvents.map((e) => e.childrenSucceeded));
    const failed        = safeSum(filteredEvents.map((e) => e.childrenFailed));
    const successRate   = totalChildren ? roundTo(safeMul(safeDiv(succeeded, totalChildren), 100), 1) : null;

    return {
      avgLatency,
      successRate,
      failed,
      eventCount: filteredEvents.length,
      p95: stats?.p95LatencyMs,
      max: Math.max(1000, stats?.maxTotalLatencyMs || 1000, ...latencies),
    };
  }, [filteredEvents, stats]);

  const toggleEventDetail = async (eventId) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(eventId);
    if (!eventDetail[eventId]) {
      try {
        const detail = await engineService.getTradeHistoryEvent(eventId);
        setEventDetail((prev) => ({ ...prev, [eventId]: detail }));
      } catch {
        addToast('Failed to load event detail', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <Clock className="h-3.5 w-3.5" />
            Master Copy Events
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Latency & Trade History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Filter copy events by day, side, status, symbol, or event ID.</p>
        </div>
        <button
          onClick={() => loadAll(selectedRange)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-black/5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors duration-200 hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <GlassCard hover={false} className="border-border/60 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-sm font-bold">Filters</p>
              <p className="text-xs text-muted-foreground">Choose a window, side, status, or event.</p>
            </div>
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
              {filteredEvents.length} visible
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="inline-flex items-center ">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handleRangeChange(option.key)}
                className={`rounded-full px-4 py-1 text-xs font-bold transition-all ${
                  rangeKey === option.key
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Side</span>
              <DivSelect
                value={sideFilter}
                onChange={handleSideChange}
                includeEmptyOption={false}
                options={SIDE_OPTIONS}
                triggerClassName="h-9 w-full rounded-lg border border-border bg-transparent px-3 text-sm font-semibold outline-none transition-colors focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
              <DivSelect
                value={statusFilter}
                onChange={setStatusFilter}
                includeEmptyOption={false}
                options={STATUS_OPTIONS}
                triggerClassName="h-9 w-full rounded-lg border border-border bg-transparent px-3 text-sm font-semibold outline-none transition-colors focus:border-emerald-500"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Symbol or event"
                  className="h-9 w-full rounded-lg border border-border bg-transparent pl-9 pr-3 text-sm font-semibold outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-emerald-500"
                />
              </div>
            </label>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Avg Latency" value={displayStats.avgLatency != null ? `${displayStats.avgLatency}ms` : '-'} sub={`${displayStats.eventCount} filtered events`} icon={Clock} accent="cyan" />
          <StatCard label="Success Rate" value={displayStats.successRate != null ? `${roundTo(displayStats.successRate, 1)}%` : '-'} sub="Per-child outcomes" icon={CheckCircle2} accent="emerald" />
          <StatCard label="Latency" value={displayStats.p95 != null ? `${displayStats.p95}ms` : '-'} sub={`Stats window: ${rangeKey}`} icon={TrendingUp} accent="amber" />
          <StatCard label="Failed Children" value={displayStats.failed} sub="Across filtered events" icon={AlertCircle} accent="rose" />
        </div>
      )}

      <GlassCard noPadding>
        <div className="flex items-center justify-between gap-4 border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-purple/10">
              <Activity className="h-4.5 w-4.5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-sm font-black">Copy Event Log</h2>
              <p className="text-xs text-muted-foreground">
                Showing {filteredEvents.length} of {history.totalElements ?? 0} events
              </p>
            </div>
          </div>
          {loadingHistory && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {loadingHistory && page === 0 ? (
          <div className="p-6">
            <SkeletonLoader type="table" rows={5} columns={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/3 dark:bg-white/3">
                  {['Symbol', 'Side', 'Master Qty', 'Triggered', 'Avg Latency', 'Children', 'Actions'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                <AnimatePresence initial={false}>
                  {filteredEvents.map((event, idx) => {
                    const isOpen = expandedEvent === event.eventId;
                    const detail = eventDetail[event.eventId];
                    const successRate = event.childrenTotal > 0
                      ? Math.round((event.childrenSucceeded / event.childrenTotal) * 100)
                      : 0;

                    return (
                      <React.Fragment key={event.eventId || idx}>
                        <motion.tr
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/2"
                        >
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black uppercase">{event.symbol || '-'}</span>
                              <span className="max-w-[220px] truncate text-[10px] font-mono text-muted-foreground">
                                {event.eventId || 'No event ID'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded border px-2 py-0.5 text-xs font-black ${
                              String(event.side).toUpperCase() === 'SELL'
                                ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {event.side || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-black tabular-nums">{event.masterQty ?? '-'}</td>
                          <td className="px-5 py-4 text-xs font-bold text-muted-foreground">{fmtDate(event.masterTriggeredAt)}</td>
                          <td className="px-5 py-4">
                            <LatencyBar ms={event.avgChildLatencyMs} maxMs={displayStats.max} />
                            {event.minChildLatencyMs != null && (
                              <p className="mt-1 text-[9px] text-muted-foreground">
                                {event.minChildLatencyMs}-{event.maxChildLatencyMs}ms
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs font-black text-emerald-500">
                                <CheckCircle2 className="h-3 w-3" /> {event.childrenSucceeded ?? 0}
                              </span>
                              {event.childrenFailed > 0 && (
                                <span className="flex items-center gap-1 text-xs font-black text-rose-500">
                                  <AlertCircle className="h-3 w-3" /> {event.childrenFailed}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">/ {event.childrenTotal ?? 0}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => toggleEventDetail(event.eventId)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-purple transition-colors duration-200 hover:bg-brand-purple/10"
                            >
                              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {isOpen ? 'Hide' : 'Detail'}
                            </button>
                          </td>
                        </motion.tr>

                        <AnimatePresence initial={false}>
                          {isOpen && detail && (
                            <motion.tr
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <td colSpan={7} className="bg-black/3 px-5 py-0 dark:bg-white/3">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="py-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Per-Child Breakdown</p>
                                      <span className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-[10px] font-black text-brand-purple">
                                        {successRate}% success
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {(detail.children || []).map((child, ci) => (
                                        <motion.div
                                          key={`${child.orderId || child.childName || 'child'}-${ci}`}
                                          initial={{ opacity: 0, y: 6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: ci * 0.025, duration: 0.2 }}
                                          className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/70 px-4 py-3 transition-colors duration-200 hover:border-brand-purple/20 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${
                                              String(child.status).toUpperCase() === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`} />
                                            <span className="text-sm font-bold">{child.childName || 'Child'}</span>
                                            {child.broker && (
                                              <span className="rounded border border-border/30 bg-black/5 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground dark:bg-white/5">
                                                {child.broker}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-4">
                                            <span className={`text-xs font-black ${
                                              String(child.status).toUpperCase() === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                              {child.status || '-'}
                                            </span>
                                            <LatencyBar ms={child.totalChildLatencyMs} maxMs={displayStats.max} />
                                            {child.orderId && <span className="text-[10px] font-mono text-muted-foreground">{child.orderId}</span>}
                                          </div>
                                        </motion.div>
                                      ))}
                                      {(!detail.children || detail.children.length === 0) && (
                                        <p className="py-2 text-xs italic text-muted-foreground">No child data available for this event.</p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredEvents.length === 0 && !loadingHistory && (
              <div className="py-20 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm font-bold uppercase tracking-tight">No Events Found</p>
                <p className="mt-1 text-xs text-muted-foreground">Adjust the range, side, status, or search filters.</p>
              </div>
            )}

            {(history.totalElements || 0) > 20 && (
              <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {page * 20 + 1}-{Math.min((page + 1) * 20, history.totalElements)} of {history.totalElements}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0 || loadingHistory}
                    onClick={() => loadHistory(page - 1)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
                  >
                    Prev
                  </button>
                  <button
                    disabled={(page + 1) * 20 >= (history.totalElements || 0) || loadingHistory}
                    onClick={() => loadHistory(page + 1)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default LatencyHistory;
