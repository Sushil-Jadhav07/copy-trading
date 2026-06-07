import React from 'react';
import { Download } from 'lucide-react';

const DownloadButton = ({ onClick, loading = false, disabled = false, label = 'Download' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111917] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-white/20 hover:bg-[#17221f] disabled:cursor-not-allowed disabled:opacity-60"
  >
    <Download className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} />
    <span>{loading ? 'Preparing' : label}</span>
  </button>
);

export default DownloadButton;
