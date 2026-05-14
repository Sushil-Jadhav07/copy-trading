import React, { useMemo } from 'react';
import { Activity, Clock, CheckCircle2, AlertCircle, SkipForward } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

/**
 * TradeLatencyCard
 *
 * Displays a per-broker latency breakdown from the copy-trade API response.
 * Accepts an array of `copyResults` — each being the top-level response from
 * POST /api/v1/engine/copy-trade.
 *
 * Props:
 *   copyResults  Array<CopyTradeResponse>  — history of copy-trade API responses
 *   maxHistory   number                    — max responses to keep for avg calculation (default 10)
 */
const TradeLatencyCard = ({ copyResults = [], maxHistory = 10 }) => {
  const recentResults = useMemo(
    () => (Array.isArray(copyResults) ? copyResults : []).slice(-maxHistory),
    [copyResults, maxHistory],
  );

  // Aggregate per-broker stats across recent results
  const brokerStats = useMemo(() => {
    const map = {};

    recentResults.forEach((result) => {
      if (!Array.isArray(result?.results)) return;
      result.results.forEach((child) => {
        const broker = String(child.broker || 'Unknown').toUpperCase();
        if (!map[broker]) {
          map[broker] = { latencies: [], success: 0, failed: 0, skipped: 0, total: 0 };
        }
        map[broker].total += 1;
        const status = String(child.status || '').toUpperCase();
        if (status === 'SUCCESS') map[broker].success += 1;
        else if (status === 'FAILED') map[broker].failed += 1;
        else if (status === 'SKIPPED') map[broker].skipped += 1;

        if (child.latencyMs != null && child.latencyMs > 0) {
          map[broker].latencies.push(child.latencyMs);
        }
      });
    });

    return Object.entries(map)
      .map(([broker, stats]) => {
        const avg =
          stats.latencies.length > 0
            ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
            : null;
        const max = stats.latencies.length > 0 ? Math.max(...stats.latencies) : null;
        const min = stats.latencies.length > 0 ? Math.min(...stats.latencies) : null;
        return { broker, ...stats, avg, max, min };
      })
      .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
  }, [recentResults]);

  // Latest overall execution time
  const latestResult = recentResults[recentResults.length - 1];
  const avgExecutionTime = useMemo(() => {
    const times = recentResults.map(r => r.totalExecutionMs).filter(t => t != null && t > 0);
    return times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  }, [recentResults]);

  const maxAvg = Math.max(...brokerStats.map((s) => s.avg ?? 0), 1);

  if (brokerStats.length === 0) {
    return (
      <GlassCard title="Copy Latency" subtitle="Broker-level execution speed from last trades">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No latency data yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Execute a copy trade to see broker latency stats</p>
        </div>
      </GlassCard>
    );
  }

  const getLatencyColor = (ms) => {
    if (ms == null) return 'text-muted-foreground';
    if (ms < 200) return 'text-emerald-500';
    if (ms < 400) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getBarColor = (ms) => {
    if (ms == null) return 'bg-muted';
    if (ms < 200) return 'bg-emerald-500';
    if (ms < 400) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <GlassCard title="Copy Latency" subtitle={`Avg broker-level execution speed • last ${recentResults.length} trade${recentResults.length !== 1 ? 's' : ''}`}>
      <div className="space-y-3">
        {/* Overall execution stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {latestResult?.totalExecutionMs != null && (
            <div className="flex flex-col px-4 py-3 rounded-xl bg-brand-purple/5 border border-brand-purple/15">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-brand-purple" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple/80">Last Run</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-brand-purple">{latestResult.totalExecutionMs}ms</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">total</span>
              </div>
            </div>
          )}
          {avgExecutionTime != null && (
            <div className="flex flex-col px-4 py-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-brand-blue" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue/80">Average</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-brand-blue">{avgExecutionTime}ms</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">total</span>
              </div>
            </div>
          )}
        </div>

        {/* Per-broker rows */}
        {brokerStats.map(({ broker, avg, min, max, success, failed, skipped, total, latencies }) => {
          const barPct = avg != null ? Math.round((avg / maxAvg) * 100) : 0;
          const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
          return (
            <div key={broker} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black uppercase tracking-tight">{broker}</span>
                  {/* success/fail indicators */}
                  <div className="flex items-center gap-1">
                    {success > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-500">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {success}
                      </span>
                    )}
                    {failed > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-500">
                        <AlertCircle className="w-2.5 h-2.5" /> {failed}
                      </span>
                    )}
                    {skipped > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500">
                        <SkipForward className="w-2.5 h-2.5" /> {skipped}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {latencies.length > 0 ? (
                    <span className={`text-xs font-black tabular-nums ${getLatencyColor(avg)}`}>
                      {avg}ms
                      {min !== max && (
                        <span className="text-[9px] font-bold text-muted-foreground ml-1">
                          ({min}–{max})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground">—</span>
                  )}
                  <span className="text-[9px] font-bold text-muted-foreground w-8 text-right">{successRate}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${latencies.length > 0 ? getBarColor(avg) : 'bg-muted-foreground/20'}`}
                  style={{ width: latencies.length > 0 ? `${barPct}%` : '15%' }}
                />
              </div>
            </div>
          );
        })}

        {recentResults.length > 1 && (
          <p className="text-[9px] font-bold text-muted-foreground text-right pt-1 uppercase tracking-widest">
            Based on {recentResults.length} recent executions
          </p>
        )}
      </div>
    </GlassCard>
  );
};

export default TradeLatencyCard;
