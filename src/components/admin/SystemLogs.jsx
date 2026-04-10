import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, RefreshCw, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const LOG_TYPES = ['All', 'EXECUTED', 'REPLICATED', 'CANCELLED', 'ERROR'];

const TypeBadge = ({ type }) => {
  const styles = {
    EXECUTED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
    REPLICATED: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-400',
    CANCELLED: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
    ERROR: 'border-red-500/30 bg-red-500/15 text-red-400',
  };

  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-bold ${styles[type] || 'border-white/10 bg-white/5 text-foreground'}`}>
      {type}
    </span>
  );
};

const StatusIcon = ({ status }) => {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
  return <AlertTriangle className="h-4 w-4 text-amber-400" />;
};

const formatTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN');
};

const SystemLogs = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  const loadLogs = async () => {
    setLoading(true);

    try {
      const params = {};

      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }

      const response = await adminService.getTradeLogs(params);
      setLogs(response);
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    } catch (error) {
      addToast(error.message || 'Unable to load trade logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (filter !== 'All' && log.type !== filter) return false;
      if (query && !`${log.master} ${log.symbol} ${log.broker} ${log.childName}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [filter, logs, search]);

  const stats = useMemo(
    () => ({
      total: logs.length,
      executed: logs.filter((log) => log.type === 'EXECUTED').length,
      replicated: logs.filter((log) => log.type === 'REPLICATED').length,
      errors: logs.filter((log) => log.status === 'error').length,
      cancelled: logs.filter((log) => log.type === 'CANCELLED').length,
    }),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">System Logs</h1>
          <p className="text-sm text-muted-foreground">Detailed activity from the admin trade logs</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-[10px] text-muted-foreground sm:text-xs">Updated: {lastUpdate || 'Never'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                loading ? 'bg-emerald-500/15 text-emerald-400' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
              } sm:text-sm`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''} sm:h-4 sm:w-4`} />
              Refresh
            </button>
            <button
              onClick={() => {
                const file = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'trade-logs.json';
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-1.5 text-xs transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 sm:text-sm"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: '' },
          { label: 'Executed', value: stats.executed, color: 'text-emerald-400' },
          { label: 'Replicated', value: stats.replicated, color: 'text-cyan-400' },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-amber-400' },
          { label: 'Errors', value: stats.errors, color: 'text-red-400' },
        ].map((stat) => (
          <GlassCard key={stat.label}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-wrap gap-2">
          {LOG_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === type ? 'bg-emerald-500 text-white' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search master, symbol, broker..."
          className="flex-1 rounded-lg border border-border bg-black/5 px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500 dark:bg-white/5"
        />
      </div>

      <GlassCard noPadding>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
              <tr className="border-b border-border/50">
                {['Status', 'Time', 'Type', 'Master', 'Symbol', 'Action', 'Qty', 'Price', 'Broker', 'Child / Error'].map((header) => (
                  <th key={header} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border/20 transition-colors hover:bg-white/3"
                >
                  <td className="px-3 py-2.5"><StatusIcon status={log.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-mono text-muted-foreground">{formatTime(log.timestamp)}</td>
                  <td className="px-3 py-2.5"><TypeBadge type={log.type} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium">{log.master}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold">{log.symbol}</td>
                  <td className="px-3 py-2.5 text-xs font-bold">
                    <span className={log.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{log.action}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{log.qty}</td>
                  <td className="px-3 py-2.5 text-sm">{log.price || 0}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{log.broker}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {log.childName ? <span className="text-muted-foreground">{log.childName}</span> : null}
                    {log.error ? <span className="text-red-400">{log.error}</span> : null}
                    {!log.childName && !log.error && log.children ? (
                      <span className="text-cyan-400">{log.children} children</span>
                    ) : null}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {loading ? 'Loading trade logs...' : 'No logs match the current filter'}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemLogs;
