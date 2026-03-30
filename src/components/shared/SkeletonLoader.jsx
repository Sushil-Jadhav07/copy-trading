import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonCard = () => {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-24" />
          <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-32" />
          <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-20" />
        </div>
        <div className="w-10 h-10 bg-black/10 dark:bg-white/10 rounded-lg" />
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-black/10 dark:bg-white/10 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="h-4 bg-black/10 dark:bg-white/10 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const SkeletonChart = () => {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-32 mb-4" />
      <div className="h-64 bg-black/10 dark:bg-white/10 rounded" />
    </div>
  );
};

export const SkeletonText = ({ lines = 3 }) => {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-black/10 dark:bg-white/10 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
};

const SkeletonLoader = ({ type = 'card', count = 1, ...props }) => {
  const components = {
    card: SkeletonCard,
    table: SkeletonTable,
    chart: SkeletonChart,
    text: SkeletonText,
  };

  const Component = components[type];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} {...props} />
      ))}
    </>
  );
};

export default SkeletonLoader;
