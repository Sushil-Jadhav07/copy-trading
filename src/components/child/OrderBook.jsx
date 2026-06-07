import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff, Info, BookOpen } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { brokerService } from '@/lib/broker';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const PENDING_STATUSES = ['PENDING', 'OPEN', 'TRIGGER PENDING', 'REJECT PENDING'];
const EXECUTED_STATUSES = ['COMPLETE', 'EXECUTED', 'SUCCESS', 'TRADED'];

const ChildOrderBook = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sessionActive, setSessionActive] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [meta, setMeta] = useState({});

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const allAccounts = await brokerService.getAccounts();
        setAccounts(allAccounts);
        setSelectedAccountId(allAccounts[0]?.accountId || allAccounts[0]?.id || '');
      } catch (error) {
        addToast(error.message || 'Failed to load broker accounts', 'error');
      }
    };

    loadAccounts();
  }, [addToast]);

  const loadOrders = async (accountId, silent = false) => {
    if (!accountId) return;
    if (!silent) setLoading(true);
    setSessionLoading(true);

    try {
      const data = await childService.getOpenBook();
      setMeta(data || {});
      const active = !data?.errorCode;
      setSessionActive(active);
      setOrders(active && Array.isArray(data?.orders) ? data.orders : []);
    } catch (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('session') || msg.includes('login')) {
        setSessionActive(false);
      } else {
        addToast(error.message || 'Failed to load child order book', 'error');
      }
      setMeta({});
      setOrders([]);
    } finally {
      setLoading(false);
      setSessionLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!selectedAccountId) return;
    setSessionActive(null);
    setOrders([]);
    loadOrders(selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    if (sessionActive !== true) return undefined;
    const interval = window.setInterval(() => {
      loadOrders(selectedAccountId, true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [selectedAccountId, sessionActive]);

  useEffect(() => {
    if (!selectedAccountId) return undefined;

    const sub = connectChannel(
      'trades',
      (event) => {
        if (['TRADE_COPIED', 'copy_trade', 'TRADE_DETECTED', 'trade_detected', 'MESSAGE'].includes(event)) {
          loadOrders(selectedAccountId, true);
        }
      },
      null,
      null,
    );

    return () => sub.close();
  }, [selectedAccountId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(selectedAccountId, true);
  };

  const pendingOrders = orders.filter((order) => PENDING_STATUSES.includes(String(order.status).toUpperCase()));
  const executedOrders = orders.filter((order) => EXECUTED_STATUSES.includes(String(order.status).toUpperCase()));
  const selectedAccount = accounts.find((item) => (item.accountId || item.id) === selectedAccountId);
  const showSessionWarning = sessionActive === false && !sessionLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Order Book</h1>
          <p className="text-sm text-muted-foreground">Today's child orders for this broker account</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((account) => ({
                value: account.accountId || account.id,
                label: `${account.broker} - ${account.nickname || account.clientId || account.userId}`,
              }))}
              triggerClassName="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm"
            />
          )}
          <RefreshButton onClick={handleRefresh} loading={loading || refreshing} />
        </div>
      </div>

      {showSessionWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-400">Broker session expired</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {meta.error || 'Your broker session is not active. Go to Demat Accounts and reconnect to see live child orders.'}
              {' '}
              <a href="/child/user-management" className="text-brand-purple underline">Open Demat Accounts</a>
            </p>
          </div>
        </div>
      )}

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="h-3.5 w-3.5" />
          <span>
            Live - reading orders from {meta.broker || selectedAccount?.broker || 'broker'}
            {selectedAccount?.clientId ? ` (${selectedAccount.clientId})` : ''}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[
          { label: 'Total Orders', value: orders.length, icon: BookOpen, tone: 'text-brand-purple' },
          { label: 'Pending', value: pendingOrders.length, icon: RefreshCw, tone: 'text-amber-500' },
          { label: 'Executed', value: executedOrders.length, icon: Wifi, tone: 'text-emerald-500' },
        ].map((item) => (
          <GlassCard key={item.label}>
            <div className="mb-2 flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.tone}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
            </div>
            <p className={`text-xl font-black ${item.tone}`}>{item.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        {(loading || sessionLoading) ? (
          <div className="p-4">
            <SkeletonLoader type="table" rows={5} columns={10} />
          </div>
        ) : showSessionWarning ? (
          <div className="py-16 text-center">
            <WifiOff className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="text-sm text-muted-foreground">Reconnect your broker to see orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border/50 bg-black/3 dark:bg-white/3">
                  {['#', 'Symbol', 'Exchange', 'Segment', 'Order Type', 'Side', 'Qty', 'Price', 'Status'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {orders.map((order, idx) => {
                  const reason = order.statusMessage || order.reason || order.message || '';
                  const side = String(order.type || 'UNKNOWN').toUpperCase();
                  const status = String(order.status || 'UNKNOWN').toUpperCase();
                  const isExecuted = EXECUTED_STATUSES.includes(status);
                  const isPending = PENDING_STATUSES.includes(status);
                  return (
                    <motion.tr
                      key={order.id || `${order.symbol}-${idx}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-black uppercase tracking-tight">{order.symbol || '-'}</td>
                      <td className="px-4 py-3 text-xs font-bold">{order.exchange || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded border border-border/30 bg-black/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-muted-foreground dark:bg-white/5">
                          {order.segment || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">{order.orderType || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex min-w-[3.75rem] items-center justify-center rounded px-2 py-1 text-[10px] font-black tracking-wide ${side === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{order.qty ?? '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{order.price > 0 ? formatCurrency(order.price) : 'MARKET'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${isExecuted ? 'bg-emerald-500/10 text-emerald-500' : isPending ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {status}
                          </span>
                          {reason && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-muted-foreground transition-colors hover:text-foreground" aria-label={reason}>
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[240px] text-xs font-medium">
                                  {reason}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {orders.length === 0 && (
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

export default ChildOrderBook;
