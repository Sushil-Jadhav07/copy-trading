import React, { useState } from 'react';
import { Download, Filter, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { trades, followers, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

// Each master trade was copied by these followers (mock — derived from followers list)
const COPY_MAP = {
  1: ['AK', 'DS', 'RV'],
  2: ['RV', 'SG'],
  3: ['AK', 'DS', 'RV', 'NS', 'SG'],
  4: ['AK', 'RV'],
  5: ['DS', 'SG'],
  6: ['AK', 'DS', 'RV', 'NS'],
  7: ['RV'],
  8: ['AK', 'DS'],
};

const MyTrades = () => {
  const { addToast } = useToast();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrades = trades.filter((trade) => {
    if (filter !== 'All' && trade.market !== filter) return false;
    if (searchQuery && !trade.instrument.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => addToast('CSV export started', 'success');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Trades</h1>
          <p className="text-muted-foreground">Your executed trades — copied to followers automatically</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: trades.length },
          { label: 'Winning Trades', value: trades.filter((t) => t.pnl > 0).length, color: 'text-success' },
          { label: 'Total P&L', value: formatCurrency(trades.reduce((s, t) => s + t.pnl, 0)), color: 'text-success' },
          { label: 'Active Followers', value: followers.filter((f) => f.status === 'Active').length },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {['All', 'Equity', 'F&O', 'Commodity', 'Currency'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === f ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
                {f}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search instrument..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-purple/50" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'Instrument', 'Market', 'Type', 'Qty', 'Entry', 'Exit', 'P&L', 'Date', 'Status', 'Copied By'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, idx) => {
                const copiedBy = COPY_MAP[trade.id] || [];
                return (
                  <motion.tr key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{trade.instrument}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{trade.market}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${trade.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{trade.qty}</td>
                    <td className="px-4 py-3 text-sm">₹{trade.entryPrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">₹{trade.exitPrice.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{trade.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trade.status === 'Closed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {copiedBy.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {copiedBy.slice(0, 3).map((init) => (
                              <div key={init} className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue border border-background flex items-center justify-center">
                                <span className="text-xs font-bold text-foreground" style={{ fontSize: '8px' }}>{init}</span>
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {copiedBy.length} follower{copiedBy.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {filteredTrades.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">No trades found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default MyTrades;
