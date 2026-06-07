import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAnimatedCounter, useAnimatedDecimal } from '@/hooks/useAnimatedCounter';
import { formatCurrency, roundTo } from '@/lib/utils';

const StatCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  change,
  changeLabel,
  icon: Icon,
  gradient = 'from-brand-purple to-brand-blue',
  isCurrency = false,
  isPercentage = false,
  emptyLabel = '—',
}) => {
  const hasValue = value != null && Number.isFinite(Number(value));
  const safeValue = hasValue ? Number(value) : 0;
  const animatedValue = decimals > 0
    ? useAnimatedDecimal(safeValue, 2000, decimals)
    : useAnimatedCounter(safeValue, 2000);

  const formatValue = (val) => {
    if (!hasValue) return emptyLabel;
    const normalized = Number.isFinite(Number(val)) ? Number(val) : 0;
    if (isCurrency) return formatCurrency(normalized);
    if (isPercentage) return String(roundTo(normalized, decimals));
    return normalized;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card p-5 sm:p-6 hover-lift group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-foreground break-words tracking-tight">
            {hasValue ? prefix : ''}
            {formatValue(animatedValue)}
            {hasValue ? suffix : ''}
          </h3>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-3">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                change >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {change >= 0 ? '+' : ''}{change}%
              </div>
              {changeLabel && (
                <span className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground uppercase tracking-wider">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 relative`}
            style={{ boxShadow: '0 8px 20px -4px rgba(0, 200, 150, 0.3)' }}>
            <div className="absolute inset-0 rounded-2xl border border-white/20 dark:border-white/10" />
            <Icon className="w-6 h-6 text-white relative z-10" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
