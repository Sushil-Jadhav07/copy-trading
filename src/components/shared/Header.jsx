import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Bell, Sun, Moon, LogOut, ChevronDown, User,
  AlertTriangle, X, Clock, Users, Wifi, CheckCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';

const NOTIF_META = {
  SESSION_EXPIRED:     { icon: AlertTriangle, iconCls: 'text-rose-500',    bgCls: 'bg-rose-500/12',    borderCls: 'border-l-rose-500' },
  SESSION_REMINDER:    { icon: Clock,         iconCls: 'text-amber-500',   bgCls: 'bg-amber-500/12',   borderCls: 'border-l-amber-500' },
  SUBSCRIPTION_REQUEST:{ icon: Users,         iconCls: 'text-emerald-500', bgCls: 'bg-emerald-500/12', borderCls: 'border-l-emerald-500' },
  DEFAULT:             { icon: Bell,          iconCls: 'text-brand-purple',bgCls: 'bg-brand-purple/12',borderCls: 'border-l-brand-purple' },
};
const getMeta = (type) => NOTIF_META[String(type || '').toUpperCase()] || NOTIF_META.DEFAULT;

const Header = ({ sidebarCollapsed, isMobile = false, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout, getEffectiveRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch, sessionExpiredBrokers, dismissSessionExpired } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const effectiveRole = getEffectiveRole();
  const sideOffset = isMobile ? 'left-0' : sidebarCollapsed ? 'md:left-[72px]' : 'md:left-[260px]';
  const bannerHeight = sessionExpiredBrokers.length * 48;

  useEffect(() => {
    const h = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } finally { setShowUserMenu(false); navigate('/login', { replace: true }); }
  };

  const dropdownStyle = isDark ? {
    background: 'rgba(5,18,12,0.97)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0,200,150,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  } : {
    background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
  };

  return (
    <>
      <div className={`fixed top-0 right-0 z-50 ${sideOffset}`}>
        <AnimatePresence>
          {sessionExpiredBrokers.map((item, i) => (
            <motion.div
              key={item.accountId}
              initial={{ opacity: 0, y: -48 }}
              animate={{ opacity: 1, y: i * 48 }}
              exit={{ opacity: 0, y: -48 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative overflow-hidden flex items-center justify-between gap-3 px-4 py-2.5 h-12"
              style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)', boxShadow: '0 4px 20px rgba(220,38,38,0.35)' }}
            >
              {/* shimmer overlay */}
              <motion.div
                className="absolute inset-0 opacity-25"
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }}
              />
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-6 h-6 rounded-md bg-white/25 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">
                  <strong>{item.broker}</strong> session expired - trades paused
                </span>
              </div>
              <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
                <button
                  onClick={() => navigate(`/${effectiveRole.toLowerCase()}/user-management`)}
                  className="px-3 py-1 bg-white text-rose-600 rounded-lg text-[11px] font-black hover:bg-rose-50 transition-colors"
                >
                  Re-connect {'->'}
                </button>
                <button onClick={() => dismissSessionExpired(item.accountId)} className="p-1 rounded hover:bg-white/20 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header
        className={`fixed right-0 h-16 glass-header z-30 transition-all duration-300 ${sideOffset}`}
        style={{ top: bannerHeight }}
      >
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isMobile && (
              <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground flex-shrink-0" aria-label="Open navigation">
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Theme */}
            <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-foreground">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Bell */}
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications((p) => !p)} className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors relative text-slate-600 dark:text-foreground">
                <Bell className="w-5 h-5" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-background"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl overflow-hidden z-50"
                    style={dropdownStyle}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-white/6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 dark:text-foreground">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500/12 text-rose-500 text-[10px] font-black rounded-full">{unreadCount} new</span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => { await markAllAsRead(); refetch(); }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-brand-purple/10 text-brand-purple rounded-lg text-[10px] font-bold hover:bg-brand-purple/20 transition-colors"
                        >
                          <CheckCheck className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>

                    {/* Items */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide divide-y divide-slate-50 dark:divide-white/4">
                      {notifications.length > 0 ? notifications.map((n) => {
                        const meta = getMeta(n.type);
                        const Icon = meta.icon;
                        return (
                          <motion.div
                            key={n.id}
                            whileHover={{ x: 2 }}
                            className={`relative border-l-[3px] ${meta.borderCls} p-4 cursor-pointer transition-transform transition-colors hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-white/4`}
                            onClick={() => markAsRead(n.id)}
                          >
                            {!n.read && <span className={`absolute top-4 right-4 h-1.5 w-1.5 rounded-full ${meta.iconCls.replace('text-', 'bg-')}`} />}
                            <div className="flex gap-3">
                              <div className={`w-9 h-9 rounded-xl ${meta.bgCls} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${meta.iconCls}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-foreground leading-tight">{n.title}</p>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                {String(n.type || '').toUpperCase() === 'SESSION_EXPIRED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowNotifications(false); navigate(`/${effectiveRole.toLowerCase()}/user-management`); }}
                                    className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/12 text-rose-500 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-colors"
                                  >
                                    <Wifi className="w-3 h-3" /> Re-connect Broker
                                  </button>
                                )}
                                <p className="text-[10px] text-slate-400 dark:text-muted-foreground/70 mt-1.5">
                                  {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }) : (
                        <div className="py-14 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/6 flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-7 h-7 text-slate-300 dark:text-white/15" />
                          </div>
                          <p className="text-sm font-semibold text-slate-600 dark:text-foreground/70">You're all caught up</p>
                          <p className="text-xs text-slate-400 dark:text-muted-foreground/60 mt-0.5">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((p) => !p)}
                className="flex items-center gap-2 p-1 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-white/10 group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center relative overflow-hidden"
                  style={{ boxShadow: '0 4px 14px rgba(0,200,150,0.3)' }}>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs font-bold text-white uppercase relative z-10">
                    {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-foreground leading-none">{user?.name || 'User'}</p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground mt-1 uppercase tracking-wider">{effectiveRole}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute top-full right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50 p-1.5"
                    style={dropdownStyle}
                  >
                    <div className="px-3 py-3 mb-1 border-b border-slate-50 dark:border-white/5 md:hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-foreground">{user?.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-muted-foreground mt-0.5 uppercase tracking-wider">{effectiveRole}</p>
                    </div>
                    <button onClick={() => { setShowUserMenu(false); navigate(`/${effectiveRole.toLowerCase()}/profile`); }}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left group">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-brand-purple/10 transition-colors">
                        <User className="w-4 h-4 text-slate-500 group-hover:text-brand-purple transition-colors" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-foreground">My Profile</span>
                    </button>
                    <div className="h-px bg-slate-50 dark:bg-white/5 my-1.5 mx-2" />
                    <button onClick={handleLogout}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left group">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                        <LogOut className="w-4 h-4 text-rose-500" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
