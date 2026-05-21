import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, WifiOff, Wifi, Activity } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { brokerService } from '@/lib/broker';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const ChildOpenPositions = () => {
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

  // ── 1. Load child broker accounts on mount ──────────────────────────────────
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const allAccounts = await brokerService.getAccounts();
        setAccounts(allAccounts);
        
        if (allAccounts.length > 0) {
          setSelectedAccountId(allAccounts[0]?.accountId || allAccounts[0]?.id);
        }
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
      const data = await childService.getPositions();
      setPositionsMeta(data);
      setPositions(Array.isArray(data.positions) ? data.positions : []);
      setSessionActive(!data.errorCode);
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
    const posSub = connectChannel(
      'positions',
      (event, data) => {
        if (['POSITION_UPDATE', 'position_update', 'POSITION_UPDATED', 'MESSAGE'].includes(event)) {
          setPositions((prev) =>
            prev.map((p) => (p.symbol === data?.symbol ? { ...p, ...data } : p))
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
  }, [selectedAccountId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPositions(selectedAccountId, true);
  };

  const totalUnrealized = Number.isFinite(Number(positionsMeta.totalPnl))
    ? Number(positionsMeta.totalPnl)
    : positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0);
  const selectedAccount = accounts.find((a) => (a.accountId || a.id) === selectedAccountId);

  const showSessionWarning = sessionActive === false && !sessionLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions — updated in real-time</p>
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
          >
            <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">Broker session expired</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {positionsMeta.error || 'Your broker session is not active. Go to Demat Accounts and connect your broker.'}
              {' '}
              <a href="/child/demat" className="underline text-brand-purple">
                {positionsMeta.action === 'LOGIN_BROKER' ? 'Connect Broker' : 'Re-login to broker'}
              </a>
            </p>
          </div>
        </div>
      )}

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live - reading positions from {positionsMeta.brokerId || selectedAccount?.broker || 'broker'}; auto-refresh every 15s</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <GlassCard>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Open Positions</p>
          <p className="text-2xl font-black mt-1">{positions.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Unrealized P&L</p>
          <p className={`text-2xl font-black mt-1 ${totalUnrealized >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalUnrealized >= 0 ? '+' : ''}{formatCurrency(totalUnrealized)}
          </p>
        </GlassCard>
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

      <GlassCard noPadding>
        {(loading || sessionLoading) ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={7} /></div>
        ) : showSessionWarning ? (
          <div className="py-16 text-center">
            <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Reconnect your broker to see positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-black/3 dark:bg-white/3">
                  {['#', 'Instrument', 'Type', 'Qty', 'Avg. Price', 'LTP', 'Unrealized P&L', 'Change %'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {positions.map((pos, idx) => (
                  <motion.tr
                    key={pos.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-black/5 dark:hover:bg-white/2 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{pos.instrument || pos.symbol}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{pos.exchange || 'NSE'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
                        pos.type === 'BUY'
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      }`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black">{pos.qty}</td>
                    <td className="px-6 py-4 text-sm font-bold tabular-nums">{formatCurrency(pos.avgPrice || 0)}</td>
                    <td className="px-6 py-4 text-sm font-bold tabular-nums text-brand-purple">{formatCurrency(pos.ltp || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-black tabular-nums ${(pos.unrealizedPnl || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(pos.unrealizedPnl || 0) >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black tabular-nums ${(pos.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(pos.change || 0) >= 0 ? '+' : ''}{(pos.change || 0).toFixed(2)}%
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
                        <Activity className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-tight">No Open Positions</h3>
                      <p className="text-xs text-muted-foreground mt-1">Your live trades will appear here once they are executed.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default ChildOpenPositions;
