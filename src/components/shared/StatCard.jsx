import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAnimatedCounter, useAnimatedDecimal } from '@/hooks/useAnimatedCounter';

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
}) => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const animatedValue = decimals > 0
    ? useAnimatedDecimal(safeValue, 2000, decimals)
    : useAnimatedCounter(safeValue, 2000);

  const formatValue = (val) => {
    const normalized = Number.isFinite(Number(val)) ? Number(val) : 0;
    if (isCurrency) return new Intl.NumberFormat('en-IN').format(normalized);
    if (isPercentage) return normalized.toFixed(decimals);
    return normalized;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card p-4 sm:p-5 hover-lift stat-card-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <h3 className="text-xl sm:text-2xl font-bold mt-1 text-foreground break-words">
            {prefix}
            {formatValue(animatedValue)}
            {suffix}
          </h3>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-danger" />
              )}
              <span className={`text-xs font-medium ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
            style={{ boxShadow: '0 4px 15px rgba(0, 200, 150, 0.25)' }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
