import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, CheckCircle2, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronRight,
  TrendingUp, Users, Zap, BarChart3
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { engineService } from '@/lib/engine';
import { useToast } from '@/components/shared/Toast';

const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today ${fmtTime(iso)}`;
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${fmtTime(iso)}`;
};

const LatencyBar = ({ ms, maxMs = 1000 }) => {
  if (ms == null) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.min(100, Math.round((ms / maxMs) * 100));
  const color = ms < 300 ? 'bg-emerald-500' : ms < 600 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor = ms < 300 ? 'text-emerald-500' : ms < 600 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-black tabular-nums shrink-0 ${textColor}`}>{ms}ms</span>
    </div>
  );
};

const StatCard = ({ label, value, sub, icon: Icon, color = 'text-brand-purple' }) => (
  <GlassCard hover={false} className="border-border/60">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={`text-2xl font-black mt-1 tabular-nums ${color}`}>{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className={`w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
      )}
    </div>
  </GlassCard>
);

const LatencyHistory = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({ content: [], totalElements: 0 });
  const [page, setPage] = useState(0);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventDetail, setEventDetail] = useState({});

  const loadStats = useCallback(async (d) => {
    try {
      const res = await engineService.getLatencyStats(d);
      setStats(res);
    } catch (e) {
      addToast(e.message || 'Failed to load latency stats', 'error');
    }
  }, [addToast]);

  const loadHistory = useCallback(async (p = 0) => {
    setLoadingHistory(true);
    try {
      const res = await engineService.getTradeHistory({ page: p, size: 20 });
      setHistory(res);
      setPage(p);
    } catch (e) {
      addToast(e.message || 'Failed to load trade history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [addToast]);

  const loadAll = useCallback(async (d = 7) => {
    setLoading(true);
    await Promise.all([loadStats(d), loadHistory(0)]);
    setLoading(false);
  }, [loadStats, loadHistory]);

  useEffect(() => { loadAll(days); }, []);

  const handleDaysChange = (d) => {
    setDays(d);
    loadStats(d);
  };

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
      } catch (e) {
        addToast('Failed to load event detail', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Latency & Trade History</h1>
          <p className="text-sm text-muted-foreground">Master copy execution speed and per-child breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  days === d ? 'bg-brand-purple text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => loadAll(days)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-xs font-bold uppercase hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Avg Latency"
            value={stats.avgTotalLatencyMs != null ? `${stats.avgTotalLatencyMs}ms` : '—'}
            sub={`p50: ${stats.p50LatencyMs ?? '—'}ms`}
            icon={Clock}
            color="text-brand-purple"
          />
          <StatCard
            label="Success Rate"
            value={stats.successRate != null ? `${stats.successRate.toFixed(1)}%` : '—'}
            sub={`${stats.tradeCount ?? 0} trades`}
            icon={CheckCircle2}
            color="text-emerald-500"
          />
          <StatCard
            label="p95 Latency"
            value={stats.p95LatencyMs != null ? `${stats.p95LatencyMs}ms` : '—'}
            sub={`p99: ${stats.p99LatencyMs ?? '—'}ms`}
            icon={TrendingUp}
            color={stats.p95LatencyMs > 600 ? 'text-rose-500' : 'text-amber-500'}
          />
          <StatCard
            label="Range"
            value={stats.minTotalLatencyMs != null ? `${stats.minTotalLatencyMs}–${stats.maxTotalLatencyMs}ms` : '—'}
            sub="min–max"
            icon={BarChart3}
            color="text-brand-blue"
          />
        </div>
      ) : null}

      {/* Trade History Table */}
      <GlassCard noPadding>
        <div className="border-b border-border/40 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-brand-purple" />
            </div>
            <div>
              <h2 className="text-sm font-black">Copy Event Log</h2>
              <p className="text-xs text-muted-foreground">{history.totalElements ?? 0} total events</p>
            </div>
          </div>
          {loadingHistory && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
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
                  {['Symbol', 'Side', 'Master Qty', 'Triggered', 'Avg Latency', 'Children', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {(history.content || []).map((event, idx) => {
                  const isOpen = expandedEvent === event.eventId;
                  const detail = eventDetail[event.eventId];
                  const successRate = event.childrenTotal > 0
                    ? Math.round((event.childrenSucceeded / event.childrenTotal) * 100)
                    : 0;

                  return (
                    <React.Fragment key={event.eventId || idx}>
                      <motion.tr
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-black/5 dark:hover:bg-white/2 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-black uppercase">{event.symbol || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                            String(event.side).toUpperCase() === 'SELL'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          }`}>
                            {event.side || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-black tabular-nums">{event.masterQty ?? '—'}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground font-bold">{fmtDate(event.masterTriggeredAt)}</td>
                        <td className="px-5 py-4">
                          <LatencyBar ms={event.avgChildLatencyMs} maxMs={Math.max(1000, stats?.maxTotalLatencyMs || 1000)} />
                          {event.minChildLatencyMs != null && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                              {event.minChildLatencyMs}–{event.maxChildLatencyMs}ms
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-black">
                              <CheckCircle2 className="w-3 h-3" /> {event.childrenSucceeded ?? 0}
                            </span>
                            {event.childrenFailed > 0 && (
                              <span className="flex items-center gap-1 text-xs text-rose-500 font-black">
                                <AlertCircle className="w-3 h-3" /> {event.childrenFailed}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">/ {event.childrenTotal ?? 0}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleEventDetail(event.eventId)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-purple hover:underline"
                          >
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {isOpen ? 'Hide' : 'Detail'}
                          </button>
                        </td>
                      </motion.tr>

                      {/* Expanded per-child detail */}
                      {isOpen && detail && (
                        <tr>
                          <td colSpan={7} className="bg-black/3 dark:bg-white/3 px-5 py-4">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Per-Child Breakdown</p>
                              {(detail.children || []).map((child, ci) => (
                                <div key={ci} className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/60 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      String(child.status).toUpperCase() === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`} />
                                    <span className="text-sm font-bold">{child.childName || 'Child'}</span>
                                    {child.broker && (
                                      <span className="text-[10px] text-muted-foreground bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border/30 uppercase">
                                        {child.broker}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className={`text-xs font-black ${
                                      String(child.status).toUpperCase() === 'SUCCESS' ? 'text-emerald-500' : 'text-rose-500'
                                    }`}>
                                      {child.status || '—'}
                                    </span>
                                    {child.totalChildLatencyMs != null && (
                                      <LatencyBar ms={child.totalChildLatencyMs} />
                                    )}
                                    {child.orderId && (
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        {child.orderId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(!detail.children || detail.children.length === 0) && (
                                <p className="text-xs text-muted-foreground italic py-2">No child data available for this event.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {(history.content || []).length === 0 && !loadingHistory && (
              <div className="py-20 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-bold uppercase tracking-tight">No Events Found</p>
                <p className="text-xs text-muted-foreground mt-1">Execute trades to see copy event history here.</p>
              </div>
            )}

            {/* Pagination */}
            {(history.totalElements || 0) > 20 && (
              <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {page * 20 + 1}–{Math.min((page + 1) * 20, history.totalElements)} of {history.totalElements}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0 || loadingHistory}
                    onClick={() => loadHistory(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    disabled={(page + 1) * 20 >= (history.totalElements || 0) || loadingHistory}
                    onClick={() => loadHistory(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
