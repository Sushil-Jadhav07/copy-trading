import React, { useCallback, useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { adminService } from '@/lib/admin';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import DownloadButton from '@/components/shared/DownloadButton';
import { formatRelativeTime, sortByMostRecent } from '@/lib/utils';

const MsgCell = ({ msg }) => {
  if (!msg || msg === '-') return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0 max-w-[220px]">
      <span className="text-xs text-muted-foreground truncate">{msg}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-sm text-xs leading-relaxed break-words whitespace-normal">
            {msg}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const TABS = [
  { key: 'trade', label: 'Trade Logs' },
  { key: 'system', label: 'System Health' },
  { key: 'broker', label: 'Broker Status' },
];

const BROKERS = ['ALL', 'GROWW', 'ZERODHA', 'FYERS', 'UPSTOX', 'DHAN', 'ANGELONE'];

const SystemLogs = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('trade');
  const [tradeLogs, setTradeLogs] = useState([]);
  const [systemEntries, setSystemEntries] = useState([]);
  const [brokerStatuses, setBrokerStatuses] = useState([]);
  const [brokerFilter, setBrokerFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTradeLogs = async () => {
    try {
      const data = await adminService.getTradeLogs();
      setTradeLogs(sortByMostRecent(Array.isArray(data.logs) ? data.logs : [], ['timestamp', 'createdAt', 'updatedAt']));
    } catch (error) {
      addToast(`Trade logs: ${error.message}`, 'error');
    }
  };

  const loadSystemHealth = async () => {
    try {
      const data = await adminService.getSystemHealth();
      setSystemEntries(sortByMostRecent(Array.isArray(data) ? data : [], ['lastChecked', 'updatedAt', 'createdAt', 'timestamp']));
    } catch (error) {
      addToast(`System health: ${error.message}`, 'error');
    }
  };

  const loadBrokerStatus = async () => {
    try {
      const data = await adminService.getBrokerStatus();
      setBrokerStatuses(sortByMostRecent(Array.isArray(data) ? data : [], ['lastChecked', 'updatedAt', 'createdAt']));
    } catch (error) {
      addToast(`Broker status: ${error.message}`, 'error');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTradeLogs(), loadSystemHealth(), loadBrokerStatus()]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const filteredBrokers = brokerFilter === 'ALL'
    ? brokerStatuses
    : brokerStatuses.filter((b) => (b.brokerId || b.name || b.broker || '').toUpperCase() === brokerFilter);

  const renderTradeLogs = () => (
    <table className="w-full min-w-[700px]">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Time', 'Type', 'Symbol', 'Action', 'Qty', 'Broker', 'Status', 'Message'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tradeLogs.length === 0 && (
          <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No trade logs found</td></tr>
        )}
        {tradeLogs.map((log, index) => (
          <tr key={log.id || index} className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(log.timestamp || log.createdAt)}</td>
            <td className="px-4 py-3 text-sm">{log.type || '-'}</td>
            <td className="px-4 py-3 text-sm font-semibold">{log.symbol || log.instrument || '-'}</td>
            <td className="px-4 py-3 text-sm">
              <span className={log.action === 'BUY' ? 'text-emerald-400 font-semibold' : log.action === 'SELL' ? 'text-red-400 font-semibold' : ''}>
                {log.action || log.side || '-'}
              </span>
            </td>
            <td className="px-4 py-3 text-sm">{log.qty || log.quantity || 0}</td>
            <td className="px-4 py-3 text-sm">{log.broker || '-'}</td>
            <td className="px-4 py-3 text-sm">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                log.status === 'error' ? 'bg-rose-500' :
                log.status === 'warning' ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}>
                {log.status || '-'}
              </span>
            </td>
            <td className="px-4 py-3"><MsgCell msg={log.message || log.error || '-'} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSystemHealth = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Metric', 'Value'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {systemEntries.length === 0 && (
          <tr><td colSpan={2} className="px-4 py-10 text-center text-sm text-muted-foreground">No system health data</td></tr>
        )}
        {systemEntries.map((entry, index) => (
          <tr key={entry.id || index} className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <td className="px-4 py-3 text-sm font-semibold">{entry.name || '-'}</td>
            <td className="px-4 py-3 text-sm font-medium">{entry.metric ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBrokerStatus = () => (
    <>
      <div className="border-b border-border/40 p-4">
        <DivSelect
          value={brokerFilter}
          onChange={setBrokerFilter}
          includeEmptyOption={false}
          options={BROKERS.map((item) => ({ value: item, label: item }))}
          triggerClassName="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:border-brand-purple dark:bg-white/5"
        />
      </div>
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
            {['Broker', 'API Status', 'Latency (ms)', 'Last Checked'].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredBrokers.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No broker status data</td></tr>
          )}
          {filteredBrokers.map((broker, index) => {
            const st = String(broker.status || '').toUpperCase();
            const isActive = st === 'ACTIVE' || st === 'UP' || st === 'OK';
            const isAuth = st === 'AUTH_REQUIRED';
            return (
              <tr key={broker.id || index} className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold">{broker.name || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                    isActive ? 'bg-emerald-500' : isAuth ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    {broker.status || 'UNKNOWN'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{broker.ping ?? broker.latencyMs ?? '-'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(broker.lastSync || broker.lastChecked)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">System Logs</h1>
          <p className="text-sm text-muted-foreground">Trade activity, system health status, and broker connectivity.</p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadButton
            onClick={() => {
              try {
                const rows = tradeLogs.map((log) => ({
                  Time: formatRelativeTime(log.timestamp || log.createdAt),
                  Type: log.type || '-',
                  Symbol: log.symbol || log.instrument || '-',
                  Action: log.action || log.side || '-',
                  Qty: log.qty || log.quantity || 0,
                  Broker: log.broker || '-',
                  Status: log.status || '-',
                  Message: log.message || log.error || '-',
                }));
                downloadExcelSheet({ rows, sheetName: 'System Trade Logs', fileName: buildExportFileName('System Logs') });
              } catch {}
            }}
            disabled={tradeLogs.length === 0}
            label="Export Excel"
          />
          <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-purple text-white'
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-sm text-muted-foreground text-center">Loading...</div>
          ) : activeTab === 'trade' ? (
            renderTradeLogs()
          ) : activeTab === 'system' ? (
            renderSystemHealth()
          ) : (
            renderBrokerStatus()
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemLogs;
