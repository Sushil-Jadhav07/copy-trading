import React, { useCallback, useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';
import { formatRelativeTime, sortByMostRecent } from '@/lib/utils';

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
      setTradeLogs(sortByMostRecent(Array.isArray(data) ? data : [], ['timestamp', 'createdAt', 'updatedAt']));
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
      const { brokerService } = await import('@/lib/broker');
      const data = await brokerService.getAdminBrokerStatus();
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
    : brokerStatuses.filter((b) => (b.brokerId || b.name || '').toUpperCase() === brokerFilter);

  const renderTradeLogs = () => (
    <table className="w-full">
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
            <td className="px-4 py-3 text-sm">{log.type || 'â€”'}</td>
            <td className="px-4 py-3 text-sm font-semibold">{log.symbol || log.instrument || 'â€”'}</td>
            <td className="px-4 py-3 text-sm">
              <span className={log.action === 'BUY' ? 'text-emerald-400 font-semibold' : log.action === 'SELL' ? 'text-red-400 font-semibold' : ''}>
                {log.action || log.side || 'â€”'}
              </span>
            </td>
            <td className="px-4 py-3 text-sm">{log.qty || log.quantity || 0}</td>
            <td className="px-4 py-3 text-sm">{log.broker || 'â€”'}</td>
            <td className="px-4 py-3 text-sm">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                log.status === 'error' ? 'bg-red-500/10 text-red-400' :
                log.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                'bg-emerald-500/10 text-emerald-400'
              }`}>
                {log.status || 'â€”'}
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{log.message || log.error || 'â€”'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSystemHealth = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Service', 'Status', 'Uptime', 'Latency (ms)', 'Active Users', 'Orders Today'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {systemEntries.length === 0 && (
          <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No system health data</td></tr>
        )}
        {systemEntries.map((entry, index) => {
          const statusUp = String(entry.status || '').toUpperCase() === 'UP';
          return (
            <tr key={entry.id || index} className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold">{entry.name || 'â€”'}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {entry.status || 'UNKNOWN'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{entry.uptime || 'â€”'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{entry.latency ?? 'â€”'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{entry.activeUsers ?? 'â€”'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{entry.ordersToday ?? 'â€”'}</td>
            </tr>
          );
        })}
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
      <table className="w-full">
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
            const apiOk = String(broker.apiStatus || broker.status || '').toUpperCase() === 'UP' ||
              String(broker.apiStatus || broker.status || '').toUpperCase() === 'OK';
            return (
              <tr key={broker.brokerId || index} className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold">{broker.name || broker.brokerId || 'â€”'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    apiOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {broker.apiStatus || broker.status || 'UNKNOWN'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{broker.latencyMs ?? 'â€”'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(broker.lastChecked)}</td>
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
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
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
