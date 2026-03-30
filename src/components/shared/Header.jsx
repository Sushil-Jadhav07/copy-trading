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
import { notifications, masters } from '@/data/mockData';

const Header = ({ sidebarCollapsed, isMobile = false, onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout, getEffectiveRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(
    notifications.filter((notification) => !notification.read).length
  );
  const [localNotifications, setLocalNotifications] = useState(notifications);

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

  const markAllAsRead = () => {
    setLocalNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const markAsRead = (id) => {
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
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
                className="w-full min-w-0 sm:w-56 md:w-64 pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-purple/50 transition-colors"
              />
            </div>

            <AnimatePresence>
              {showSearchResults && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] sm:w-80 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
                >
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                        Masters
                      </p>
                      {searchResults.map((master) => (
                        <button
                          key={master.id}
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left text-foreground"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {master.initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{master.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {master.return30d}% return (30d)
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      No results found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-foreground"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative text-foreground"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-purple text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-[min(20rem,calc(100vw-1rem))] bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-purple hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {localNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`px-4 py-3 border-b border-border/50 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              !notification.read
                                ? 'bg-brand-purple'
                                : 'bg-transparent'
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 sm:gap-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-sm font-bold text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm ${getRoleColor(
                      effectiveRole
                    )}`}
                  >
                    {effectiveRole}
                  </span>
                </div>
              </div>
              <ChevronDown className="hidden sm:block w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
                >
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(
                        effectiveRole === 'Master'
                          ? '/master/profile'
                          : effectiveRole === 'Child'
                          ? '/child/profile'
                          : '/admin/profile'
                      );
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-foreground"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2 text-danger"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
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
