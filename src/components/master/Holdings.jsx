import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Sparkline from '@/components/charts/Sparkline';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { brokerService } from '@/lib/broker';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const Holdings = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    brokerService.getAccounts().then((data) => {
      if (!isMounted) return;
      setAccounts(data);
      setSelectedAccountId(data[0]?.accountId || '');
    }).catch((error) => addToast(error.message, 'error'));

    return () => { isMounted = false; };
  }, [addToast]);

  useEffect(() => {
    if (!selectedAccountId) return;
    let isMounted = true;
    setLoading(true);
    brokerService.getPositions(selectedAccountId).then((data) => {
      if (!isMounted) return;
      setHoldings(data.map((item) => ({
        id: item.id,
        symbol: item.symbol,
        name: item.instrument,
        qty: item.qty,
        avgBuyPrice: item.avgPrice,
        currentPrice: item.ltp,
        currentValue: item.ltp * item.qty,
        totalReturn: item.unrealizedPnl,
        dayChange: item.change,
      })));
    }).catch((error) => addToast(error.message, 'error')).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [selectedAccountId, addToast]);

  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalReturn = holdings.reduce((sum, h) => sum + (h.totalReturn || 0), 0);
  const dayChange = holdings.reduce((sum, h) => sum + ((h.currentValue || 0) * (h.dayChange || 0)) / 100, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Holdings</h1>
          <p className="text-sm text-muted-foreground">Total Portfolio Value: <span className="font-medium text-foreground">{formatCurrency(totalValue)}</span></p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {accounts.length > 1 && (
            <select 
              value={selectedAccountId} 
              onChange={(e) => setSelectedAccountId(e.target.value)} 
              className="w-full sm:w-auto bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
            >
              {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.broker} - {account.nickname}</option>)}
            </select>
          )}
          <div className="flex items-center justify-between gap-6 sm:justify-end">
            <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day's Change</p><p className={`text-sm font-bold ${dayChange >= 0 ? 'text-success' : 'text-danger'}`}>{dayChange >= 0 ? '+' : ''}{formatCurrency(dayChange)}</p></div>
            <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Return</p><p className={`text-sm font-bold ${totalReturn >= 0 ? 'text-success' : 'text-danger'}`}>{totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}</p></div>
          </div>
        </div>
      </div>

      {loading ? <SkeletonLoader type="card" count={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdings.map((holding) => (
            <GlassCard key={holding.id} hover={false}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0"><h3 className="font-semibold">{holding.symbol}</h3><p className="text-sm text-muted-foreground">{holding.name}</p></div>
                <div className={`flex items-center gap-1 text-sm flex-shrink-0 ${(holding.dayChange || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{(holding.dayChange || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{(holding.dayChange || 0) >= 0 ? '+' : ''}{holding.dayChange || 0}%</div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-4">
                <div><p className="text-xs text-muted-foreground">Qty</p><p className="font-medium">{holding.qty || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Avg Buy Price</p><p className="font-medium">₹{holding.avgBuyPrice || 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Current Value</p><p className="font-medium">{formatCurrency(holding.currentValue || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Return</p><p className={`font-medium ${(holding.totalReturn || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{(holding.totalReturn || 0) >= 0 ? '+' : ''}{formatCurrency(holding.totalReturn || 0)}</p></div>
              </div>
              <Sparkline data={[(holding.avgBuyPrice || 0) * 0.95, (holding.avgBuyPrice || 0) * 0.98, (holding.avgBuyPrice || 0), (holding.currentPrice || 0) * 0.99, (holding.currentPrice || 0)]} color={(holding.dayChange || 0) >= 0 ? '#10B981' : '#EF4444'} />
            </GlassCard>
          ))}
          {!holdings.length && <p className="text-sm text-muted-foreground">No data available</p>}
        </div>
      )}
    </div>
  );
};

export default Holdings;
