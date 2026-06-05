import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, WifiOff, Wifi, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const OrderBook = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Session
  const [sessionActive, setSessionActive]   = useState(null); // null=unknown, true/false
  const [sessionLoading, setSessionLoading] = useState(false);

  // Orders
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  // ── 1. Load accounts on mount ────────────────────────────────────────────────
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

  // ── Load session + orders ───────────────────────────────────────────────────
  const loadOrders = useCallback(async (accountId, silent = false) => {
    if (!accountId) return;
    if (!silent) setLoading(true);
    setSessionLoading(true);

    try {
      const data = await masterService.getOpenBook();
      const isActive = !data?.errorCode;
      setSessionActive(isActive);
      if (!isActive) {
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('login')) {
        setSessionActive(false);
      } else {
        addToast(e.message, 'error');
      }
      setOrders([]);
    } finally {
      setLoading(false);
      setSessionLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedAccountId) {
      setSessionActive(null);
      setOrders([]);
      loadOrders(selectedAccountId);
    }
  }, [selectedAccountId, loadOrders]);

  // ── WebSocket listener for real-time order updates ─────────────────────────
  useEffect(() => {
    if (!selectedAccountId) return;

    const sub = connectChannel(
      'trades',
      (event) => {
        if (['TRADE_COPIED', 'copy_trade', 'TRADE_DETECTED', 'trade_detected', 'MESSAGE'].includes(event)) {
          // New trade or order detected, refresh the order book
          loadOrders(selectedAccountId, true);
        }
      },
      null,
      null,
    );

    return () => sub.close();
  }, [selectedAccountId, loadOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(selectedAccountId, true);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const pending  = orders.filter((o) => ['PENDING', 'OPEN', 'TRIGGER PENDING', 'REJECT PENDING'].includes(String(o.status).toUpperCase()));
  const executed = orders.filter((o) => ['COMPLETE', 'EXECUTED', 'SUCCESS', 'TRADED'].includes(String(o.status).toUpperCase()));
  const selectedAccount = accounts.find((a) => (a.accountId || a.id) === selectedAccountId);
  const showSessionWarning = sessionActive === false && !sessionLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Order Book</h1>
          <p className="text-sm text-muted-foreground">Today's orders for this broker account</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
                        <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((a) => ({
                value: a.accountId || a.id,
                label: `${a.broker} - ${a.clientId || a.userId}${a.nickname ? ` (${a.nickname})` : ''}`,
              }))}
              triggerClassName="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:border-brand-purple"
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
              Your {selectedAccount?.broker || 'broker'} session has expired. Go to{' '}
              <a href="/master/demat" className="underline text-brand-purple">Demat Accounts</a>{' '}
              and click <strong>Connect</strong> to re-login and see your orders.
            </p>
          </div>
        </div>
      )}

      {/* Session active indicator */}
      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>
            Live — reading orders from {selectedAccount?.broker || 'broker'}
            {selectedAccount?.clientId ? ` (${selectedAccount.clientId})` : ''}
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Pending',      value: pending.length,  color: 'text-warning' },
          { label: 'Executed',     value: executed.length, color: 'text-success' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Table */}
      <GlassCard noPadding>
        {(loading || sessionLoading) ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={8} /></div>
        ) : showSessionWarning ? (
          <div className="py-16 text-center">
            <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Reconnect your broker to see orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Symbol', 'Exchange', 'Segment', 'Order Type', 'Type', 'Qty', 'Price', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{order.symbol}</td>
                      <td className="px-4 py-3 text-sm">{order.exchange || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                          (order.segment || order.market) === 'FNO'
                            ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                            : 'bg-black/5 dark:bg-white/5 text-muted-foreground border border-border/30'
                        }`}>
                          {order.segment || order.market || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{order.orderType || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                          order.type === 'BUY'
                            ? 'bg-success/20 text-success border-success/30'
                          : 'bg-danger/20 text-danger border-danger/30'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.qty}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.price ? formatCurrency(order.price) : 'MARKET'}
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            String(order.status).toUpperCase() === 'COMPLETE'
                              ? 'bg-success/20 text-success'
                              : ['PENDING', 'OPEN', 'TRIGGER PENDING'].includes(String(order.status).toUpperCase())
                              ? 'bg-warning/20 text-warning'
                              : 'bg-danger/20 text-danger'
                          }`}>
                            {order.status}
                          </span>
                          
                          {(order.statusMessage || order.reason || order.message) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-xs font-medium">
                                  {order.statusMessage || order.reason || order.message}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                  </motion.tr>
                ))}
                {orders.length === 0 && !showSessionWarning && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders found for today
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

export default OrderBook;



