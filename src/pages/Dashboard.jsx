import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { position, isVisible } = useCursorGlow(isDark);

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
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
