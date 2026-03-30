import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Sparkline from '@/components/charts/Sparkline';
import { holdings, formatCurrency } from '@/data/mockData';

const Holdings = () => {
  const safeHoldings = holdings || [];
  const totalValue = safeHoldings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalReturn = safeHoldings.reduce((sum, h) => sum + (h.totalReturn || 0), 0);
  const dayChange = safeHoldings.reduce(
    (sum, h) => sum + ((h.currentValue || 0) * (h.dayChange || 0)) / 100,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Holdings</h1>
          <p className="text-muted-foreground">
            Total Portfolio Value:{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(totalValue)}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Day's Change</p>
            <p
              className={`font-medium ${
                dayChange >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {dayChange >= 0 ? '+' : ''}
              {formatCurrency(dayChange)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Return</p>
            <p
              className={`font-medium ${
                totalReturn >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {totalReturn >= 0 ? '+' : ''}
              {formatCurrency(totalReturn)}
            </p>
          </div>
        </div>
      </div>

      {/* Holdings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeHoldings.map((holding) => (
          <GlassCard key={holding.id} hover={false}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="font-semibold">{holding.symbol}</h3>
                <p className="text-sm text-muted-foreground">{holding.name}</p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm flex-shrink-0 ${
                  (holding.dayChange || 0) >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {(holding.dayChange || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {(holding.dayChange || 0) >= 0 ? '+' : ''}
                {holding.dayChange || 0}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Qty</p>
                <p className="font-medium">{holding.qty || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Buy Price</p>
                <p className="font-medium">₹{holding.avgBuyPrice || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="font-medium">
                  {formatCurrency(holding.currentValue || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Return</p>
                <p
                  className={`font-medium ${
                    (holding.totalReturn || 0) >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {(holding.totalReturn || 0) >= 0 ? '+' : ''}
                  {formatCurrency(holding.totalReturn || 0)}
                </p>
              </div>
            </div>

            <Sparkline
              data={[
                (holding.avgBuyPrice || 0) * 0.95,
                (holding.avgBuyPrice || 0) * 0.98,
                (holding.avgBuyPrice || 0),
                (holding.currentPrice || 0) * 0.99,
                (holding.currentPrice || 0),
              ]}
              color={(holding.dayChange || 0) >= 0 ? '#10B981' : '#EF4444'}
            />
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Holdings;
