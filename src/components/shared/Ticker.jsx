import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Ticker = () => {
  const [instruments] = useState([]);
  const doubledData = [...instruments, ...instruments];

  return (
    <div className="h-9 bg-white/80 dark:bg-black/40 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 flex items-center overflow-hidden z-20">
      <div className="ticker-container w-full">
        <div className="ticker-content py-1">
          {doubledData.map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-3 px-6 border-r border-slate-100 dark:border-white/5"
            >
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.symbol}</span>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">₹{item.price.toLocaleString('en-IN')}</span>
              <span
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
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
