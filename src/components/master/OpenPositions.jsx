import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, Wifi, Search } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import RefreshButton from '@/components/shared/RefreshButton';
import DownloadButton from '@/components/shared/DownloadButton';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import DivSelect from '@/components/shared/DivSelect';
import { formatCurrency } from '@/lib/utils';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const parseActive = (v) => {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const u = v.trim().toUpperCase();
    return ['TRUE', '1', 'ACTIVE', 'SESSION_ACTIVE', 'CONNECTED', 'LOGGED_IN', 'AUTHORIZED'].includes(u);
  }
  return false;
};

const OpenPositions = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sessionActive, setSessionActive] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [positionsMeta, setPositionsMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [childDetailModal, setChildDetailModal] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [allAccounts, activeAcc] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null),
        ]);

        setAccounts(allAccounts);
        const activeId = activeAcc?.brokerAccountId || activeAcc?.accountId;
        const fallbackId = allAccounts.length > 0 ? (allAccounts[0]?.accountId || allAccounts[0]?.id) : '';
        setSelectedAccountId(activeId || fallbackId);
      } catch (e) {
        addToast(e.message, 'error');
      }
    };

    loadAccounts();
  }, [addToast]);

  const loadPositions = useCallback(async (_accountId, silent = false) => {
    if (!_accountId) {
      setPositions([]);
      setPositionsMeta({});
      setSessionActive(null);
      setLoading(false);
      setSessionLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) setLoading(true);
    setSessionLoading(true);

    try {
      const liveData = await masterService.getPositions(_accountId).catch(() => null);
      if (liveData) {
        setPositionsMeta(liveData);
        setPositions(Array.isArray(liveData.positions) ? liveData.positions : []);
        setSessionActive(!liveData.errorCode);
        return;
      }

      const accountId = _accountId;
      let isActive = false;
      try {
        const statusData = await brokerService.getAccountStatus(accountId);
        isActive =
          parseActive(statusData?.sessionActive) ||
          parseActive(statusData?.isSessionActive) ||
          parseActive(statusData?.status) ||
          parseActive(statusData?.sessionStatus) ||
          parseActive(statusData?.connectionHealth);
      } catch {
        isActive = true;
      }

      setSessionActive(isActive);

      if (!isActive) {
        setPositions([]);
        return;
      }

      const dashboard = await brokerService.getDashboard(accountId).catch(() => null);
      const dashboardPositions = Array.isArray(dashboard?.positions) ? dashboard.positions : [];
      if (dashboardPositions.length > 0) {
        setPositions(dashboardPositions);
      } else {
        const data = await brokerService.getPositions(accountId);
        setPositions(data);
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('login')) {
        setSessionActive(false);
      } else {
        addToast(e.message, 'error');
      }
      setPositions([]);
    } finally {
      setLoading(false);
      setSessionLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!selectedAccountId) return;
    setSessionActive(null);
    setPositions([]);
    loadPositions(selectedAccountId);
  }, [selectedAccountId, loadPositions]);

  useEffect(() => {
    if (sessionActive !== true) return undefined;
    const interval = window.setInterval(() => {
      loadPositions(selectedAccountId, true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [selectedAccountId, sessionActive, loadPositions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPositions(selectedAccountId, true);
  }, [loadPositions, selectedAccountId]);

  useEffect(() => {
    const posSub = connectChannel(
      'positions',
      (event, data) => {
        if (['POSITION_UPDATE', 'position_update', 'POSITION_UPDATED', 'MESSAGE'].includes(event)) {
          setPositions((prev) =>
            prev.map((p) => {
              const incomingSymbol = data?.symbol || data?.instrument || data?.tradingSymbol || data?.tradingsymbol;
              if (p.symbol !== incomingSymbol && p.instrument !== incomingSymbol) return p;

              const ltp = Number(data?.ltp ?? data?.lastPrice ?? data?.last_price ?? p.ltp ?? 0);
              const avgPrice = Number(data?.avgPrice ?? data?.averagePrice ?? data?.average_price ?? p.avgPrice ?? 0);
              const qty = Number(data?.qty ?? data?.quantity ?? p.qty ?? 0);
              const rawPnl = data?.unrealizedPnl ?? data?.unrealized_pnl ?? data?.unrealised ?? data?.pnl ?? data?.m2m ?? data?.mtm;
              const nextPnl = rawPnl != null
                ? Number(rawPnl)
                : (ltp && avgPrice && qty ? (ltp - avgPrice) * Math.abs(qty) : p.unrealizedPnl);

              return {
                ...p,
                ...data,
                ltp,
                avgPrice,
                unrealizedPnl: Number.isFinite(nextPnl) ? nextPnl : p.unrealizedPnl,
              };
            }),
          );
        }
      },
      null,
      null,
    );

    const tradeSub = connectChannel(
      'trades',
      (event) => {
        if (['TRADE_COPIED', 'copy_trade', 'TRADE_DETECTED', 'trade_detected'].includes(event)) {
          handleRefresh();
        }
      },
      null,
      null,
    );

    return () => {
      posSub.close();
      tradeSub.close();
    };
  }, [handleRefresh]);

  const totalUnrealized = Number.isFinite(Number(positionsMeta.totalPnl))
    ? Number(positionsMeta.totalPnl)
    : positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
  const followersCount = positions.reduce((s, p) => s + (Array.isArray(p.children) ? p.children.length : 0), 0);
  const selectedAccount = accounts.find((a) => (a.accountId || a.id) === selectedAccountId);

  const filteredPositions = positions.filter((p) => {
    const matchType   = typeFilter === 'all' || String(p.type || '').toUpperCase() === typeFilter;
    const matchSearch = !search || String(p.instrument || p.symbol || '').toUpperCase().includes(search.toUpperCase());
    return matchType && matchSearch;
  });

  const handleDownload = useCallback(() => {
    try {
      const rows = filteredPositions.map((pos, idx) => {
        const childList = Array.isArray(pos.children) ? pos.children : [];
        return {
          '#': idx + 1,
          Instrument: pos.instrument || pos.symbol || '-',
          Type: pos.type || '-',
          Qty: pos.qty ?? '-',
          Price: Number(pos.ltp ?? pos.avgPrice ?? 0),
          'Avg Price': Number(pos.avgPrice ?? 0),
          LTP: Number(pos.ltp ?? pos.avgPrice ?? 0),
          'Unrealized P&L': Number(pos.unrealizedPnl ?? 0),
          'Change %': Number(pos.change ?? 0),
          'Children Copying': childList.length,
          'Children Details': childList.map((child) => `${child.name || child.childName || 'Child'} (${child.qty || 0})`).join(', '),
          Broker: positionsMeta.brokerId || selectedAccount?.broker || '',
          'Client ID': selectedAccount?.clientId || '',
        };
      });

      downloadExcelSheet({
        rows,
        sheetName: 'Open Positions',
        fileName: buildExportFileName('Master Open Positions'),
      });
      addToast('Open positions Excel downloaded', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to download Excel sheet', 'error');
    }
  }, [addToast, filteredPositions, positionsMeta.brokerId, selectedAccount?.broker, selectedAccount?.clientId]);

  if (accounts.length === 0 && !loading && !sessionLoading && positionsMeta.errorCode === 'LEGACY_NO_ACCOUNTS') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions - followers are copying these in real-time</p>
        </div>
        <GlassCard>
          <div className="py-16 text-center">
            <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No broker accounts connected</p>
            <p className="text-xs text-muted-foreground mt-1">Go to Demat Accounts and connect a broker first.</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  const showSessionWarning = sessionActive === false && !sessionLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions - followers are copying these in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((a) => ({
                value: a.accountId || a.id,
                label: `${a.broker} - ${a.nickname || a.clientId}`,
              }))}
              triggerClassName="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:border-brand-purple"
            />
          )}
          <DownloadButton onClick={handleDownload} disabled={filteredPositions.length === 0} label="Excel" />
          <RefreshButton onClick={handleRefresh} loading={loading || refreshing} />
        </div>
      </div>

      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">Broker session expired</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {positionsMeta.error || `Your ${selectedAccount?.broker || 'broker'} session is not active.`}{' '}
              <a href="/master/demat" className="underline text-brand-purple">
                {positionsMeta.action === 'LOGIN_BROKER' ? 'Connect Broker' : 'Re-login to broker'}
              </a>
            </p>
          </div>
        </div>
      )}

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live - reading positions from {positionsMeta.brokerId || selectedAccount?.broker || 'broker'} {selectedAccount?.clientId ? `(${selectedAccount.clientId})` : ''}; auto-refresh every 15s</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: 'Open Positions', value: positions.length },
          {
            label: 'Unrealized P&L',
            value: formatCurrency(Math.abs(totalUnrealized)),
            color: totalUnrealized >= 0 ? 'text-success' : 'text-danger',
            prefix: totalUnrealized < 0 ? '-' : '',
          },
          { label: 'Followers Copying', value: followersCount, color: 'text-brand-purple' },
          { label: 'Total Child Positions', value: followersCount, color: 'text-brand-blue' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.prefix}{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {(() => {
        const now = new Date();
        const day = now.getDay();
        const isWeekday = day >= 1 && day <= 5;
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const afterAutoSquare = isWeekday && (hours > 15 || (hours === 15 && minutes >= 20));
        if (!afterAutoSquare) return null;
        return (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
            <svg className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Auto-Square-Off May Have Occurred</p>
              <p className="text-[11px] text-amber-500/80 mt-0.5">
                Brokers auto-square all MIS/intraday positions at 3:20 PM. Your positions below may not reflect the actual state of your broker account. Refresh to see current live positions.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all',  label: 'All' },
              { key: 'BUY',  label: 'Buy Only' },
              { key: 'SELL', label: 'Sell Only' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  typeFilter === f.key
                    ? f.key === 'BUY'  ? 'bg-emerald-500 text-white'
                    : f.key === 'SELL' ? 'bg-rose-500 text-white'
                    : 'bg-brand-purple text-white'
                    : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search instrument..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-border bg-black/5 dark:bg-white/5 focus:outline-none focus:border-brand-purple w-44"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard noPadding>
        {(loading || sessionLoading) ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={10} /></div>
        ) : showSessionWarning ? (
          <div className="py-16 text-center">
            <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Reconnect your broker to see positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Instrument', 'Type', 'Qty', 'Price', 'Unrealized P&L', 'Change %', 'Children Copying'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos, idx) => {
                  const childList = Array.isArray(pos.children) ? pos.children : [];
                  return (
                    <motion.tr
                      key={pos.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-border/30 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{pos.instrument || pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold text-white ${pos.type === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {pos.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{pos.qty}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium">{formatCurrency(pos.ltp || pos.avgPrice || 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${(pos.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {(pos.unrealizedPnl || 0) >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${(pos.change || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {(pos.change || 0) >= 0 ? '+' : ''}{(pos.change || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {childList.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedChildren(childList);
                              setSelectedInstrument(pos.instrument);
                              setChildDetailModal(true);
                            }}
                            className="text-xs text-brand-purple font-medium hover:underline"
                          >
                            {childList.length}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredPositions.length === 0 && !showSessionWarning && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {positions.length === 0 ? 'No open positions for this account' : 'No positions match the selected filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={childDetailModal} onClose={() => setChildDetailModal(false)} title={`Children copying ${selectedInstrument}`} size="md">
        <div className="space-y-3">
          {selectedChildren.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
              <span className="text-sm font-medium">{c.name || c.childName || `Child ${idx + 1}`}</span>
              <div className="text-right text-sm">
                <p className="text-amber-400 font-bold">{c.multiplier || 1}x multiplier</p>
                <p className="text-muted-foreground text-xs">Qty: {c.qty || 0}</p>
              </div>
            </div>
          ))}
          <button onClick={() => setChildDetailModal(false)} className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors mt-2">Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default OpenPositions;
