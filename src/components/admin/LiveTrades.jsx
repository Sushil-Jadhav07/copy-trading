import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import RefreshButton from '@/components/shared/RefreshButton';
import { adminService } from '@/lib/admin';

const LiveTrades = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getTradeLogs({ status: 'EXECUTED' });
      setLogs(response.filter((log) => {
        const type = String(log.type || '').toUpperCase();
        return type === 'EXECUTED' || type === 'REPLICATED';
      }));
    } catch (error) {
      addToast(error.message || 'Unable to load live trades', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrades();
  };

  const tradesByTime = useMemo(
    () => [...logs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Live Trade Feed</h1>
          <p className="text-sm text-muted-foreground">Executed and replicated copy trades live from admin logs.</p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full divide-y divide-border/50">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              {['Instrument', 'Type', 'Master', 'Children Copied', 'Total Qty', 'Avg. Price', 'Total Value', 'Time'].map((header) => (
                <th key={header} className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {tradesByTime.map((trade) => (
              <tr key={trade.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">{trade.symbol}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    trade.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {trade.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{trade.master}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{trade.children || 0}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatNumber(trade.qty || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(trade.price || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency((trade.price || 0) * (trade.qty || 0))}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatRelativeTime(trade.timestamp || new Date().toISOString())}</td>
              </tr>
            ))}
            {!tradesByTime.length && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading live trades...' : 'No live trade data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveTrades;
