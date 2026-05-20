import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, AlertCircle, CheckCircle2, Clock, SkipForward, Zap, RotateCcw, Activity, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { masterService } from '@/lib/master';
import { copyLogService } from '@/lib/copyLogs';
import { logsService } from '@/lib/logs';
import { brokerService } from '@/lib/broker';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { connectChannel } from '@/lib/websocket';

const STATUS_CFG = {
  EXECUTED: { icon: CheckCircle2, cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', rowCls: 'border-l-emerald-500 bg-emerald-500/3', label: 'Executed' },
  FAILED:   { icon: AlertCircle,  cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',           rowCls: 'border-l-rose-500 bg-rose-500/3',     label: 'Failed' },
  SKIPPED:  { icon: SkipForward,  cls: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',        rowCls: 'border-l-amber-500 bg-amber-500/4',   label: 'Skipped' },
  PENDING:  { icon: Clock,        cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',        rowCls: 'border-l-slate-400 bg-transparent',   label: 'Pending' },
};
const normalizeStatus = (value) => {
  const raw = String(value || '').toUpperCase();
  if (raw === 'SUCCESS') return 'EXECUTED';
  if (['COMPLETE', 'COMPLETED', 'TRADED'].includes(raw)) return 'EXECUTED';
  if (['ERROR', 'REJECTED'].includes(raw)) return 'FAILED';
  return raw || 'PENDING';
};
const getStatusCfg = (s) => STATUS_CFG[normalizeStatus(s)] || STATUS_CFG.PENDING;

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

const shortId = (value) => {
  if (!value) return '-';
  const text = String(value);
  return text.length > 12 ? `${text.slice(0, 8)}...` : text;
};

const TABS = [
  { key: 'copy',   label: 'Copy Logs' },
  { key: 'trade',  label: 'Trade Logs' },
  { key: 'broker', label: 'Broker Errors' },
];
const TIME_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('today');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
      if (!selectedBrokerAccountId && accounts.length > 0) {
        setSelectedBrokerAccountId(accounts[0]?.accountId || '');
      }
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, selectedBrokerAccountId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── WebSocket listener for real-time log updates ───────────────────────────
  useEffect(() => {
    const sub = connectChannel(
      'trades',
      (event) => {
        if (['TRADE_COPIED', 'copy_trade', 'TRADE_COPY_FAILED', 'copy_trade_failed', 'MESSAGE'].includes(event)) {
          // New trade activity, refresh the logs
          load();
        }
      },
      null,
      null,
    );

    return () => sub.close();
  }, [load]);

  useEffect(() => {
    if (activeTab !== 'broker') return;
    logsService.getBrokerErrors(selectedBrokerAccountId || undefined)
      .then((d) => setBrokerErrors(Array.isArray(d) ? d : []))
      .catch((error) => addToast(error.message, 'error'));
  }, [activeTab, selectedBrokerAccountId, addToast]);

  const matchesTimeFilter = (value) => {
    if (timeFilter === 'all') return true;
    const dt = new Date(value || 0);
    if (Number.isNaN(dt.getTime())) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (timeFilter === 'today') return dt >= startOfToday;
    if (timeFilter === 'weekly') return dt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeFilter === 'monthly') return dt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return true;
  };

  const filteredCopyLogs = useMemo(() =>
    copyLogs.filter((l) =>
      (statusFilter === 'all' ||
        (statusFilter === 'success' && normalizeStatus(l.childStatus) === 'EXECUTED') ||
        (statusFilter === 'failed' && normalizeStatus(l.childStatus) === 'FAILED') ||
        (statusFilter === 'skipped' && normalizeStatus(l.childStatus) === 'SKIPPED')) &&
      (!search || `${l.symbol || ''} ${l.childId || ''} ${l.childName || ''} ${l.masterName || ''} ${l.copyGroupId || ''}`.toLowerCase().includes(search.toLowerCase())) &&
      matchesTimeFilter(l.createdAt || l.timestamp || l.time)
    ),
    [copyLogs, search, timeFilter, statusFilter]);

  const filteredTradeLogs = useMemo(() =>
    tradeLogs.filter((l) =>
      (!search || `${l.instrument || l.symbol || ''} ${l.status || ''}`.toLowerCase().includes(search.toLowerCase())) &&
      matchesTimeFilter(l.placedAt || l.createdAt || l.timestamp || l.time)
    ),
    [tradeLogs, search, timeFilter]);

  const filteredBrokerErrors = useMemo(() =>
    brokerErrors.filter((l) =>
      (!search || `${l.message || l.error || ''} ${l.broker || ''}`.toLowerCase().includes(search.toLowerCase())) &&
      matchesTimeFilter(l.timestamp || l.createdAt || l.time)
    ),
    [brokerErrors, search, timeFilter]);

  // Status counts for legend
  const statusCounts = useMemo(() => {
    const counts = { EXECUTED: 0, FAILED: 0, SKIPPED: 0, PENDING: 0 };
    filteredCopyLogs.forEach((l) => {
      const s = normalizeStatus(l.childStatus);
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
              {['Symbol', 'Side', 'Qty', 'Trade ID', 'Child', 'Status', 'Latency', 'Skip Reason', 'Date'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCopyLogs.map((log, i) => {
              const cfg = getStatusCfg(log.childStatus);
              const side = log.tradeType || log.side || (log.masterStatus?.includes('BUY') ? 'BUY' : 'SELL');
              const isFailed = normalizeStatus(log.childStatus) === 'FAILED';
              const isSkipped = normalizeStatus(log.childStatus) === 'SKIPPED';
              const reason = log.errorMessage || log.skipReason || log.message || 'No details provided';

              return (
                <motion.tr
                  key={log.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b border-border/15 border-l-2 hover:bg-black/3 dark:hover:bg-white/3 transition-colors ${cfg.rowCls}`}
                >
                  <td className="px-4 py-3 text-sm font-bold">{log.symbol || 'N/A'}</td>
                  <td className="px-4 py-3">
                    {side ? (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {side}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{log.qty || 0}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono text-muted-foreground bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border/30 truncate max-w-[96px] inline-block" title={log.copyGroupId || log.masterId}>
                      {shortId(log.copyGroupId || log.masterId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[120px]">
                      <p className="text-xs font-black uppercase tracking-tight truncate">{log.childName || log.childId || 'Child'}</p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Master: {log.masterName || 'You'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusPill status={log.childStatus} />
                      {(isFailed || isSkipped) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground transition-colors">
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-[10px] font-bold uppercase tracking-wide leading-relaxed">
                              {reason}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.latencyMs != null && log.latencyMs > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-xs font-black tabular-nums cursor-help flex flex-col ${log.latencyMs < 200 ? 'text-emerald-500' : log.latencyMs < 500 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {log.latencyMs}ms
                              {log.totalExecutionMs != null && (
                                <span className="text-[9px] text-muted-foreground font-bold">Total: {log.totalExecutionMs}ms</span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="space-y-1.5 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1">Execution Timeline</p>
                            <div className="space-y-1 text-[10px]">
                              {(log.masterTriggeredAt || log.engineReceivedAt) && (
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Engine:</span>
                                  <span className="font-bold">{new Date(log.engineReceivedAt || log.masterTriggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</span>
                                </div>
                              )}
                              {(log.childPlacedAt || log.placedAt) && (
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Child placed:</span>
                                  <span className="font-bold">{new Date(log.childPlacedAt || log.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</span>
                                </div>
                              )}
                              {log.completedAt && (
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Completed:</span>
                                  <span className="font-bold">{new Date(log.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}</span>
                                </div>
                              )}
                              {log.totalExecutionMs != null && (
                                <div className="flex justify-between gap-4 pt-1 border-t border-border/40 mt-1">
                                  <span className="text-brand-purple font-black uppercase">Total:</span>
                                  <span className="font-black text-brand-purple">{log.totalExecutionMs}ms</span>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] font-bold text-muted-foreground max-w-[120px] truncate" title={log.skipReason || '-'}>
                    {log.skipReason || '—'}
                  </td>
                  <td className="px-4 py-3 text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                    {formatDate(log.createdAt || log.timestamp || log.time)}
                  </td>
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
            {['ID', 'Instrument', 'Quantity', 'Status', 'Placed At'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredTradeLogs.map((log, i) => (
            <tr key={log.id || i} className="border-b border-border/15 hover:bg-black/3 dark:hover:bg-white/3 transition-colors">
              <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono">{log.id || log.tradeId || '-'}</td>
              <td className="px-4 py-3 text-sm font-bold">{log.instrument || log.symbol || '-'}</td>
              <td className="px-4 py-3 text-sm">{log.quantity || log.qty || 0}</td>
              <td className="px-4 py-3"><StatusPill status={log.status} /></td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(log.placedAt || log.createdAt || log.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  );

  const renderBrokerErrors = () => (
    <>
      <div className="px-4 py-3 border-b border-border/30">
        <DivSelect
          value={selectedBrokerAccountId}
          onChange={setSelectedBrokerAccountId}
          includeEmptyOption={false}
          options={brokerAccounts.map((a) => ({
            value: a.accountId,
            label: `${a.broker} - ${a.userId || a.accountId}`,
          }))}
          triggerClassName="rounded-xl border border-border bg-black/5 dark:bg-white/5 px-3 py-2 text-sm focus:border-brand-purple"
        />
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
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(log.timestamp || log.createdAt)}</span>
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
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-black/5 dark:bg-white/3 p-4 rounded-2xl border border-border/40">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
            {[
              { key: 'all', label: 'All' },
              { key: 'success', label: 'Success' },
              { key: 'failed', label: 'Failed' },
              { key: 'skipped', label: 'Skipped' },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setStatusFilter(v.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  statusFilter === v.key
                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border/40 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            {[
              { key: 'today', label: 'Today', icon: Zap },
              { key: 'weekly', label: 'Week', icon: RotateCcw },
              { key: 'all', label: 'All Time', icon: Clock },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTimeFilter(item.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  timeFilter === item.key
                    ? 'border-brand-purple/30 bg-brand-purple/10 text-brand-purple'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-3 h-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol/master/ref..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-sm focus:outline-none focus:border-brand-purple"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Copy Logs</p>
          <p className="text-2xl font-black">{tabCounts.copy}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Replication events</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Trade Logs</p>
          <p className="text-2xl font-black">{tabCounts.trade}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Master-side trade entries</p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Broker Errors</p>
          <p className="text-2xl font-black text-rose-500">{tabCounts.broker}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Critical integration errors</p>
        </GlassCard>
      </div>

      {/* Tabs with count badges */}
      <div className="p-1 rounded-2xl border border-border/40 bg-black/5 dark:bg-white/5 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'text-foreground bg-black/8 dark:bg-white/8'
                : 'text-muted-foreground hover:text-foreground hover:bg-black/6 dark:hover:bg-white/6'
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
                className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-purple"
              />
            )}
          </button>
        ))}
      </div>

      <GlassCard noPadding className="overflow-hidden">
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
