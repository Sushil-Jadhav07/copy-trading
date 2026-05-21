import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, WifiOff, Wifi } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';
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

  // Accounts
  const [accounts, setAccounts]             = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Session
  const [sessionActive, setSessionActive]   = useState(null); // null = unknown, true/false
  const [sessionLoading, setSessionLoading] = useState(false);

  // Positions
  const [positions, setPositions]           = useState([]);
  const [positionsMeta, setPositionsMeta]   = useState({});
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // Modals
  const [closeModal, setCloseModal]               = useState(false);
  const [selectedPos, setSelectedPos]             = useState(null);
  const [childDetailModal, setChildDetailModal]   = useState(false);
  const [selectedChildren, setSelectedChildren]   = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState('');

  // ── 1. Load broker accounts on mount ────────────────────────────────────────
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [allAccounts, activeAcc] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null)
        ]);
        
        setAccounts(allAccounts);
        
        // Priority: 1. Active Master Account, 2. First account from list
        const activeId = activeAcc?.brokerAccountId || activeAcc?.accountId;
        const fallbackId = allAccounts.length > 0 ? (allAccounts[0]?.accountId || allAccounts[0]?.id) : '';
        
        setSelectedAccountId(activeId || fallbackId);
      } catch (e) {
        addToast(e.message, 'error');
      }
    };
    
    loadAccounts();
  }, [addToast]);

  // ── 2. Check session + load positions whenever account changes ───────────────
  const loadPositions = useCallback(async (_accountId, silent = false) => {
    if (!silent) setLoading(true);
    setSessionLoading(true);

    try {
      const liveData = await masterService.getPositions().catch(() => null);
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
        // Degrade gracefully: allow positions API to determine auth/session validity.
        isActive = true;
      }

      setSessionActive(isActive);

      if (!isActive) {
        setPositions([]);
        return;
      }

      // Session is active → prefer dashboard payload (more consistent across brokers)
      const dashboard = await brokerService.getDashboard(accountId).catch(() => null);
      const dashboardPositions = Array.isArray(dashboard?.positions) ? dashboard.positions : [];
      if (dashboardPositions.length > 0) {
        setPositions(dashboardPositions);
      } else {
        const data = await brokerService.getPositions(accountId);
        setPositions(data);
      }
    } catch (e) {
      // If the error is a session error, mark session as inactive
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

  // ── 3. WebSocket for real-time updates ──────────────────────────────────────
  useEffect(() => {
    // 3.1 Listen to positions channel for P&L and status updates
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
            })
          );
        }
      },
      null,
      null,
    );

    // 3.2 Listen to trades channel to refresh list when a new trade is copied
    const tradeSub = connectChannel(
      'trades',
      (event) => {
        if (['TRADE_COPIED', 'copy_trade', 'TRADE_DETECTED', 'trade_detected'].includes(event)) {
          // New trade occurred, refresh the full positions list
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
  }, [selectedAccountId]);

  // ── 4. Close position ────────────────────────────────────────────────────────
  const confirmClose = async () => {
    if (!selectedPos) return;
    try {
      await brokerService.closePosition(selectedAccountId, {
        symbol: selectedPos.symbol || selectedPos.instrument,
        qty: selectedPos.qty,
        type: 'SELL',
        product: selectedPos.market || 'MIS',
      });
      setPositions((prev) => prev.filter((p) => p.id !== selectedPos.id));
      setCloseModal(false);
      addToast(`${selectedPos.instrument} position closed`, 'success');
    } catch (e) {
      addToast(e.message || 'Failed to close position', 'error');
      setCloseModal(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPositions(selectedAccountId, true);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const totalUnrealized   = Number.isFinite(Number(positionsMeta.totalPnl))
    ? Number(positionsMeta.totalPnl)
    : positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
  const followersCount    = positions.reduce((s, p) => s + (Array.isArray(p.children) ? p.children.length : 0), 0);
  const selectedAccount   = accounts.find((a) => (a.accountId || a.id) === selectedAccountId);

  // ── Render: No accounts ───────────────────────────────────────────────────────
  if (accounts.length === 0 && !loading && !sessionLoading && positionsMeta.errorCode === 'LEGACY_NO_ACCOUNTS') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions — followers are copying these in real-time</p>
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

  // ── Render: Session inactive ──────────────────────────────────────────────────
  const showSessionWarning = sessionActive === false && !sessionLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions — followers are copying these in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
                        <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              className="w-full sm:w-auto"
              options={accounts.map((a) => ({
                value: a.accountId || a.id,
                label: `${a.broker} - ${a.nickname || a.clientId}`,
              }))}
              triggerClassName="w-full sm:w-auto bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:border-brand-purple"
            />
          )}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Session expired banner */}
      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">Broker session expired</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {positionsMeta.error || `Your ${selectedAccount?.broker || 'broker'} session is not active.`}
              {' '}
              <a href="/master/demat" className="underline text-brand-purple">
                {positionsMeta.action === 'LOGIN_BROKER' ? 'Connect Broker' : 'Re-login to broker'}
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Session active indicator */}
      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live - reading positions from {positionsMeta.brokerId || selectedAccount?.broker || 'broker'} {selectedAccount?.clientId ? `(${selectedAccount.clientId})` : ''}; auto-refresh every 15s</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: 'Open Positions',     value: positions.length },
          {
            label: 'Unrealized P&L',
            value: formatCurrency(Math.abs(totalUnrealized)),
            color: totalUnrealized >= 0 ? 'text-success' : 'text-danger',
            prefix: totalUnrealized < 0 ? '-' : '',
          },
          { label: 'Followers Copying',    value: followersCount,  color: 'text-brand-purple' },
          { label: 'Total Child Positions', value: followersCount,  color: 'text-brand-blue'   },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>
              {s.prefix}{s.value}
            </p>
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

      {/* Table */}
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Instrument', 'Type', 'Qty', 'Price', 'Unrealized P&L', 'Change %', 'Children Copying', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => {
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
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                          pos.type === 'BUY'
                            ? 'bg-success/20 text-success border-success/30'
                            : 'bg-danger/20 text-danger border-danger/30'
                        }`}>
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
                            onClick={() => { setSelectedChildren(childList); setSelectedInstrument(pos.instrument); setChildDetailModal(true); }}
                            className="text-xs text-brand-purple font-medium hover:underline"
                          >
                            {childList.length}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedPos(pos); setCloseModal(true); }}
                          className="px-3 py-1 bg-danger/20 hover:bg-danger/30 border border-danger/30 text-danger rounded text-xs font-bold transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {positions.length === 0 && !showSessionWarning && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No open positions for this account
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Close Position Modal */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Close Position" size="sm">
        {selectedPos && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[
                ['Instrument', selectedPos.instrument],
                ['Type', selectedPos.type],
                ['Qty', selectedPos.qty],
                ['LTP', `₹${(selectedPos.ltp || 0).toFixed(2)}`],
                ['Unrealized P&L', ((selectedPos.unrealizedPnl || 0) >= 0 ? '+' : '') + formatCurrency(selectedPos.unrealizedPnl || 0)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCloseModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={confirmClose} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Close Position</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Children Detail Modal */}
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
          <button onClick={() => setChildDetailModal(false)} className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors mt-2">Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default OpenPositions;

