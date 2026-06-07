import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, SkipForward, Activity, Zap } from 'lucide-react';

/**
 * TradeTimeline
 * 
 * A visual timeline showing the sequence of a copy trade execution.
 * 
 * Props:
 *   data  Object  — The copy-trade API response object
 */
const TradeTimeline = ({ data }) => {
  if (!data || !Array.isArray(data.results)) return null;

  const {
    masterTriggeredAt,
    engineReceivedAt,
    masterOrderTime, // Broker's original order timestamp
    completedAt,
    totalExecutionMs,
    results = [],
    symbol,
    side,
    isExternal = !masterTriggeredAt // If masterTriggeredAt is missing, it's likely an external trade
  } = data;

  // Detection delay: time between broker order and platform detection (if available)
  const detectionDelay = masterTriggeredAt && masterOrderTime 
    ? new Date(masterTriggeredAt).getTime() - new Date(masterOrderTime).getTime()
    : null;

  // Sort results by placedAt to show sequence
  const sortedResults = [...results].sort((a, b) => {
    const timeA = a.placedAt ? new Date(a.placedAt).getTime() : 0;
    const timeB = b.placedAt ? new Date(b.placedAt).getTime() : 0;
    return timeA - timeB;
  });

  const getStatusIcon = (status) => {
    switch (String(status).toUpperCase()) {
      case 'SUCCESS': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'FAILED': return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'SKIPPED': return <SkipForward className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--:--.---';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      fractionalSecondDigits: 3 
    });
  };

  return (
    <div className="relative space-y-0 pl-4 border-l border-dashed border-border/60 ml-2 py-2">
      {/* External Trade Start (if applicable) */}
      {isExternal && masterOrderTime && (
        <div className="relative mb-6">
          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 z-10" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Placed via Broker App</p>
              <p className="text-xs font-bold text-foreground mt-0.5">
                External Order Detected
              </p>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded border border-border/40">
              {formatTime(masterOrderTime)}
            </p>
          </div>
        </div>
      )}

      {/* Master Trigger / Detection Point */}
      <div className="relative mb-6">
        <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${isExternal ? 'bg-amber-500' : 'bg-brand-purple'} shadow-[0_0_10px_rgba(168,85,247,0.5)] z-10`} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isExternal ? 'text-amber-500' : 'text-brand-purple'}`}>
            {isExternal ? 'Platform Detected' : 'Master Triggered'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs font-bold text-foreground">
                {side} {symbol}
              </p>
              {detectionDelay != null && detectionDelay > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {detectionDelay}ms delay
                </span>
              )}
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded border border-border/40">
            {formatTime(masterTriggeredAt || engineReceivedAt || data.detectedAt || data.time)}
          </p>
        </div>
      </div>

      {/* Children Execution Points */}
      <div className="space-y-6">
        {sortedResults.map((result, idx) => {
          const latency = result.latencyMs || 0;
          const isSlow = latency > 400;
          const isFast = latency > 0 && latency < 200;
          const resultStatus = String(result.status || '').toUpperCase();
          const dotClass =
            resultStatus === 'SUCCESS'
              ? 'bg-emerald-500'
              : resultStatus === 'SKIPPED'
                ? 'bg-amber-500'
                : 'bg-rose-500';

          return (
            <motion.div 
              key={result.childId || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-background border-2 border-border z-10 flex items-center justify-center">
                <div className={`w-1 h-1 rounded-full ${dotClass}`} />
              </div>
              
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <p className="text-[11px] font-black uppercase tracking-tight truncate">
                      {result.broker || 'Broker'}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 italic">
                    {result.message || 'Order processed'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    {latency > 0 && (
                      <span className={`text-[10px] font-black tabular-nums ${isFast ? 'text-emerald-500' : isSlow ? 'text-rose-500' : 'text-amber-500'}`}>
                        {latency}ms
                      </span>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {formatTime(result.childPlacedAt || result.placedAt)}
                    </p>
                  </div>
                  {result.scaledQty && (
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                      Qty: {result.scaledQty}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Point */}
      <div className="relative mt-6 pt-4">
        <div className="absolute -left-[21px] top-5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Execution Complete</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="w-3 h-3 text-amber-500" />
              <p className="text-xs font-black text-foreground">
                Total Time: <span className="text-brand-purple">{totalExecutionMs || 0}ms</span>
              </p>
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded border border-border/40">
            {formatTime(completedAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradeTimeline;
