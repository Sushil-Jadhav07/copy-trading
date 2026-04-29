import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Activity, BarChart2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';

const isOptionSymbol = (value = '') => /(?:\d{2}[A-Z]{3}\d+|[A-Z]+)\d+(?:CE|PE)$/i.test(String(value).trim());

const getSymbol = (item = {}) => item.symbol || item.instrument || item.tradingSymbol || '';

const toMs = (value) => {
  const ms = new Date(value || '').getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const OptionsStatus = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sessionActive, setSessionActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [allAccounts, activeAcc] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null),
        ]);
        setAccounts(allAccounts);
        const activeId = activeAcc?.brokerAccountId || activeAcc?.accountId || '';
        const fallbackId = allAccounts[0]?.accountId || allAccounts[0]?.id || '';
        setSelectedAccountId(activeId || fallbackId);
      } catch (error) {
        addToast(error.message || 'Failed to load broker accounts', 'error');
      }
    };
    loadAccounts();
  }, [addToast]);

  const loadData = async (accountId, silent = false) => {
    if (!accountId) return;
    if (!silent) setLoading(true);
    try {
      const statusData = await brokerService.getAccountStatus(accountId);
      const active =
        statusData?.sessionActive === true ||
        String(statusData?.status || '').toUpperCase() === 'ACTIVE' ||
        String(statusData?.sessionStatus || '').toUpperCase() === 'SESSION_ACTIVE';
      setSessionActive(active);

      if (!active) {
        setPositions([]);
        setOrders([]);
        setTrades([]);
        return;
      }

      const [pos, ord, trd] = await Promise.all([
        brokerService.getPositions(accountId),
        brokerService.getOrders(accountId),
        brokerService.getTrades(accountId),
      ]);
      setPositions(pos);
      setOrders(ord);
      setTrades(trd);
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('session') || msg.includes('login')) {
        setSessionActive(false);
      } else {
        addToast(error.message || 'Failed to load options data', 'error');
      }
      setPositions([]);
      setOrders([]);
      setTrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) loadData(selectedAccountId);
  }, [selectedAccountId]);

  const selectedAccount = accounts.find((item) => (item.accountId || item.id) === selectedAccountId);

  const optionPositions = useMemo(
    () => positions.filter((item) => isOptionSymbol(getSymbol(item))),
    [positions],
  );
  const optionOrders = useMemo(
    () => orders.filter((item) => isOptionSymbol(getSymbol(item))),
    [orders],
  );
  const optionTrades = useMemo(
    () =>
      trades
        .filter((item) => isOptionSymbol(getSymbol(item)))
        .sort((a, b) => toMs(b.time || b.date) - toMs(a.time || a.date)),
    [trades],
  );

  const totalOpenQty = optionPositions.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalOptionsPnl = optionPositions.reduce((sum, item) => sum + Number(item.unrealizedPnl || item.pnl || 0), 0);

  const showSessionWarning = sessionActive === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Options Status</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track option positions, order flow, and taken option trades for master account.</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((a) => ({
                value: a.accountId || a.id,
                label: `${a.broker} - ${a.nickname || a.clientId || a.userId}`,
              }))}
              triggerClassName="w-full sm:w-auto bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm"
            />
          )}
          <button
            onClick={() => {
              setRefreshing(true);
              loadData(selectedAccountId, true);
            }}
            disabled={loading || refreshing}
            className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live — reading options from {selectedAccount?.broker || 'broker'} {selectedAccount?.clientId ? `(${selectedAccount.clientId})` : ''}</span>
        </div>
      )}

      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Broker session expired. Reconnect in Demat Accounts to see live options trades.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-brand-purple" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open Option Positions</p>
          </div>
          <p className="text-xl font-black">{optionPositions.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Option Orders</p>
          </div>
          <p className="text-xl font-black">{optionOrders.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-brand-teal" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taken Option Trades</p>
          </div>
          <p className="text-xl font-black">{optionTrades.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unrealized Option P&L</p>
          </div>
          <p className={`text-xl font-black ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(totalOptionsPnl)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Open Qty: {totalOpenQty}</p>
        </GlassCard>
      </div>

      <GlassCard title="Taken Option Trades" subtitle="Executed option trades for selected master broker account">
        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Instrument', 'Side', 'Qty', 'Price', 'Status', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {optionTrades.map((trade, idx) => (
                  <motion.tr
                    key={trade.id || `${trade.symbol}-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-bold">{trade.symbol || trade.instrument}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${String(trade.type).toUpperCase() === 'BUY' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-purple/10 text-brand-purple'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.qty}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(trade.price || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ['SUCCESS', 'EXECUTED', 'COMPLETE', 'TRADED'].includes(String(trade.status).toUpperCase())
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {trade.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">{trade.time || '-'}</td>
                  </motion.tr>
                ))}
                {optionTrades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No taken option trades found for this account
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

export default OptionsStatus;
