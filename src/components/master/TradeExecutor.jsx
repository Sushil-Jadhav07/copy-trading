import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { useTradeEngine } from '@/hooks/useTradeEngine';
import { riskService } from '@/lib/risk';
import { masterService } from '@/lib/master';
import { useBrokerAccounts } from '@/hooks/useBroker';

const baseInputClass =
  'w-full rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5';

const emptyTradeForm = {
  instrument: '',
  exchange: 'NSE',
  orderType: 'MARKET',
  transactionType: 'BUY',
  quantity: '',
  price: '',
  product: 'MIS',
  validity: 'DAY',
};

const emptyCopyForm = {
  symbol: '',
  qty: '',
  side: 'BUY',
  product: 'MIS',
  orderType: 'MARKET',
  price: '',
};

const TradeExecutor = () => {
  const { addToast } = useToast();
  const { accounts } = useBrokerAccounts();
  const { loading, executeTrade, manualCopyTrade } = useTradeEngine();
  const [brokerAccountId, setBrokerAccountId] = useState('');
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [manualCopyOpen, setManualCopyOpen] = useState(false);
  const [copyForm, setCopyForm] = useState(emptyCopyForm);
  const [marginResult, setMarginResult] = useState(null);
  const [checkingMargin, setCheckingMargin] = useState(false);
  const [tradeResult, setTradeResult] = useState(null);
  const [copyResult, setCopyResult] = useState(null);

  useEffect(() => {
    let active = true;
    const loadActiveAccount = async () => {
      try {
        const result = await masterService.getActiveAccount();
        const activeAccountId = result?.brokerAccountId || result?.accountId || '';
        if (active) setBrokerAccountId(activeAccountId);
      } catch {
        // no-op
      }
    };
    loadActiveAccount();
    return () => {
      active = false;
    };
  }, []);

  const accountLabel = useMemo(
    () => accounts.find((item) => String(item.accountId) === String(brokerAccountId)),
    [accounts, brokerAccountId],
  );

  const handleCheckMargin = async () => {
    if (!brokerAccountId) {
      addToast('Select an active broker account first', 'warning');
      return;
    }

    setCheckingMargin(true);
    setMarginResult(null);
    try {
      const result = await riskService.checkMargin({
        brokerAccountId,
        instrument: tradeForm.instrument,
        quantity: Number(tradeForm.quantity),
        orderType: tradeForm.orderType,
      });
      setMarginResult(result);
      addToast(result?.sufficient ? 'Margin available' : 'Margin shortfall detected', result?.sufficient ? 'success' : 'warning');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setCheckingMargin(false);
    }
  };

  const handleTradeSubmit = async (event) => {
    event.preventDefault();
    if (!brokerAccountId) {
      addToast('Select an active broker account first', 'warning');
      return;
    }

    try {
      const result = await executeTrade({
        brokerAccountId,
        instrument: tradeForm.instrument.trim(),
        exchange: tradeForm.exchange,
        segment: tradeForm.exchange,
        orderType: tradeForm.orderType,
        transactionType: tradeForm.transactionType,
        quantity: Number(tradeForm.quantity),
        price: tradeForm.orderType === 'LIMIT' ? Number(tradeForm.price) : undefined,
        product: tradeForm.product,
        validity: tradeForm.validity,
      });
      setTradeResult(result);
      addToast('Trade placed successfully', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleManualCopy = async (event) => {
    event.preventDefault();
    try {
      const result = await manualCopyTrade({
        symbol: copyForm.symbol.trim().toUpperCase(),
        qty: Number(copyForm.qty),
        side: copyForm.side,
        product: copyForm.product,
        orderType: copyForm.orderType,
        price: copyForm.orderType === 'LIMIT' ? Number(copyForm.price) : 0,
      });
      setCopyResult(result);
      addToast('Manual copy triggered', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Execute Trade</h1>
        <p className="text-sm text-muted-foreground">Place a master trade, validate margin, and manually trigger copy replication.</p>
      </div>

      <GlassCard
        title="Trade Executor"
        subtitle={accountLabel ? `${accountLabel.broker} - ${accountLabel.userId || accountLabel.accountId}` : 'Using the currently active master account'}
        action={
          <button
            type="button"
            onClick={() => setManualCopyOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue/90"
          >
            <Zap className="h-4 w-4" />
            {manualCopyOpen ? 'Hide Manual Copy' : 'Manual Copy'}
          </button>
        }
      >
        <form onSubmit={handleTradeSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instrument</label>
              <input value={tradeForm.instrument} onChange={(event) => setTradeForm((current) => ({ ...current, instrument: event.target.value }))} className={baseInputClass} placeholder="e.g. RELIANCE" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exchange</label>
              <select value={tradeForm.exchange} onChange={(event) => setTradeForm((current) => ({ ...current, exchange: event.target.value }))} className={baseInputClass}>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NFO">NFO</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order Type</label>
              <select value={tradeForm.orderType} onChange={(event) => setTradeForm((current) => ({ ...current, orderType: event.target.value }))} className={baseInputClass}>
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction</label>
              <select value={tradeForm.transactionType} onChange={(event) => setTradeForm((current) => ({ ...current, transactionType: event.target.value }))} className={baseInputClass}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</label>
              <input type="number" min="1" value={tradeForm.quantity} onChange={(event) => setTradeForm((current) => ({ ...current, quantity: event.target.value }))} className={baseInputClass} required />
            </div>
            {tradeForm.orderType === 'LIMIT' && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</label>
                <input type="number" min="0" step="0.05" value={tradeForm.price} onChange={(event) => setTradeForm((current) => ({ ...current, price: event.target.value }))} className={baseInputClass} required />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</label>
              <select value={tradeForm.product} onChange={(event) => setTradeForm((current) => ({ ...current, product: event.target.value }))} className={baseInputClass}>
                <option value="MIS">MIS</option>
                <option value="CNC">CNC</option>
                <option value="NRML">NRML</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validity</label>
              <select value={tradeForm.validity} onChange={(event) => setTradeForm((current) => ({ ...current, validity: event.target.value }))} className={baseInputClass}>
                <option value="DAY">DAY</option>
                <option value="IOC">IOC</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleCheckMargin} disabled={checkingMargin} className="inline-flex items-center gap-2 rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-2 text-sm font-semibold text-brand-purple transition-colors hover:bg-brand-purple/15 disabled:opacity-60">
              {checkingMargin ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Check Margin
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 disabled:opacity-60">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Execute Trade
            </button>
          </div>
        </form>

        {marginResult && (
          <div className={`mt-5 rounded-xl border px-4 py-3 ${marginResult.sufficient ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
            <div className="flex items-center gap-2">
              {marginResult.sufficient ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <p className={`text-sm font-semibold ${marginResult.sufficient ? 'text-emerald-500' : 'text-amber-500'}`}>
                {marginResult.sufficient ? 'Sufficient margin available' : `Insufficient margin. Shortfall: ${marginResult.shortfall ?? 0}`}
              </p>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <span>Required: {marginResult.requiredMargin ?? 0}</span>
              <span>Available: {marginResult.availableMargin ?? 0}</span>
              <span>Status: {marginResult.sufficient ? 'PASS' : 'FAIL'}</span>
            </div>
          </div>
        )}
      </GlassCard>

      {tradeResult && (
        <GlassCard title="Execution Result" subtitle="Returned by the trade engine">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Trade ID</p><p className="mt-1 text-sm font-semibold">{tradeResult.tradeId || 'N/A'}</p></div>
            <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Broker Order ID</p><p className="mt-1 text-sm font-semibold">{tradeResult.brokerOrderId || 'N/A'}</p></div>
            <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 text-sm font-semibold">{tradeResult.status || 'N/A'}</p></div>
            <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Replications</p><p className="mt-1 text-sm font-semibold">{tradeResult.replicationsTriggered ?? 0}</p></div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr className="border-b border-border/50">{['Child ID', 'Status', 'Broker', 'Message'].map((header) => <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{header}</th>)}</tr></thead>
              <tbody>
                {(tradeResult.replicationDetails || []).map((item, index) => (
                  <tr key={`${item.childId || 'replication'}-${index}`} className="border-b border-border/20">
                    <td className="px-3 py-3 text-sm">{item.childId || item.child || 'N/A'}</td>
                    <td className="px-3 py-3 text-sm">{item.status || 'N/A'}</td>
                    <td className="px-3 py-3 text-sm">{item.broker || 'N/A'}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{item.message || 'No message'}</td>
                  </tr>
                ))}
                {!(tradeResult.replicationDetails || []).length && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">No replication detail returned for this trade.</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {manualCopyOpen && (
        <GlassCard title="Manual Copy Trade" subtitle="Send a symbol directly to the copy engine">
          <form onSubmit={handleManualCopy} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <input value={copyForm.symbol} onChange={(event) => setCopyForm((current) => ({ ...current, symbol: event.target.value }))} className={baseInputClass} placeholder="Symbol" required />
              <input type="number" min="1" value={copyForm.qty} onChange={(event) => setCopyForm((current) => ({ ...current, qty: event.target.value }))} className={baseInputClass} placeholder="Qty" required />
              <select value={copyForm.side} onChange={(event) => setCopyForm((current) => ({ ...current, side: event.target.value }))} className={baseInputClass}><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
              <select value={copyForm.product} onChange={(event) => setCopyForm((current) => ({ ...current, product: event.target.value }))} className={baseInputClass}><option value="MIS">MIS</option><option value="CNC">CNC</option><option value="NRML">NRML</option></select>
              <button type="submit" className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/90">Trigger Copy</button>
            </div>
          </form>

          {copyResult && (
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Symbol</p><p className="mt-1 text-sm font-semibold">{copyResult.symbol || copyForm.symbol}</p></div>
              <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Master Qty</p><p className="mt-1 text-sm font-semibold">{copyResult.masterQty ?? copyForm.qty}</p></div>
              <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Success</p><p className="mt-1 text-sm font-semibold">{copyResult.success ?? 0}</p></div>
              <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5"><p className="text-xs text-muted-foreground">Failed</p><p className="mt-1 text-sm font-semibold">{copyResult.failed ?? 0}</p></div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};

export default TradeExecutor;
