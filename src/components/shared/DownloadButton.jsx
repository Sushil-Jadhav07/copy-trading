import React from 'react';
import { Download } from 'lucide-react';

const DownloadButton = ({ onClick, loading = false, disabled = false, label = 'Download' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="inline-flex items-center gap-2 rounded-full border border-[#00C896]/20 bg-[#00C896] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-white/5 dark:text-foreground dark:hover:bg-white/10 dark:hover:opacity-100"
  >
    <Download className={`h-3.5 w-3.5 ${loading ? 'animate-pulse' : ''}`} />
    <span>{loading ? 'Preparing' : label}</span>
  </button>
);

export default DownloadButton;
