import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';

const Header = ({ sidebarCollapsed, isMobile = false, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout, getEffectiveRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  } = useNotifications();

  const masters = [];
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setShowUserMenu(false);
      navigate('/login', { replace: true });
    }
  };

  const onMarkAllRead = async () => {
    await markAllAsRead();
    refetch();
  };

  const onMarkRead = async (id) => {
    await markAsRead(id);
  };

  const searchResults = searchQuery
    ? masters.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.markets.some((market) =>
            market.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : [];

  const effectiveRole = getEffectiveRole();

  const getRoleColor = (role) => {
    switch (role) {
      case 'Master':
        return 'bg-brand-purple';
      case 'Child':
        return 'bg-brand-blue';
      case 'Admin':
        return 'bg-brand-teal';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 glass-header z-30 transition-all duration-300 ${
        isMobile ? 'left-0' : sidebarCollapsed ? 'md:left-[72px]' : 'md:left-[260px]'
      }`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Breadcrumb & Search */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground flex-shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:flex-none" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search masters, instruments..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(e.target.value.length > 0);
                }}
                className="w-full min-w-0 sm:w-56 md:w-64 pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:bg-white dark:focus:bg-white/10 transition-all"
              />
            </div>

            <AnimatePresence>
              {showSearchResults && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] sm:w-80 bg-white dark:bg-popover border border-slate-200 dark:border-border rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden z-50"
                >
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      <p className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-widest">
                        Masters
                      </p>
                      {searchResults.map((master) => (
                        <button
                          key={master.id}
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left text-foreground"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-sm">
                            <span className="text-xs font-bold text-white uppercase">
                              {master.initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-foreground">{master.name}</p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                              {master.return30d}% return (30d)
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-500 dark:text-muted-foreground text-center">
                      No results found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-foreground"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors relative text-slate-600 dark:text-foreground"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-background" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-popover border border-slate-200 dark:border-border rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllRead}
                        className="text-xs font-bold text-brand-purple hover:underline uppercase tracking-wider"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative ${
                            !n.read ? 'bg-slate-50/50 dark:bg-white/2' : ''
                          }`}
                          onClick={() => onMarkRead(n.id)}
                        >
                          {!n.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-purple" />
                          )}
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                              <Bell className="w-5 h-5 text-brand-purple" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-foreground leading-tight">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-muted-foreground mt-1 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground mt-2 uppercase tracking-wider">
                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <Bell className="w-8 h-8 text-slate-300 dark:text-white/10" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-muted-foreground">No new notifications</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-white/10 group"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-md shadow-brand-purple/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold text-white uppercase relative z-10">
                  {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-foreground leading-none">{user?.name || 'User'}</p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground mt-1 uppercase tracking-wider">
                  {effectiveRole}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-popover border border-slate-200 dark:border-border rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden z-50 p-1.5"
                >
                  <div className="px-3 py-3 mb-1 border-b border-slate-50 dark:border-white/5 md:hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-foreground">{user?.name}</p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground mt-0.5 uppercase tracking-wider">{effectiveRole}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(`/${effectiveRole.toLowerCase()}/profile`);
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left text-slate-700 dark:text-foreground group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-brand-purple/10 transition-colors">
                      <User className="w-4 h-4 text-slate-500 dark:text-muted-foreground group-hover:text-brand-purple transition-colors" />
                    </div>
                    <span className="text-sm font-semibold">My Profile</span>
                  </button>
                  <div className="h-px bg-slate-50 dark:bg-white/5 my-1.5 mx-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left text-rose-600 dark:text-rose-400 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wide">Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
