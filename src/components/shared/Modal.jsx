import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const { isDark } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className={`relative w-full max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] ${sizeClasses[size]} rounded-2xl overflow-hidden`}
            style={isDark ? {
              background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(0,200,150,0.04) 50%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              border: '1px solid rgba(0,200,150,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
            } : {
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(32px) saturate(150%)',
              WebkitBackdropFilter: 'blur(32px) saturate(150%)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset',
            }}
          >
            {/* Top shine */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(0,200,150,0.4), rgba(255,255,255,0.2), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,200,150,0.2), rgba(255,255,255,0.8), transparent)',
            }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/5 dark:border-white/5">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
