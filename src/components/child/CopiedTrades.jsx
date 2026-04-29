import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildCopiedTrades } from '@/hooks/useChild';
import { normalizeCopiedTrade } from '@/lib/child';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

// Format date string nicely
const fmtTime = (raw) => {
  if (!raw) return 'N/A';
  try { return new Date(raw).toLocaleString('en-IN'); } catch { return raw; }
};

const CopiedTrades = () => {
  const { trades: copiedTrades, loading, error } = useChildCopiedTrades();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('All');
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  useEffect(() => {
    setTrades(copiedTrades);
  }, [copiedTrades]);

  // Real-time WebSocket updates
  useEffect(() => {
    const sub = connectChannel(
      'trades',
      (event, data) => {
        if (event === 'TRADE_COPIED' || event === 'copy_trade' || event === 'MESSAGE') {
          setTrades((prev) => [normalizeCopiedTrade(data), ...prev]);
        }
      },
      null,
      null,
    );
    return () => sub.close();
  }, []);

  // API returns type = REPLICATED | MANUAL, not BUY/SELL — filter by status instead
  const filtered = trades.filter((trade) => {
    if (filter === 'All') return true;
    if (filter === 'EXECUTED') return String(trade.status).toUpperCase() === 'EXECUTED' || String(trade.status).toUpperCase() === 'SUCCESS';
    if (filter === 'FAILED') return String(trade.status).toUpperCase() === 'FAILED';
    return true;
  });

  const executedCount = trades.filter((t) => String(t.status).toUpperCase() === 'EXECUTED' || String(t.status).toUpperCase() === 'SUCCESS').length;
  const failedCount   = trades.filter((t) => String(t.status).toUpperCase() === 'FAILED').length;
  const masterSet     = new Set(trades.map((t) => t.masterId).filter(Boolean));
  const getSide = (trade) => {
    const direct = String(trade.side || trade.raw?.side || '').toUpperCase();
    if (['BUY', 'SELL'].includes(direct)) return direct;
    if (trade.myQty > 0 || trade.masterQty > 0) return 'BUY';
    if (trade.myQty < 0 || trade.masterQty < 0) return 'SELL';
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Copied Trades</h1>
        <p className="text-sm text-muted-foreground">Live feed of trades copied from your masters</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: 'Total Trades',    value: trades.length,  color: 'text-brand-purple' },
          { label: 'Executed',        value: executedCount,  color: 'text-success' },
          { label: 'Failed',          value: failedCount,    color: 'text-danger' },
          { label: 'Masters Active',  value: masterSet.size, color: 'text-brand-blue' },
        ].map((stat) => (
          <GlassCard key={stat.label}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={`mt-1 text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {['All', 'EXECUTED', 'FAILED'].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-brand-purple text-white'
                : 'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
            }`}
          >
            {value === 'All' ? 'All' : value === 'EXECUTED' ? 'Executed' : 'Failed'}
          </button>
        ))}
      </div>

      {/* Table */}
      <GlassCard noPadding>
        {loading ? (
          <div className="p-4">
            <SkeletonLoader type="table" rows={6} columns={9} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Instrument', 'Side', 'Type', 'Status', 'Broker', 'Reference / Order ID', 'Qty', 'P&L', 'Time'].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade, idx) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 transition-colors hover:bg-white/3"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>

                    {/* Instrument */}
                    <td className="px-4 py-3 text-sm font-semibold">
                      {trade.instrument !== 'N/A' ? trade.instrument : (trade.reference || '—')}
                    </td>

                    {/* Side */}
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2.5 py-0.5 text-xs font-bold ${
                        getSide(trade) === 'BUY'
                          ? 'border-success/30 bg-success/20 text-success'
                          : getSide(trade) === 'SELL'
                          ? 'border-danger/30 bg-danger/20 text-danger'
                          : 'border-brand-purple/30 bg-brand-purple/15 text-brand-purple'
                      }`}>
                        {getSide(trade)}
                      </span>
                    </td>

                    {/* Type: REPLICATED / MANUAL */}
                    <td className="px-4 py-3">
                      <span className="rounded border border-brand-purple/30 bg-brand-purple/15 px-2.5 py-0.5 text-xs font-bold text-brand-purple">
                        {trade.type || 'REPLICATED'}
                      </span>
                    </td>

                    {/* Status: EXECUTED / FAILED / SUCCESS */}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        String(trade.status).toUpperCase() === 'EXECUTED' || String(trade.status).toUpperCase() === 'SUCCESS'
                          ? 'bg-success/20 text-success'
                          : String(trade.status).toUpperCase() === 'FAILED'
                          ? 'bg-danger/20 text-danger'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {trade.status || 'UNKNOWN'}
                      </span>
                    </td>

                    {/* Broker */}
                    <td className="px-4 py-3 text-sm font-medium">{trade.broker || '—'}</td>

                    {/* Reference / Order ID */}
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {trade.reference || trade.id || '—'}
                    </td>

                    {/* Qty */}
                    <td className="px-4 py-3 text-sm">
                      {trade.myQty > 0 ? (
                        <span>
                          {trade.myQty}
                          {trade.masterQty > 0 && trade.masterQty !== trade.myQty && (
                            <span className="text-muted-foreground text-[10px] ml-1">(M:{trade.masterQty})</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>

                    {/* P&L */}
                    <td className="px-4 py-3">
                      {trade.pnl !== 0 ? (
                        <span className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground" title={trade.message || ''}>
                          {trade.message ? <span className="truncate max-w-[120px] block" title={trade.message}>{trade.message}</span> : '—'}
                        </span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {fmtTime(trade.time)}
                    </td>
                  </motion.tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No trades found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default CopiedTrades;