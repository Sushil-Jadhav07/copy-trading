import React from 'react';
import { RefreshCw } from 'lucide-react';

const RefreshButton = ({ onClick, loading = false, label = 'Refresh', className = '', disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={`btn-ghost rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${className}`}
  >
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    {loading ? 'Refreshing' : label}
  </button>
);

export default RefreshButton;
