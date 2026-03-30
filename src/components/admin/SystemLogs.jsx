import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download, Filter } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';

const LOG_TYPES = ['All', 'EXECUTED', 'REPLICATED', 'CANCELLED', 'ERROR'];

const INITIAL_LOGS = [
  { id: 1, type: 'EXECUTED', master: 'Rahul Mehta', symbol: 'RELIANCE', action: 'BUY', qty: 100, price: 2456.75, broker: 'Zerodha', timestamp: '09:30:12', children: 4, status: 'success' },
  { id: 2, type: 'REPLICATED', master: 'Rahul Mehta', symbol: 'RELIANCE', action: 'BUY', qty: 50, price: 2456.80, broker: 'Angel One', childName: 'Amit Kumar', timestamp: '09:30:13', status: 'success' },
  { id: 3, type: 'REPLICATED', master: 'Rahul Mehta', symbol: 'RELIANCE', action: 'BUY', qty: 100, price: 2456.82, broker: 'Upstox', childName: 'Deepika Singh', timestamp: '09:30:13', status: 'success' },
  { id: 4, type: 'REPLICATED', master: 'Rahul Mehta', symbol: 'RELIANCE', action: 'BUY', qty: 200, price: 2456.85, broker: 'Zerodha', childName: 'Rajesh Verma', timestamp: '09:30:14', status: 'success' },
  { id: 5, type: 'ERROR', master: 'Rahul Mehta', symbol: 'RELIANCE', action: 'BUY', qty: 50, broker: 'Groww', childName: 'Neha Sharma', timestamp: '09:30:14', error: 'Insufficient margin', status: 'error' },
  { id: 6, type: 'EXECUTED', master: 'Arjun Patel', symbol: 'NIFTY50 FUT', action: 'BUY', qty: 50, price: 22456.00, broker: 'Zerodha', timestamp: '10:15:22', children: 3, status: 'success' },
  { id: 7, type: 'REPLICATED', master: 'Arjun Patel', symbol: 'NIFTY50 FUT', action: 'BUY', qty: 50, price: 22456.10, broker: 'Angel One', childName: 'Amit Kumar', timestamp: '10:15:23', status: 'success' },
  { id: 8, type: 'CANCELLED', master: 'Priya Sharma', symbol: 'TCS', action: 'SELL', qty: 25, price: 3892.50, broker: 'Dhan', timestamp: '11:30:05', status: 'warning' },
  { id: 9, type: 'ERROR', master: 'Arjun Patel', symbol: 'BANKNIFTY CE', action: 'BUY', qty: 1000, broker: 'Upstox', childName: 'Sanjay Gupta', timestamp: '12:00:45', error: 'Broker API timeout', status: 'error' },
  { id: 10, type: 'EXECUTED', master: 'Vikram Das', symbol: 'INFY', action: 'BUY', qty: 200, price: 1678.25, broker: 'Zerodha', timestamp: '13:15:30', children: 2, status: 'success' },
  { id: 11, type: 'REPLICATED', master: 'Vikram Das', symbol: 'INFY', action: 'BUY', qty: 300, price: 1678.30, broker: 'Groww', childName: 'Rajesh Verma', timestamp: '13:15:31', status: 'success' },
  { id: 12, type: 'CANCELLED', master: 'Rahul Mehta', symbol: 'HDFCBANK', action: 'BUY', qty: 100, price: 1523.80, broker: 'Zerodha', timestamp: '14:00:10', status: 'warning' },
];

const TypeBadge = ({ type, status }) => {
  const cfg = {
    EXECUTED: 'bg-success/20 text-success border-success/30',
    REPLICATED: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30',
    CANCELLED: 'bg-warning/20 text-warning border-warning/30',
    ERROR: 'bg-danger/20 text-danger border-danger/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${cfg[type] || 'bg-black/10 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10'}`}>
      {type}
    </span>
  );
};

const StatusIcon = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-danger" />;
  return <AlertTriangle className="w-4 h-4 text-warning" />;
};

const SystemLogs = () => {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString('en-IN'));

  // Simulate new log entries coming in
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      const newLog = {
        id: Date.now(),
        type: ['EXECUTED', 'REPLICATED', 'REPLICATED', 'ERROR'][Math.floor(Math.random() * 4)],
        master: ['Rahul Mehta', 'Arjun Patel', 'Priya Sharma'][Math.floor(Math.random() * 3)],
        symbol: ['RELIANCE', 'TCS', 'NIFTY50 FUT', 'INFY'][Math.floor(Math.random() * 4)],
        action: Math.random() > 0.5 ? 'BUY' : 'SELL',
        qty: Math.floor(Math.random() * 200) + 50,
        price: +(2000 + Math.random() * 1000).toFixed(2),
        broker: ['Zerodha', 'Angel One', 'Upstox', 'Groww', 'Dhan'][Math.floor(Math.random() * 5)],
        timestamp: new Date().toLocaleTimeString('en-IN'),
        status: Math.random() > 0.15 ? 'success' : 'error',
        error: Math.random() > 0.85 ? 'Broker API timeout' : undefined,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filtered = logs.filter((l) => {
    if (filter !== 'All' && l.type !== filter) return false;
    if (search && !`${l.master} ${l.symbol} ${l.broker}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    executed: logs.filter((l) => l.type === 'EXECUTED').length,
    replicated: logs.filter((l) => l.type === 'REPLICATED').length,
    errors: logs.filter((l) => l.status === 'error').length,
    cancelled: logs.filter((l) => l.type === 'CANCELLED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Real-time trade execution and replication logs</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Updated: {lastUpdate}</span>
          <button onClick={() => setAutoRefresh((p) => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRefresh ? 'bg-success/20 text-success border border-success/30' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-xs transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'Executed', value: stats.executed, color: 'text-success' },
          { label: 'Replicated', value: stats.replicated, color: 'text-brand-blue' },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-warning' },
          { label: 'Errors', value: stats.errors, color: 'text-danger' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {LOG_TYPES.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === t ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
              {t}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search master, symbol, broker..."
          className="flex-1 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
      </div>

      {/* Logs Table */}
      <GlassCard noPadding>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
              <tr className="border-b border-border/50">
                {['Status', 'Time', 'Type', 'Master', 'Symbol', 'Action', 'Qty', 'Price', 'Broker', 'Child / Error'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, idx) => (
                <motion.tr key={log.id}
                  initial={{ opacity: 0, backgroundColor: 'rgba(0, 200, 150, 0.1)' }}
                  animate={{ opacity: 1, backgroundColor: 'transparent' }}
                  transition={{ duration: 0.5 }}
                  className="border-b border-border/20 hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2.5"><StatusIcon status={log.status} /></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-3 py-2.5"><TypeBadge type={log.type} status={log.status} /></td>
                  <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">{log.master}</td>
                  <td className="px-3 py-2.5 text-sm font-bold whitespace-nowrap">{log.symbol}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold ${log.action === 'BUY' ? 'text-success' : 'text-danger'}`}>{log.action}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{log.qty}</td>
                  <td className="px-3 py-2.5 text-sm">{log.price ? `₹${log.price.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">{log.broker}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {log.childName && <span className="text-muted-foreground">{log.childName}</span>}
                    {log.error && <span className="text-danger">{log.error}</span>}
                    {log.children && <span className="text-brand-blue">{log.children} children</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No logs match the filter</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemLogs;