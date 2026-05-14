import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const CursorGlow = ({ position, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      className="cursor-glow"
      style={{
        left: position.x,
        top: position.y,
      }}
    />
  );
};

const Dashboard = () => {
  const { isAuthenticated, loading, user, role } = useAuth();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { sessionExpiredBrokers, dismissSessionExpired } = useNotifications();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { position, isVisible } = useCursorGlow(isDark);
  const isOverviewRoute = /\/overview$/.test(location.pathname);

  // ── Global WebSocket listener for order notifications ─────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = connectChannel(
      'trades',
      (event, data) => {
        // Master view: Notify when a trade is detected from their broker
        if (role === 'Master') {
          if (event === 'TRADE_DETECTED' || event === 'trade_detected') {
            addToast(`New order detected on Master: ${data?.symbol} ${data?.side} x${data?.qty}`, 'info', 5000);
          }
          if (event === 'TRADE_COPIED' || event === 'copy_trade') {
            addToast(`Successfully copied to follower: ${data?.symbol} ${data?.side}`, 'success', 5000);
          }
          if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
            addToast(`Copy failed: ${data?.reason || 'Unknown error'}`, 'error', 7000);
          }
        }

        // Child view: Notify when a trade is copied to their account
        if (role === 'Child') {
          if (event === 'TRADE_COPIED' || event === 'copy_trade') {
            addToast(`New order placed in your account: ${data?.symbol} ${data?.side} x${data?.qty}`, 'success', 6000);
          }
          if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
            addToast(`Copy trade failed: ${data?.reason || 'Unknown error'}`, 'error', 7000);
          }
        }
      },
      null,
      null
    );

    return () => sub.close();
  }, [isAuthenticated, role, addToast]);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cursor Glow Effect (Dark Mode Only) */}
      <CursorGlow position={position} isVisible={isVisible && isDark} />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isMobile ? 'ml-0' : sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        }`}
      >
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="p-4 pt-20 sm:p-6 sm:pt-20">
          {sessionExpiredBrokers.length > 0 && (
            <div className="space-y-2 mb-4">
              {sessionExpiredBrokers.map((item) => (
                <div
                  key={item.accountId}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/8 text-sm"
                >
                  <div className="flex items-center gap-2 text-rose-500">
                    <span className="font-bold text-[11px] uppercase tracking-wide">Session Expired</span>
                    <span className="text-foreground">
                      Your <strong>{item.broker}</strong> session has expired. Trades are not being copied.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate('/demat')}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                    >
                      Re-login
                    </button>
                    <button
                      onClick={() => dismissSessionExpired(item.accountId)}
                      className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card p-5 animate-pulse"
                  >
                    <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-24 mb-3" />
                    <div className="h-8 bg-black/10 dark:bg-white/10 rounded w-32" />
                  </div>
                ))}
              </div>
              <div className="glass-card p-5 animate-pulse h-80" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isOverviewRoute && (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-foreground tracking-tight uppercase">
                      {role === 'Admin' ? 'Admin Dashboard' : role === 'Master' ? 'Master Hub' : 'Portfolio Overview'}
                    </h1>
                    <p className="text-slate-500 dark:text-muted-foreground font-medium mt-1">
                      Welcome back, <span className="text-brand-purple font-bold">{user?.name?.split(' ')[0] || 'Trader'}</span>! Here's your performance summary.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col text-right">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-widest">Market Status</p>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Live</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
