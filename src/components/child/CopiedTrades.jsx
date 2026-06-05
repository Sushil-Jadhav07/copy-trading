import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, Search, Activity, Zap, History } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildCopiedTrades } from '@/hooks/useChild';
import { normalizeCopiedTrade } from '@/lib/child';
import { engineService } from '@/lib/engine';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const fmtDateShort = (raw) => {
  if (!raw) return '-';
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw);
  const now = new Date();
  const isToday =
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate();
  const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  return `${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${time}`;
};

const CopiedTrades = () => {
  const navigate = useNavigate();
  const { trades: copiedTrades, loading, error, refetch } = useChildCopiedTrades();
  const { addToast } = useToast();

  const [filter, setFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [trades, setTrades] = useState([]);
  const [skipReasonLabels, setSkipReasonLabels] = useState({});

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  useEffect(() => {
    setTrades(Array.isArray(copiedTrades) ? copiedTrades : []);
  }, [copiedTrades]);

  useEffect(() => {
    engineService.getMetadata()
      .then((meta) => {
        if (meta?.skipReasons && typeof meta.skipReasons === 'object') {
          setSkipReasonLabels(meta.skipReasons);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refetch();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    let sub = null;
    try {
      sub = connectChannel(
        'trades',
        (event, data) => {
          if (event === 'TRADE_COPIED' || event === 'copy_trade' || event === 'MESSAGE') {
            setTrades((prev) => [normalizeCopiedTrade(data), ...prev]);
          }
        },
        null,
        null,
      );
    } catch {
      // Keep page usable without websocket
    }

    return () => {
      if (sub && typeof sub.close === 'function') sub.close();
    };
  }, []);

  const matchesTimeFilter = (trade) => {
    if (timeFilter === 'all') return true;
    const raw = trade?.time || trade?.raw?.createdAt || trade?.raw?.timestamp || trade?.createdAt;
    const dt = new Date(raw || 0);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (timeFilter === 'today') return dt >= startOfToday;
    if (timeFilter === 'weekly') return dt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeFilter === 'monthly') return dt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return true;
  };

  const getErrorReason = (trade) => {
    if (String(trade.status).toUpperCase() !== 'FAILED') return '-';
    return trade.message || trade.raw?.message || trade.raw?.error || trade.raw?.errorMessage || trade.raw?.reason || 'Order failed';
  };

  const SKIP_REASON_UI_MAP = {
    ZERO_QUANTITY: 'Qty scaled to 0',
    SUB_LOT_SIZE: 'Below min lot size',
    RISK_LIMIT: 'Risk limit reached',
    MAX_CAPITAL_EXPOSURE: 'Margin limit hit',
    NO_POSITION: 'No BUY position to sell',
    INSUFFICIENT_POSITION: 'Not enough shares',
    SELL_BLOCKED: 'Sell not allowed',
    MARKET_CLOSED: 'Market closed',
    COPY_PAUSED: 'Copy paused',
    SESSION_EXPIRED: 'Broker session expired',
    SESSION_INACTIVE: 'Broker inactive',
    NO_POSITION_LIVE_CHECK: 'Position flat at 3:20 PM',
    BELOW_LOT_SIZE: 'Below min lot size',
    DAILY_LIMIT_REACHED: 'Daily limit reached',
    MAX_POSITIONS_REACHED: 'Max positions reached',
    CAPITAL_EXPOSURE_EXCEEDED: 'Capital exposure exceeded',
    MARGIN_CHECK_FAILED: 'Margin check failed',
    SEGMENT_DISABLED: 'Segment disabled',
    SELL_NOT_ALLOWED: 'Sell not allowed',
    SYMBOL_TRANSLATION_FAILED: 'Symbol translation failed',
  };

  const getSkipReason = (trade) => {
    if (String(trade.status).toUpperCase() !== 'SKIPPED') return '-';
    const reason = trade.skipReason || trade.raw?.skipReason || trade.raw?.reason || trade.message || '-';
    return skipReasonLabels[reason] || SKIP_REASON_UI_MAP[reason] || reason || 'Skipped';
  };

  const filtered = useMemo(() => {
    return (Array.isArray(trades) ? trades : []).filter((trade) => {
      if (!matchesTimeFilter(trade)) return false;

      const status = String(trade.status || '').toUpperCase();
      const matchesStatus =
        filter === 'All' ||
        (filter === 'EXECUTED' && ['EXECUTED', 'SUCCESS'].includes(status)) ||
        (filter === 'FAILED' && status === 'FAILED') ||
        (filter === 'SKIPPED' && status === 'SKIPPED') ||
        (filter === 'PARTIAL' && ['PARTIALLY_FILLED', 'PART_TRADED', 'PARTIAL'].includes(status));

      if (!matchesStatus) return false;

      const instrument = String(trade.instrument || '').toLowerCase();
      const master = String(trade.master || trade.masterName || '').toLowerCase();
      const ref = String(trade.reference || trade.copyGroupId || trade.id || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();

      return instrument.includes(query) || master.includes(query) || ref.includes(query);
    });
  }, [trades, filter, timeFilter, searchQuery]);

  const groupedFiltered = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    filtered.forEach((trade) => {
      const groupId = trade.copyGroupId || `single-${trade.id || Math.random()}`;
      if (!groupMap.has(groupId)) {
        const group = { groupId, rows: [] };
        groupMap.set(groupId, group);
        groups.push(group);
      }
      groupMap.get(groupId).rows.push(trade);
    });

    let offset = 0;
    return groups.map((group) => {
      const withIndex = {
        ...group,
        startIndex: offset,
        isCopyGroup: Boolean(group.rows[0]?.copyGroupId),
      };
      offset += group.rows.length;
      return withIndex;
    });
  }, [filtered]);

  const executedCount = trades.filter((t) => ['EXECUTED', 'SUCCESS'].includes(String(t.status).toUpperCase())).length;
  const failedCount = trades.filter((t) => String(t.status).toUpperCase() === 'FAILED').length;
  const skippedCount = trades.filter((t) => String(t.status).toUpperCase() === 'SKIPPED').length;
  const partialCount = trades.filter((t) => ['PARTIALLY_FILLED', 'PART_TRADED', 'PARTIAL'].includes(String(t.status).toUpperCase())).length;
  const pendingCount = trades.filter((t) => ['PENDING', 'QUEUED', 'PROCESSING'].includes(String(t.status).toUpperCase())).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl uppercase">Copied Trades</h1>
          <p className="mt-1 text-sm text-muted-foreground">Child copy-trade execution log from child API.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-black/5 dark:bg-white/3 p-4 rounded-2xl border border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
            {['All', 'EXECUTED', 'FAILED', 'SKIPPED', 'PARTIAL'].map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  filter === v ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'PARTIAL' ? 'Partial' : v === 'EXECUTED' ? 'Success' : v === 'FAILED' ? 'Failed' : v === 'SKIPPED' ? 'Skipped' : 'All'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border/40 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            {[
              { key: 'today', label: 'Today', icon: Zap },
              { key: 'weekly', label: 'Week', icon: History },
              { key: 'all', label: 'All Time', icon: Clock },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeFilter(item.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  timeFilter === item.key ? 'border-brand-purple/30 bg-brand-purple/10 text-brand-purple' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-3 h-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol/master/ref..."
            className="w-full lg:w-72 rounded-xl border border-border bg-black/5 dark:bg-white/5 pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-brand-purple"
          />
        </div>
      </div>

      <GlassCard noPadding className="relative overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader type="table" rows={6} columns={8} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-6 py-4 border-b border-border/40 bg-black/3 dark:bg-white/3 flex flex-wrap items-center gap-5 text-xs font-black uppercase tracking-wide">
              <span className="text-emerald-500">Executed ({executedCount})</span>
              <span className="text-rose-500">Failed ({failedCount})</span>
              <span className="text-amber-500">Skipped ({skippedCount})</span>
              <span className="text-brand-blue">Partial ({partialCount})</span>
              <span className="text-muted-foreground">Pending ({pendingCount})</span>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/3 dark:bg-white/3">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">#</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instrument</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Master</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Side</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Broker</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Qty</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entry</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trigger</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">LTP</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">P&L</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latency</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/20">
                {groupedFiltered.map((group) => (
                  <React.Fragment key={group.groupId}>
                    {group.isCopyGroup && (
                      <tr className="bg-brand-purple/5">
                        <td colSpan={13} className="px-6 py-2">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-purple">
                            <span>Copy Group</span>
                            <span className="font-mono normal-case tracking-normal text-muted-foreground">{group.groupId}</span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-muted-foreground dark:bg-white/5">
                              {group.rows.length} trade{group.rows.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {group.rows.map((trade, groupIdx) => {
                      const idx = group.startIndex + groupIdx;
                      const status = String(trade.status || '').toUpperCase();
                      const isExecuted = ['EXECUTED', 'SUCCESS'].includes(status);
                      const isFailed = status === 'FAILED';
                      const isSkipped = status === 'SKIPPED';
                      const isPartial = ['PARTIALLY_FILLED', 'PART_TRADED', 'PARTIAL'].includes(status);

                      const symbol = (trade.instrument && trade.instrument !== 'N/A') ? trade.instrument : (trade.reference || 'UNKNOWN');
                      const qty = trade.myQty ?? trade.masterQty ?? 0;
                      const side = String(trade.type || trade.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY';
                      const broker = trade.broker || trade.raw?.broker || '-';
                      const pnl = Number(trade.pnl || 0);
                      const entry = Number(trade.entry ?? trade.price ?? 0);
                      const ltp = Number(trade.ltp || trade.current || 0);
                      const childLabel = isExecuted ? 'Executed' : isFailed ? 'Failed' : isSkipped ? 'Skipped' : isPartial ? 'Partial' : status || 'Pending';
                      const whyNotCopied = isFailed ? getErrorReason(trade) : getSkipReason(trade);
                      const showReloginCta = isSkipped && ['SESSION_EXPIRED', 'SESSION_INACTIVE'].includes(String(trade.skipReason || trade.raw?.skipReason || '').toUpperCase());

                      return (
                        <motion.tr
                          key={`${trade.id || 'row'}-${idx}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.015 }}
                          className="hover:bg-black/5 dark:hover:bg-white/2 transition-colors"
                        >
                          <td className="px-6 py-5 text-sm font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black uppercase tracking-tight truncate max-w-[150px]">
                                {symbol}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {trade.exchange && (
                                  <span className="text-[8px] font-bold text-muted-foreground px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-border/30 uppercase">
                                    {trade.exchange}
                                  </span>
                                )}
                                {trade.segment && (
                                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase ${
                                    trade.segment === 'FNO' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : 'bg-black/5 text-muted-foreground border-border/30'
                                  }`}>
                                    {trade.segment}
                                  </span>
                                )}
                                {trade.product && (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded border uppercase bg-black/5 text-muted-foreground border-border/30 dark:bg-white/5">
                                    {trade.product}
                                  </span>
                                )}
                                {trade.orderType && (
                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded border uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                                    {trade.orderType}
                                  </span>
                                )}
                                {(() => {
                                  const s = String(trade.instrument || '').toUpperCase();
                                  const itype = s.endsWith('CE') ? 'CE' : s.endsWith('PE') ? 'PE' : s.includes('FUT') ? 'FUT' : 'EQ';
                                  const cfg = {
                                    CE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                    PE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                                    FUT: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
                                    EQ: 'bg-black/5 text-muted-foreground border-border/30 dark:bg-white/5',
                                  }[itype];
                                  return (
                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border uppercase ${cfg}`}>
                                      {itype}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-black uppercase tracking-tight text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-border/30">
                                {trade.masterName || trade.master || 'Master'}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                Copied from master
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 rounded-md text-xs font-black ${side === 'BUY' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'}`}>
                              {side}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs font-black ${
                                isExecuted ? 'text-emerald-500' : isFailed ? 'text-rose-500' : isSkipped ? 'text-amber-500' : isPartial ? 'text-brand-blue' : 'text-muted-foreground'
                              }`}>
                                {childLabel}
                              </span>
                              {(isFailed || isSkipped) && whyNotCopied && whyNotCopied !== '-' && (
                                <div className="flex max-w-[220px] items-start gap-1.5">
                                  <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${isFailed ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                  <span className={`text-xs font-semibold leading-snug ${isFailed ? 'text-rose-400' : 'text-amber-400'}`}>
                                    {whyNotCopied}
                                  </span>
                                </div>
                              )}
                              {showReloginCta && (
                                <button
                                  onClick={() => navigate('/platform/dematconnected')}
                                  className="text-xs font-bold text-amber-500 underline hover:no-underline text-left"
                                >
                                  Re-login broker →
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-muted-foreground">{broker}</td>
                          <td className="px-6 py-5 text-sm font-black">{qty}</td>
                          <td className="px-6 py-5 text-sm font-black tabular-nums">{entry ? entry.toFixed(2) : '-'}</td>
                          <td className="px-6 py-5 text-sm font-black tabular-nums text-muted-foreground">
                            {(['SL', 'SL-M', 'SL_M', 'STOPLOSS', 'STOPLOSS_LIMIT', 'STOPLOSS_MARKET'].includes(String(trade.orderType || trade.raw?.orderType || '').toUpperCase()))
                              ? (Number(trade.triggerPrice || trade.raw?.triggerPrice || trade.raw?.trigger_price || trade.raw?.stopPrice || trade.raw?.triggerprice || 0) > 0
                                  ? Number(trade.triggerPrice || trade.raw?.triggerPrice || trade.raw?.trigger_price || trade.raw?.stopPrice || 0).toFixed(2)
                                  : '-')
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-5 text-sm font-black tabular-nums">{ltp ? ltp.toFixed(2) : '-'}</td>
                          <td className={`px-6 py-5 text-sm font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                          </td>
                          <td className="px-6 py-5">
                            {trade.latencyMs != null && trade.latencyMs > 0 ? (
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs font-black tabular-nums ${trade.latencyMs < 200 ? 'text-emerald-500' : trade.latencyMs < 500 ? 'text-amber-500' : 'text-rose-500'}`}>
                                  {trade.latencyMs}ms
                                </span>
                                <div className="flex flex-col gap-0.5">
                                  {trade.engineReceivedAt && (
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Engine: {new Date(trade.engineReceivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  )}
                                  {(trade.childPlacedAt || trade.placedAt) && (
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                      Placed: {new Date(trade.childPlacedAt || trade.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  )}
                                  {trade.masterOrderTime && trade.masterTriggeredAt && (
                                    <span className="text-[8px] font-bold text-amber-500 uppercase">
                                      Det: {Math.max(0, new Date(trade.masterTriggeredAt).getTime() - new Date(trade.masterOrderTime).getTime())}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-xs font-bold text-muted-foreground">{fmtDateShort(trade.time)}</td>
                        </motion.tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-24 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/5">
                  <Activity className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight">No Trades Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[250px] mx-auto leading-relaxed">
                  We could not find any trades matching your current filters and search query.
                </p>
                <button
                  onClick={() => { setFilter('All'); setTimeFilter('today'); setSearchQuery(''); }}
                  className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand-purple hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default CopiedTrades;
