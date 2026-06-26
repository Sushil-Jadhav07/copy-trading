import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import AppErrorBoundary from '@/components/shared/AppErrorBoundary';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';
import { adminService } from '@/lib/admin';
import { engineService } from '@/lib/engine';
import { riskService } from '@/lib/risk';

const KillSwitchBanner = () => {
  const [halted, setHalted] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;
    const check = () => {
      adminService.getGlobalRiskSettings()
        .then((s) => {
          if (!active) return;
          setHalted(Boolean(s?.kill_switch_active));
          setReason(s?.kill_switch_reason || s?.reason || '');
        })
        .catch(() => {
          // Admin endpoint is restricted — try engine status, then risk status
          const applyHalt = (s) => {
            if (!active || !s) return;
            const isHalted = Boolean(
              s?.kill_switch_active || s?.killSwitchActive ||
              s?.halted || s?.isHalted ||
              s?.trading_halted || s?.tradingHalted
            );
            setHalted(isHalted);
            setReason(s?.kill_switch_reason || s?.killSwitchReason || s?.halt_reason || s?.haltReason || s?.reason || '');
          };

          engineService.getStatus()
            .then(applyHalt)
            .catch(() => {
              riskService.getStatus()
                .then(applyHalt)
                .catch(() => {});
            });
        });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (!halted) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3.5 mb-6">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/15">
        <ShieldAlert className="h-5 w-5 text-rose-500" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
          Trading Halted by Admin
        </p>
        {reason && (
          <p className="mt-0.5 text-xs text-rose-500/80 dark:text-rose-500 truncate">
            Reason: {reason}
          </p>
        )}
      </div>
      <div className="ml-auto flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-500 ring-1 ring-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          All copy orders paused
        </span>
      </div>
    </div>
  );
};

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
  const { isAuthenticated, loading, user, getEffectiveRole } = useAuth();
  const normalizedRole = String(getEffectiveRole() || '').toUpperCase();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { position, isVisible } = useCursorGlow(isDark);
  const isOverviewRoute = /\/overview$/.test(location.pathname);
  const showShellOverviewHeader = isOverviewRoute && normalizedRole !== 'ADMIN';

  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = connectChannel(
      'trades',
      (event, data) => {
        if (normalizedRole === 'MASTER') {
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

        if (normalizedRole === 'CHILD') {
          if (event === 'TRADE_COPIED' || event === 'copy_trade') {
            addToast(`New order placed in your account: ${data?.symbol} ${data?.side} x${data?.qty}`, 'success', 6000);
          }
          if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
            addToast(`Copy trade failed: ${data?.reason || 'Unknown error'}`, 'error', 7000);
          }
        }
      },
      null,
      null,
    );

    return () => sub.close();
  }, [isAuthenticated, normalizedRole, addToast]);

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
      <CursorGlow position={position} isVisible={isVisible && isDark} />
      <AppErrorBoundary>
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div
          className={`transition-all duration-300 ${
            isMobile ? 'ml-0' : sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
          }`}
        >
          <Header
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />

          <main className="p-4 pt-20 sm:p-6 sm:pt-20" style={{ paddingTop: typeof window !== 'undefined' && localStorage.getItem('Ascentra Capital_impersonation') ? 'calc(5rem + 28px)' : undefined }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <KillSwitchBanner />
              {showShellOverviewHeader && (
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-foreground tracking-tight uppercase">
                      {normalizedRole === 'ADMIN' ? 'Admin Dashboard' : normalizedRole === 'MASTER' ? 'Master Hub' : 'Portfolio Overview'}
                    </h1>
                    <p className="text-slate-400 dark:text-muted-foreground font-medium mt-1">
                      Welcome back, <span className="text-brand-purple font-bold">{user?.name?.split(' ')[0] || 'Trader'}</span>! Here&apos;s your performance summary.
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
          </main>
        </div>
      </AppErrorBoundary>
    </div>
  );
};

export default Dashboard;
