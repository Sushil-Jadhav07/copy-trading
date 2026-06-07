import React from 'react';
import { RefreshCw } from 'lucide-react';

const RefreshButton = ({ onClick, loading = false, label = 'Refresh', className = '', disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111917] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[#16211e] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    {loading ? 'Refreshing' : label}
  </button>
);

export default RefreshButton;
