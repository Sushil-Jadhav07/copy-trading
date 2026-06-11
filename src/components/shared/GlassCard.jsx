import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
  hover = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`glass-card overflow-hidden ${hover ? 'hover-lift' : ''} ${className}`}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100/80 dark:border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="min-w-0">
            {title && (
              <h3 className="font-bold text-slate-800 dark:text-foreground tracking-tight">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs font-medium text-slate-400 dark:text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}
      <div className={`relative z-10 ${noPadding ? '' : 'p-4 sm:p-5'}`}>{children}</div>
    </motion.div>
  );
};

export default GlassCard;
