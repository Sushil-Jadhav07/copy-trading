import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import Ticker from '@/components/shared/Ticker';
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
  const { isAuthenticated, loading } = useAuth();
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

        {/* Ticker */}
        <div className="pt-16">
          <Ticker />
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6">
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
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
