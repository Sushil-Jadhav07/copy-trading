import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { logsService } from '@/lib/logs';

const TABS = [
  { key: 'trade', label: 'Trade Logs' },
  { key: 'system', label: 'System Logs' },
  { key: 'broker', label: 'Broker Error Logs' },
];

const BROKERS = ['GROWW', 'ZERODHA', 'FYERS', 'UPSTOX', 'DHAN'];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-IN');
};

const SystemLogs = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('trade');
  const [tradeLogs, setTradeLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [brokerErrors, setBrokerErrors] = useState([]);
  const [brokerId, setBrokerId] = useState('ZERODHA');
  const [loading, setLoading] = useState(true);

  const loadTradeLogs = async () => {
    try {
      const data = await logsService.adminTradeLogs();
      setTradeLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const loadSystemLogs = async () => {
    try {
      const data = await logsService.adminSystemLogs();
      setSystemLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const loadBrokerErrors = async (selectedBrokerId = brokerId) => {
    try {
      const data = await logsService.adminBrokerErrors(selectedBrokerId);
      setBrokerErrors(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadTradeLogs(), loadSystemLogs(), loadBrokerErrors(brokerId)]);
      setLoading(false);
    };
    load();
  }, [addToast]);

  useEffect(() => {
    if (activeTab === 'broker') {
      loadBrokerErrors(brokerId);
    }
  }, [activeTab, brokerId]);

  const renderTradeLogs = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Time', 'Type', 'Symbol', 'Action', 'Qty', 'Broker', 'Status'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tradeLogs.map((log, index) => (
          <tr key={log.id || index} className="border-b border-border/20">
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.timestamp || log.createdAt)}</td>
            <td className="px-4 py-3 text-sm">{log.type || '-'}</td>
            <td className="px-4 py-3 text-sm font-semibold">{log.symbol || log.instrument || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.action || log.side || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.qty || log.quantity || 0}</td>
            <td className="px-4 py-3 text-sm">{log.broker || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.status || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderSystemLogs = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Level', 'Service', 'Message', 'Free Memory MB', 'Total Memory MB'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {systemLogs.map((log, index) => (
          <tr key={log.id || index} className="border-b border-border/20">
            <td className="px-4 py-3 text-sm">{log.level || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.service || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.message || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.freeMemoryMB ?? '-'}</td>
            <td className="px-4 py-3 text-sm">{log.totalMemoryMB ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBrokerErrors = () => (
    <>
      <div className="border-b border-border/40 p-4">
        <DivSelect
          value={brokerId}
          onChange={setBrokerId}
          includeEmptyOption={false}
          options={BROKERS.map((item) => ({ value: item, label: item }))}
          triggerClassName="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:border-brand-purple dark:bg-white/5"
        />
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
            {['Broker', 'Message', 'Timestamp'].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brokerErrors.map((log, index) => (
            <tr key={log.id || index} className="border-b border-border/20">
              <td className="px-4 py-3 text-sm">{log.broker || brokerId}</td>
              <td className="px-4 py-3 text-sm">{log.message || log.error || '-'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.timestamp || log.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">System Logs</h1>
        <p className="text-sm text-muted-foreground">Admin trade activity, infrastructure logs, and broker error visibility.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-brand-purple text-white' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading admin logs...</div>
          ) : activeTab === 'trade' ? (
            renderTradeLogs()
          ) : activeTab === 'system' ? (
            renderSystemLogs()
          ) : (
            renderBrokerErrors()
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default SystemLogs;
