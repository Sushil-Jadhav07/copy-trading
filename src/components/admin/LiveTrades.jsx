import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const LiveTrades = () => {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTrades = async () => {
      setLoading(true);
      try {
        // FIX: pass status filter so we only get executed/replicated trade logs,
        // not the same unfiltered dump that OrderFeed shows.
        // Spec 6.12: GET /admin/trade-logs?userId=uuid&status=EXECUTED
        const response = await adminService.getTradeLogs({ status: 'EXECUTED' });

        if (isMounted) {
          // Further client-side filter to keep only copy-trade replication records
          setLogs(response.filter((log) => {
            const t = (log.type || '').toUpperCase();
            return t === 'EXECUTED' || t === 'REPLICATED';
          }));
        }
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load live trades', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTrades();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const tradesByTime = useMemo(
    () =>
      [...logs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Live Trade Feed</h1>
        <p className="text-sm text-muted-foreground">Executed &amp; replicated copy trades — live from admin logs.</p>
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