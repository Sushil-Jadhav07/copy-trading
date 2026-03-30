import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { copiedTrades, formatCurrency } from '@/data/mockData';

const CopiedTrades = () => {
  const [filter, setFilter] = useState('All');
  const filtered = copiedTrades.filter((t) => filter === 'All' || t.type === filter);
  const totalPnL = copiedTrades.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Copied Trades</h1>
        <p className="text-muted-foreground">Live feed of trades copied from your masters</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Trades', value: copiedTrades.length, color: 'text-brand-purple' },
          { label: 'Total P&L', value: (totalPnL >= 0 ? '+' : '') + formatCurrency(Math.abs(totalPnL)), color: totalPnL >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Masters Active', value: [...new Set(copiedTrades.map((t) => t.master))].length, color: 'text-brand-blue' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', 'BUY', 'SELL'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-muted-foreground'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'Master', 'Instrument', 'Type', 'Master Qty', 'My Qty', 'Entry', 'LTP', 'My P&L', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((trade, idx) => (
                <motion.tr key={trade.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  className="border-b border-border/30 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{trade.master}</td>
                  <td className="px-4 py-3 font-semibold text-sm">{trade.instrument}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${trade.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{trade.masterQty}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-brand-purple">{trade.myQty}</td>
                  <td className="px-4 py-3 text-sm">₹{trade.entry.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">₹{trade.current.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{trade.time}</td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No trades found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default CopiedTrades;
