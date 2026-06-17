import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  SkipForward,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { childService } from '@/lib/child';
import { engineService } from '@/lib/engine';
import { useToast } from '@/components/shared/Toast';

const SKIP_REASON_LABELS = {
  ZERO_QUANTITY: 'Scaled quantity is zero',
  SUB_LOT_SIZE: 'Below one F&O lot after scaling',
  RISK_LIMIT: 'Risk limit reached',
  MAX_CAPITAL_EXPOSURE: 'Margin utilization too high',
  NO_POSITION: 'No copied BUY position for this symbol',
  INSUFFICIENT_POSITION: 'Not enough shares to sell',
  SELL_BLOCKED: 'Sell not allowed in this subscription',
  MARKET_CLOSED: 'Market closed: intraday copy blocked',
  COPY_PAUSED: 'Copy trading paused',
  SESSION_EXPIRED: 'Broker session expired',
};

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
];

const STATUS_FILTERS = ['ALL', 'SUCCESS', 'FAILED', 'SKIPPED'];
const SIDE_FILTERS = ['ALL', 'BUY', 'SELL'];

const toDateInputValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const getTradeTime = (trade) => {
  const raw = trade.myOrderPlacedAt || trade.masterTriggeredAt || trade.raw?.createdAt || trade.raw?.timestamp;
  const date = new Date(raw || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRange = (preset, customFrom, customTo) => {
  if (preset === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    const to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
    return { from, to };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  if (preset === 'today') return { from: todayStart, to: todayEnd };

  if (preset === 'yesterday') {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 1);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (preset === '7d' || preset === '30d') {
    const days = preset === '7d' ? 7 : 30;
    const from = new Date(todayStart);
    from.setDate(from.getDate() - (days - 1));
    return { from, to: todayEnd };
  }

  return { from: null, to: null };
};

const fmtTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const fmtDayLabel = (date) => {
  if (!date) return 'Unknown Date';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${fmtDayLabel(d)}, ${fmtTime(iso)}`;
};

const normalizeStatus = (status) => String(status || '').toUpperCase();

const getStatusMeta = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'SUCCESS' || normalized === 'EXECUTED') {
    return {
      label: 'Success',
      icon: CheckCircle2,
      border: 'border-emerald-500/20',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    };
  }
  if (normalized === 'FAILED') {
    return {
      label: 'Failed',
      icon: AlertCircle,
      border: 'border-rose-500/20',
      text: 'text-rose-500',
      bg: 'bg-rose-500/10',
    };
  }
  if (normalized === 'SKIPPED') {
    return {
      label: 'Skipped',
      icon: SkipForward,
      border: 'border-amber-500/20',
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
    };
  }
  return {
    label: normalized || 'Unknown',
    icon: Activity,
    border: 'border-border/40',
    text: 'text-muted-foreground',
    bg: 'bg-black/5 dark:bg-white/5',
  };
};

const LatencyBadge = ({ ms }) => {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return <span className="text-xs text-muted-foreground">-</span>;
  const color = value < 300 ? 'text-emerald-500' : value < 600 ? 'text-amber-500' : 'text-rose-500';
  return <span className={`text-xs font-black tabular-nums ${color}`}>{value}ms</span>;
};

const StatCard = ({ label, value, sub, icon: Icon, tone = 'text-brand-purple' }) => (
  <GlassCard hover={false} className="border-border/60">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`mt-2 text-2xl font-black tabular-nums ${tone}`}>{value}</p>
        {sub && <p className="mt-1 text-[11px] font-medium text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5">
        <Icon className={`h-4.5 w-4.5 ${tone}`} />
      </div>
    </div>
  </GlassCard>
);

const TradeTimeline = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sideFilter, setSideFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [skipReasonLabels, setSkipReasonLabels] = useState(SKIP_REASON_LABELS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await childService.getTradeTimeline();
      setTrades(Array.isArray(data) ? data : []);
    } catch (e) {
      addToast(e.message || 'Unable to load trade timeline', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    engineService.getMetadata()
      .then((meta) => {
        if (meta?.skipReasons && typeof meta.skipReasons === 'object') {
          setSkipReasonLabels((prev) => ({ ...prev, ...meta.skipReasons }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const filteredTrades = useMemo(() => {
    const { from, to } = getDateRange(datePreset, customFrom, customTo);
    const text = query.trim().toLowerCase();

    return trades.filter((trade) => {
      const tradeDate = getTradeTime(trade);
      if (from && (!tradeDate || tradeDate < from)) return false;
      if (to && (!tradeDate || tradeDate > to)) return false;

      const status = normalizeStatus(trade.status);
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUCCESS' && ['SUCCESS', 'EXECUTED'].includes(status)) ||
        status === statusFilter;
      if (!statusMatch) return false;

      const side = String(trade.side || '').toUpperCase();
      if (sideFilter !== 'ALL' && side !== sideFilter) return false;

      if (!text) return true;
      return [
        trade.symbol,
        trade.masterName,
        trade.eventId,
        trade.orderId,
        trade.broker,
        trade.skipReason,
      ].some((value) => String(value || '').toLowerCase().includes(text));
    });
  }, [trades, datePreset, customFrom, customTo, statusFilter, sideFilter, query]);

  const groupedTrades = useMemo(() => {
    const groups = new Map();
    filteredTrades.forEach((trade) => {
      const date = getTradeTime(trade);
      const key = date ? toDateInputValue(date) : 'unknown';
      if (!groups.has(key)) {
        groups.set(key, { key, date, label: date ? fmtDayLabel(date) : 'Unknown Date', rows: [] });
      }
      groups.get(key).rows.push(trade);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: group.rows.sort((a, b) => {
          const aDate = getTradeTime(a)?.getTime() || 0;
          const bDate = getTradeTime(b)?.getTime() || 0;
          return bDate - aDate;
        }),
      }))
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [filteredTrades]);

  const summary = useMemo(() => {
    const successful = filteredTrades.filter((trade) => ['SUCCESS', 'EXECUTED'].includes(normalizeStatus(trade.status))).length;
    const failed = filteredTrades.filter((trade) => normalizeStatus(trade.status) === 'FAILED').length;
    const skipped = filteredTrades.filter((trade) => normalizeStatus(trade.status) === 'SKIPPED').length;
    const latencies = filteredTrades
      .map((trade) => Number(trade.totalChildLatencyMs))
      .filter((value) => Number.isFinite(value) && value > 0);
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : null;

    return {
      total: filteredTrades.length,
      successful,
      failed,
      skipped,
      avgLatency,
    };
  }, [filteredTrades]);

  const clearFilters = () => {
    setDatePreset('today');
    setCustomFrom('');
    setCustomTo('');
    setStatusFilter('ALL');
    setSideFilter('ALL');
    setQuery('');
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-purple">
            <Clock className="h-3.5 w-3.5" />
            Child Copy Timeline
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Trade Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review copied, skipped, and failed trades by day with latency details.</p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-black/5 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Filtered Trades" value={summary.total} sub={`${trades.length} loaded`} icon={Activity} tone="text-brand-purple" />
        <StatCard label="Successful" value={summary.successful} sub="Copied to broker" icon={CheckCircle2} tone="text-emerald-500" />
        <StatCard label="Skipped" value={summary.skipped} sub="Guardrail or session skip" icon={SkipForward} tone="text-amber-500" />
        <StatCard label="Failed" value={summary.failed} sub="Broker or engine failure" icon={AlertCircle} tone="text-rose-500" />
        <StatCard label="Avg Latency" value={summary.avgLatency != null ? `${summary.avgLatency}ms` : '-'} sub="Filtered successful rows" icon={Zap} tone="text-brand-blue" />
      </div>

      <GlassCard hover={false} className="border-border/60">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black">Timeline Filters</p>
            <p className="text-xs text-muted-foreground">Filter by day, status, side, symbol, master, broker, or event ID.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setDatePreset(preset.key)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                    datePreset === preset.key
                      ? 'border-brand-purple/40 bg-brand-purple/10 text-brand-purple'
                      : 'border-border/60 bg-black/5 text-muted-foreground hover:text-foreground dark:bg-white/5'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setDatePreset('custom')}
                className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  datePreset === 'custom'
                    ? 'border-brand-purple/40 bg-brand-purple/10 text-brand-purple'
                    : 'border-border/60 bg-black/5 text-muted-foreground hover:text-foreground dark:bg-white/5'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Custom
              </button>
            </div>

            {datePreset === 'custom' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-black/5 px-3 text-sm font-bold outline-none transition-colors focus:border-brand-purple dark:bg-white/5"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-black/5 px-3 text-sm font-bold outline-none transition-colors focus:border-brand-purple dark:bg-white/5"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1.6fr]">
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
              <DivSelect
                value={statusFilter}
                onChange={setStatusFilter}
                includeEmptyOption={false}
                options={STATUS_FILTERS.map((status) => ({
                  value: status,
                  label: status === 'ALL' ? 'All Status' : status,
                }))}
                triggerClassName="h-10 w-full rounded-xl border border-border bg-black/5 px-3 text-sm font-bold outline-none transition-colors focus:border-brand-purple dark:bg-white/5"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Side</span>
              <DivSelect
                value={sideFilter}
                onChange={setSideFilter}
                includeEmptyOption={false}
                options={SIDE_FILTERS.map((side) => ({
                  value: side,
                  label: side === 'ALL' ? 'All Sides' : side,
                }))}
                triggerClassName="h-10 w-full rounded-xl border border-border bg-black/5 px-3 text-sm font-bold outline-none transition-colors focus:border-brand-purple dark:bg-white/5"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Symbol, master, broker, event..."
                  className="h-10 w-full rounded-xl border border-border bg-black/5 pl-9 pr-3 text-sm font-bold outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-purple dark:bg-white/5"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
          <p className="text-xs font-bold text-muted-foreground">
            Showing {filteredTrades.length} of {trades.length} timeline rows
          </p>
          <button
            onClick={clearFilters}
            className="text-xs font-black uppercase tracking-widest text-brand-purple hover:underline"
          >
            Reset filters
          </button>
        </div>
      </GlassCard>

      {loading ? (
        <SkeletonLoader type="card" count={5} />
      ) : trades.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
              <Activity className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-tight">No Trades Yet</h3>
            <p className="mt-2 max-w-[280px] text-xs text-muted-foreground">
              Your copy trade timeline will appear here once your master places trades.
            </p>
          </div>
        </GlassCard>
      ) : groupedTrades.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
              <Search className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-bold uppercase tracking-tight">No Trades Found</h3>
            <p className="mt-2 max-w-[280px] text-xs text-muted-foreground leading-relaxed">
              {datePreset === 'today'
                ? `No trades today — ${trades.length} trade${trades.length !== 1 ? 's' : ''} in the last 30 days.`
                : 'No trades match the current filters.'}
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              {datePreset === 'today' && trades.length > 0 && (
                <button
                  onClick={() => setDatePreset('30d')}
                  className="text-xs font-black uppercase tracking-widest text-brand-purple hover:underline"
                >
                  Show last 30 days ({trades.length})
                </button>
              )}
              <button onClick={clearFilters} className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:underline">
                Reset all filters
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {groupedTrades.map((group) => {
            const daySuccess = group.rows.filter((trade) => ['SUCCESS', 'EXECUTED'].includes(normalizeStatus(trade.status))).length;
            const daySkipped = group.rows.filter((trade) => normalizeStatus(trade.status) === 'SKIPPED').length;
            const dayFailed = group.rows.filter((trade) => normalizeStatus(trade.status) === 'FAILED').length;

            return (
              <section key={group.key} className="space-y-3">
                <div className="sticky top-20 z-20 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-lg backdrop-blur-xl">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wide">{group.label}</h2>
                        <p className="text-xs text-muted-foreground">{group.rows.length} trade{group.rows.length === 1 ? '' : 's'} for this day</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-500">{daySuccess} Success</span>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-500">{daySkipped} Skipped</span>
                      <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-500">{dayFailed} Failed</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.rows.map((trade, idx) => {
                    const status = normalizeStatus(trade.status);
                    const meta = getStatusMeta(status);
                    const StatusIcon = meta.icon;
                    const isExpanded = expandedId === trade.eventId;
                    const side = String(trade.side || 'BUY').toUpperCase();
                    const skipLabel = skipReasonLabels[trade.skipReason] || trade.skipReason || null;

                    return (
                      <motion.div
                        key={trade.eventId || `${group.key}-${idx}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.025 }}
                      >
                        <GlassCard
                          className={`cursor-pointer transition-all ${meta.border}`}
                          onClick={() => setExpandedId(isExpanded ? null : trade.eventId)}
                        >
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)] lg:items-center">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                                <StatusIcon className={`h-5 w-5 ${meta.text}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-base font-black uppercase tracking-tight">
                                    {trade.symbol || 'UNKNOWN'}
                                  </span>
                                  <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${
                                    side === 'SELL'
                                      ? 'border-rose-500/25 bg-rose-500/10 text-rose-500'
                                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {side}
                                  </span>
                                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.bg} ${meta.text}`}>
                                    {meta.label}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                                  <span><span className="font-black text-foreground">Master:</span> {trade.masterName || 'Master'}</span>
                                  <span><span className="font-black text-foreground">Qty:</span> {trade.qty || '-'}</span>
                                  <span><span className="font-black text-foreground">Broker:</span> {trade.broker || '-'}</span>
                                  <span><span className="font-black text-foreground">Order:</span> {trade.orderId || '-'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-black/5 px-3 py-2 dark:bg-white/5">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Placed</p>
                                <p className="text-xs font-bold">{fmtTime(trade.myOrderPlacedAt || trade.masterTriggeredAt)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latency</p>
                                <LatencyBadge ms={trade.totalChildLatencyMs} />
                              </div>
                              <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {status === 'SKIPPED' && skipLabel && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                              <SkipForward className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {skipLabel}
                                {(trade.skipReason === 'SESSION_EXPIRED' || trade.skipReason === 'SESSION_INACTIVE') && (
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
    navigate('/child/overview');
                                    }}
                                    className="text-xs font-bold text-amber-500 underline hover:no-underline ml-2"
                                  >
                                    Re-login broker -
                                  </button>
                                )}
                              </p>
                            </div>
                          )}

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-4 border-t border-border/40 pt-4"
                            >
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div>
                                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Execution Path</p>
                                  <div className="relative space-y-4 border-l border-dashed border-border/70 pl-4">
                                    <div className="relative">
                                      <div className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full bg-brand-purple" />
                                      <div className="flex justify-between gap-4">
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-purple">Master Triggered</p>
                                          <p className="mt-0.5 text-xs text-muted-foreground">{trade.masterName || 'Master'} placed {side}</p>
                                        </div>
                                        <p className="shrink-0 text-[10px] font-mono text-muted-foreground">{fmtDateTime(trade.masterTriggeredAt)}</p>
                                      </div>
                                    </div>

                                    <div className="relative">
                                      <div className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ${
                                        status === 'SUCCESS' || status === 'EXECUTED'
                                          ? 'bg-emerald-500'
                                          : status === 'FAILED'
                                          ? 'bg-rose-500'
                                          : 'bg-amber-500'
                                      }`} />
                                      <div className="flex justify-between gap-4">
                                        <div>
                                          <p className={`text-[10px] font-black uppercase tracking-widest ${meta.text}`}>Child Order {meta.label}</p>
                                          <p className="mt-0.5 text-xs text-muted-foreground">
                                            Latency <LatencyBadge ms={trade.totalChildLatencyMs} />
                                          </p>
                                        </div>
                                        <p className="shrink-0 text-[10px] font-mono text-muted-foreground">{fmtDateTime(trade.myOrderPlacedAt)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    ['Event ID', trade.eventId || '-'],
                                    ['Broker', trade.broker || '-'],
                                    ['Order ID', trade.orderId || '-'],
                                    ['Quantity', trade.qty || '-'],
                                    ['Product', trade.product || '-'],
                                    ['Order Type', trade.orderType || '-'],
                                    ['Price', trade.price != null && trade.price !== 0 ? Number(trade.price).toFixed(2) : '-'],
                                    ['Trigger Price', trade.triggerPrice != null && Number(trade.triggerPrice) > 0 ? Number(trade.triggerPrice).toFixed(2) : '-'],
                                    ['Status', meta.label],
                                    ['Skip Reason', skipLabel || '-'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl border border-border/50 bg-black/5 px-3 py-2 dark:bg-white/5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                      <p className="mt-1 truncate text-xs font-bold">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TradeTimeline;
