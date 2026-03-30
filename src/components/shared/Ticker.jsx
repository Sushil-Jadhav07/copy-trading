import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { tickerData } from '@/data/mockData';

const Ticker = () => {
  const doubledData = [...tickerData, ...tickerData];

  return (
    <div className="h-10 bg-gradient-to-r from-brand-purple/20 via-brand-blue/20 to-brand-teal/20 border-b border-black/10 dark:border-white/10 flex items-center overflow-hidden">
      <div className="ticker-container w-full">
        <div className="ticker-content">
          {doubledData.map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-4 sm:px-6 border-r border-black/10 dark:border-white/10"
            >
              <span className="text-xs sm:text-sm font-medium">{item.symbol}</span>
              <span className="text-xs sm:text-sm">Rs.{item.price.toLocaleString('en-IN')}</span>
              <span
                className={`flex items-center gap-0.5 text-[11px] sm:text-xs ${
                  item.change >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {item.change >= 0 ? '+' : ''}
                {item.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ticker;
