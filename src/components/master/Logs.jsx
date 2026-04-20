import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, X, AlertCircle, CheckCircle2, Clock, SkipForward } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { masterService } from '@/lib/master';
import { copyLogService } from '@/lib/copyLogs';
import { logsService } from '@/lib/logs';
import { brokerService } from '@/lib/broker';

const STATUS_CFG = {
  EXECUTED: { icon: CheckCircle2, cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', rowCls: 'border-l-emerald-500 bg-emerald-500/3', label: 'Executed' },
  FAILED:   { icon: AlertCircle,  cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',           rowCls: 'border-l-rose-500 bg-rose-500/3',     label: 'Failed' },
  SKIPPED:  { icon: SkipForward,  cls: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',        rowCls: 'border-l-amber-500 bg-amber-500/4',   label: 'Skipped' },
  PENDING:  { icon: Clock,        cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',        rowCls: 'border-l-slate-400 bg-transparent',   label: 'Pending' },
};
const getStatusCfg = (s) => STATUS_CFG[String(s || '').toUpperCase()] || STATUS_CFG.PENDING;

const StatusPill = ({ status }) => {
  const cfg = getStatusCfg(status);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

const MasterStatusPill = ({ status }) => {
  const cfg = getStatusCfg(status);
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>{cfg.label}</span>;
};

const EmptyState = ({ icon: Icon = FileText, title = 'No logs found', sub = 'Logs will appear here once trades are copied' }) => (
  <div className="py-16 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-7 h-7 text-slate-300 dark:text-white/15" />
    </div>
    <p className="text-sm font-semibold text-slate-600 dark:text-muted-foreground">{title}</p>
    <p className="text-xs text-slate-400 dark:text-muted-foreground/60 mt-0.5">{sub}</p>
  </div>
);

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
};

const TABS = [
  { key: 'copy',   label: 'Copy Logs' },
  { key: 'trade',  label: 'Trade Logs' },
  { key: 'broker', label: 'Broker Errors' },
];

const Logs = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('copy');
  const [search, setSearch] = useState('');
  const [copyLogs, setCopyLogs]     = useState([]);
  const [tradeLogs, setTradeLogs]   = useState([]);
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
            const fb = await copyLogService.getAll();
            return Array.isArray(fb) ? fb : fb.logs || [];
          }),
          logsService.getUserTradeLogs().catch(() => []),
          brokerService.getAccounts().catch(() => []),
        ]);
        setCopyLogs((Array.isArray(copyData) ? copyData : copyData.logs || []).map((log) => ({
          ...log,
          errorCode: log.errorCode,
        })));
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
    logsService.getBrokerErrors(selectedBrokerAccountId || undefined)
      .then((d) => setBrokerErrors(Array.isArray(d) ? d : []))
      .catch((error) => addToast(error.message, 'error'));
  }, [activeTab, selectedBrokerAccountId, addToast]);

  const filteredCopyLogs = useMemo(() =>
    copyLogs.filter((l) => !search || `${l.symbol || ''} ${l.childId || ''}`.toLowerCase().includes(search.toLowerCase())),
    [copyLogs, search]);

  const filteredTradeLogs = useMemo(() =>
    tradeLogs.filter((l) => !search || `${l.instrument || l.symbol || ''} ${l.status || ''}`.toLowerCase().includes(search.toLowerCase())),
    [tradeLogs, search]);

  const filteredBrokerErrors = useMemo(() =>
    brokerErrors.filter((l) => !search || `${l.message || l.error || ''} ${l.broker || ''}`.toLowerCase().includes(search.toLowerCase())),
    [brokerErrors, search]);

  // Status counts for legend
  const statusCounts = useMemo(() => {
    const counts = { EXECUTED: 0, FAILED: 0, SKIPPED: 0, PENDING: 0 };
    filteredCopyLogs.forEach((l) => {
      const s = String(l.childStatus || 'PENDING').toUpperCase();
      if (s in counts) counts[s]++;
    });
    return counts;
  }, [filteredCopyLogs]);

  const renderCopyLogs = () => (
    <>
      {/* Status legend with counts */}
      <div className="px-4 py-3 border-b border-border/30 flex flex-wrap gap-2">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = statusCounts[key] || 0;
          return (
            <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.cls}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
              <span className="ml-0.5 opacity-70">({count})</span>
            </span>
          );
        })}
      </div>

      {filteredCopyLogs.length === 0 ? (
        <EmptyState title="No copy logs yet" sub="Logs appear here once the copy engine replicates trades" />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-black/4 dark:bg-white/3">
              {['Symbol', 'Qty', 'Type', 'Master', 'Child', 'Skip Reason', 'Ref', 'Error', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCopyLogs.map((log, i) => {
              const cfg = getStatusCfg(log.childStatus);
              return (
                <motion.tr
                  key={log.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b border-border/15 border-l-2 hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${cfg.rowCls}`}
                >
                  <td className="px-4 py-3 text-sm font-bold">{log.symbol || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{log.qty || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.tradeType === 'BUY' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>
                      {log.tradeType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><MasterStatusPill status={log.masterStatus} /></td>
                  <td className="px-4 py-3"><StatusPill status={log.childStatus} /></td>
                  <td className="px-4 py-3 text-xs text-amber-500 font-medium">
                    {log.skipReason ? String(log.skipReason).replace(/_/g, ' ') : '-'}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{log.masterTradeId ? log.masterTradeId.slice(0, 8) + '...' : '-'}</td>
                  <td className="px-4 py-3 text-xs max-w-[180px]">
                    {log.errorCode === 'SESSION_EXPIRED' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-amber-500 font-medium">Session expired</span>
                        <button
                          onClick={() => window.location.href = '/master/demat-accounts'}
                          className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full hover:bg-amber-500/25 transition-colors"
                        >
                          Re-connect
                        </button>
                      </span>
                    ) : (
                      <span className="text-rose-500 truncate block" title={log.errorMessage || ''}>
                        {log.errorMessage || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );

  const renderTradeLogs = () => (
    filteredTradeLogs.length === 0 ? (
      <EmptyState title="No trade logs" sub="Your placed trades will appear here" />
    ) : (
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50 bg-black/4 dark:bg-white/3">
            {['ID', 'Instrument', 'Type', 'Quantity', 'Status', 'Placed At'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredTradeLogs.map((log, i) => (
            <tr key={log.id || i} className="border-b border-border/15 hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
              <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{log.id || log.tradeId || '-'}</td>
              <td className="px-4 py-3 text-sm font-bold">{log.instrument || log.symbol || '-'}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${String(log.transactionType || log.side || '').toUpperCase() === 'BUY' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-rose-500/12 text-rose-600'}`}>
                  {log.transactionType || log.side || '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{log.quantity || log.qty || 0}</td>
              <td className="px-4 py-3"><StatusPill status={log.status} /></td>
              <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(log.placedAt || log.createdAt || log.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  );

  const renderBrokerErrors = () => (
    <>
      <div className="px-4 py-3 border-b border-border/30">
        <select value={selectedBrokerAccountId} onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
          className="rounded-xl border border-border bg-black/5 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple">
          {brokerAccounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>{a.broker} - {a.userId || a.accountId}</option>
          ))}
        </select>
      </div>
      {filteredBrokerErrors.length === 0 ? (
        <EmptyState title="No broker errors" sub="Broker API errors will appear here" />
      ) : (
        <div className="divide-y divide-border/15">
          {filteredBrokerErrors.map((log, i) => (
            <div key={log.id || i} className="px-4 py-3.5 flex items-start gap-3 hover:bg-black/3 dark:hover:bg-white/3 transition-colors border-l-2 border-l-rose-500">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{log.message || log.error || '-'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/8 px-1.5 py-0.5 rounded">{log.broker || log.brokerId || '-'}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(log.timestamp || log.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const tabCounts = {
    copy:   filteredCopyLogs.length,
    trade:  filteredTradeLogs.length,
    broker: filteredBrokerErrors.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Logs</h1>
          <p className="text-sm text-muted-foreground">Copy logs, trade logs, and broker errors in one place.</p>
        </div>
        {/* Search with clear button */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-sm focus:outline-none focus:border-brand-purple"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs with count badges */}
      <div className="flex flex-wrap gap-1 border-b border-border/30">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative -mb-px px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? 'bg-brand-purple/15 text-brand-purple' : 'bg-black/8 dark:bg-white/8 text-muted-foreground'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
            {activeTab === tab.key && (
              <motion.span
                layoutId="logs-tab-indicator"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-purple"
              />
            )}
          </button>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Loading logs...</p>
              </motion.div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                {activeTab === 'copy'   && renderCopyLogs()}
                {activeTab === 'trade'  && renderTradeLogs()}
                {activeTab === 'broker' && renderBrokerErrors()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
};

export default Logs;
