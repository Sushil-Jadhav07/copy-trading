import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { trades as allTrades, formatCurrency, formatNumber, formatDate } from '@/data/mockData';

const LiveTrades = () => {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tradesByTime = useMemo(() => {
    // In a real app, this would be a stream of live data
    return allTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Trade Feed</h1>
        <p className="text-muted-foreground">Real-time stream of all trades executed across the platform.</p>
      </div>

      <div className="overflow-x-auto glass-card p-0">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6"></th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Instrument</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Type</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Master</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Children Copied</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Total Qty</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Avg. Price</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Total Value</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {tradesByTime.map((trade) => (
              <React.Fragment key={trade.id}>
                <tr onClick={() => toggleRow(trade.id)} className="cursor-pointer hover:bg-black/5 dark:bg-white/5 transition-colors">
                  <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <motion.div animate={{ rotate: expandedRows[trade.id] ? 90 : 0 }}>
                      <ChevronRight className="w-4 h-4" />
                    </motion.div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">{trade.instrument}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      trade.type === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">Rahul Mehta</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">5</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatNumber(trade.qty * 6)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(trade.entryPrice)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(trade.entryPrice * trade.qty * 6)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatDate(trade.date)}</td>
                </tr>
                <AnimatePresence>
                  {expandedRows[trade.id] && (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={9} className="p-0">
                        <div className="bg-black/20 p-4">
                          <h4 className="font-semibold mb-2">Child Orders (5)</h4>
                          <table className="min-w-full divide-y divide-border/20">
                            <thead className="bg-black/10 dark:bg-white/10">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Child Account</th>
                                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Qty</th>
                                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Fill Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                              {[...Array(5)].map((_, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-sm">Child User {i + 1}</td>
                                  <td className="px-3 py-2 text-sm text-success">Filled</td>
                                  <td className="px-3 py-2 text-sm">{formatNumber(trade.qty)}</td>
                                  <td className="px-3 py-2 text-sm">{formatCurrency(trade.entryPrice + (Math.random() - 0.5))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveTrades;
