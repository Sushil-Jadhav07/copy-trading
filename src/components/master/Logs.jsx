import React, { useEffect, useMemo, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { masterService } from '@/lib/master';
import { copyLogService } from '@/lib/copyLogs';
import { logsService } from '@/lib/logs';
import { brokerService } from '@/lib/broker';

const TABS = [
  { key: 'copy', label: 'Copy Logs' },
  { key: 'trade', label: 'Trade Logs' },
  { key: 'broker', label: 'Broker Errors' },
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-IN');
};

const Logs = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('copy');
  const [search, setSearch] = useState('');
  const [copyLogs, setCopyLogs] = useState([]);
  const [tradeLogs, setTradeLogs] = useState([]);
  const [brokerErrors, setBrokerErrors] = useState([]);
  const [brokerAccounts, setBrokerAccounts] = useState([]);
  const [selectedBrokerAccountId, setSelectedBrokerAccountId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [copyData, tradeData, accounts] = await Promise.all([
          masterService.getCopyLogs().catch(async () => {
            const fallback = await copyLogService.getAll();
            return Array.isArray(fallback) ? fallback : fallback.logs || [];
          }),
          logsService.getUserTradeLogs().catch(() => []),
          brokerService.getAccounts().catch(() => []),
        ]);
        setCopyLogs(Array.isArray(copyData) ? copyData : copyData.logs || []);
        setTradeLogs(Array.isArray(tradeData) ? tradeData : []);
        setBrokerAccounts(accounts);
        setSelectedBrokerAccountId(accounts[0]?.accountId || '');
      } catch (error) {
        addToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  useEffect(() => {
    if (activeTab !== 'broker') return;
    const loadBrokerErrors = async () => {
      try {
        const data = await logsService.getBrokerErrors(selectedBrokerAccountId || undefined);
        setBrokerErrors(Array.isArray(data) ? data : []);
      } catch (error) {
        addToast(error.message, 'error');
      }
    };
    loadBrokerErrors();
  }, [activeTab, selectedBrokerAccountId, addToast]);

  const filteredCopyLogs = useMemo(
    () =>
      copyLogs.filter((log) =>
        !search || `${log.symbol || ''} ${log.childId || ''}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [copyLogs, search],
  );

  const filteredTradeLogs = useMemo(
    () =>
      tradeLogs.filter((log) =>
        !search || `${log.instrument || log.symbol || ''} ${log.status || ''}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [tradeLogs, search],
  );

  const filteredBrokerErrors = useMemo(
    () =>
      brokerErrors.filter((log) =>
        !search || `${log.message || log.error || ''} ${log.broker || ''}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [brokerErrors, search],
  );

  const renderCopyLogs = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['Symbol', 'Qty', 'Trade Type', 'Master Status', 'Child Status', 'Trade Ref', 'Error', 'Date'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredCopyLogs.map((log, index) => (
          <tr key={log.id || index} className="border-b border-border/20">
            <td className="px-4 py-3 text-sm font-semibold">{log.symbol || 'N/A'}</td>
            <td className="px-4 py-3 text-sm">{log.qty || 0}</td>
            <td className="px-4 py-3 text-sm">{log.tradeType || 'N/A'}</td>
            <td className="px-4 py-3 text-sm">{log.masterStatus || 'PENDING'}</td>
            <td className="px-4 py-3 text-sm">{log.childStatus || 'PENDING'}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{log.masterTradeId || '-'}</td>
            <td className="px-4 py-3 text-xs text-danger">{log.errorMessage || '-'}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTradeLogs = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
          {['ID', 'Instrument', 'Type', 'Quantity', 'Status', 'Placed At'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredTradeLogs.map((log, index) => (
          <tr key={log.id || index} className="border-b border-border/20">
            <td className="px-4 py-3 text-xs text-muted-foreground">{log.id || log.tradeId || '-'}</td>
            <td className="px-4 py-3 text-sm font-semibold">{log.instrument || log.symbol || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.transactionType || log.side || '-'}</td>
            <td className="px-4 py-3 text-sm">{log.quantity || log.qty || 0}</td>
            <td className="px-4 py-3 text-sm">{log.status || '-'}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.placedAt || log.createdAt || log.timestamp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBrokerErrors = () => (
    <>
      <div className="border-b border-border/40 p-4">
        <select value={selectedBrokerAccountId} onChange={(event) => setSelectedBrokerAccountId(event.target.value)} className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5">
          {brokerAccounts.map((account) => (
            <option key={account.accountId} value={account.accountId}>
              {account.broker} - {account.userId || account.accountId}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-black/5 dark:bg-white/5">
            {['Message', 'Broker', 'Timestamp'].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredBrokerErrors.map((log, index) => (
            <tr key={log.id || index} className="border-b border-border/20">
              <td className="px-4 py-3 text-sm">{log.message || log.error || '-'}</td>
              <td className="px-4 py-3 text-sm">{log.broker || log.brokerId || '-'}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.timestamp || log.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Logs</h1>
          <p className="text-sm text-muted-foreground">Copy logs, trade logs, and broker errors in one place.</p>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs" className="w-full rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple sm:w-64 dark:bg-white/5" />
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
            <div className="p-4 text-sm text-muted-foreground">Loading logs...</div>
          ) : activeTab === 'copy' ? (
            renderCopyLogs()
          ) : activeTab === 'trade' ? (
            renderTradeLogs()
          ) : (
            renderBrokerErrors()
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default Logs;
