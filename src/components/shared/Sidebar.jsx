import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  TrendingUp,
  Activity,
  BookOpen,
  Briefcase,
  BarChart2,
  Shield,
  Star,
  Bell,
  Users,
  UserPlus,
  DollarSign,
  Clock,
  ArrowLeftRight,
  PieChart,
  Target,
  Zap,
  Key,
  Settings,
  HelpCircle,
  Search,
  Trophy,
  Wallet,
  PlusCircle,
  ArrowUpCircle,
  Copy,
  Sliders,
  UserCheck,
  Server,
  List,
  Eye,
  FileText,
  Globe,
  Heart,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutGrid,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
const whitelogo = '/asset/whitelogo.png';
const singlelogo = '/asset/singlelogo.png';
const logomain = '/asset/logomain.png';
const logo = '/asset/logo.png';

const SidebarItem = ({ to, icon: Icon, label, collapsed, badge }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => collapsed && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${
            isActive
              ? 'bg-gradient-to-r from-brand-purple/20 to-brand-blue/10 text-brand-purple dark:text-white border border-brand-purple/30 shadow-[0_0_12px_rgba(0,200,150,0.15)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:border hover:border-black/5 dark:hover:border-white/5 border border-transparent'
          }`
        }
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
        {!collapsed && badge && (
          <span className="ml-auto bg-brand-purple text-white text-xs px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </NavLink>

      <AnimatePresence>
        {collapsed && showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-popover border border-border rounded-lg text-sm whitespace-nowrap z-50 shadow-lg"
          >
            {label}
            {badge && (
              <span className="ml-2 bg-brand-purple text-white text-xs px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarSection = ({ title, children, collapsed }) => {
  if (collapsed) return <div className="space-y-1">{children}</div>;

  return (
    <div className="space-y-1">
<h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary/60 dark:text-primary/50">              {title}
      </h3>
      {children}
    </div>
  );
};

const Sidebar = ({ collapsed, setCollapsed, isMobile = false, isOpen = false, onClose }) => {
  const { getEffectiveRole, logout } = useAuth();
  const { isDark } = useTheme();
  const role = getEffectiveRole();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/login';
    }
  };

const masterSidebarItems = [
    {
      section: 'Main',
      items: [{ to: '/master/overview', icon: Home, label: 'Overview' }],
    },
    {
      section: 'Account Management',
      items: [
        { to: '/master/user-management', icon: LayoutGrid, label: 'Demat Accounts' },
        { to: '/master/copy-trading', icon: Copy, label: 'Copy Trading' },
        { to: '/master/logs', icon: FileText, label: 'Logs' },
      ],
    },
    {
      section: 'Trading',
      items: [
        { to: '/master/trades', icon: TrendingUp, label: 'My Trades' },
        { to: '/master/positions', icon: Activity, label: 'Open Positions' },
        { to: '/master/orders', icon: BookOpen, label: 'Order Book' },
        { to: '/master/trade-execution', icon: Zap, label: 'Trade Execution' },
      ],
    },
    {
      section: 'Portfolio',
      items: [
        { to: '/master/holdings', icon: Briefcase, label: 'Holdings' },
        { to: '/master/pnl', icon: BarChart2, label: 'P&L Summary' },
      ],
    },
    {
      section: 'Child Accounts',
      items: [
        { to: '/master/followers', icon: Users, label: 'Child Accounts' },
        { to: '/master/earnings', icon: DollarSign, label: 'Earnings' },
      ],
    },
  ];

const childSidebarItems = [
    {
      section: 'Main',
      items: [{ to: '/child/overview', icon: Home, label: 'Overview' }],
    },
    {
      section: 'Account Management',
      items: [
        { to: '/child/user-management', icon: LayoutGrid, label: 'Demat Accounts' },
      ],
    },
    {
      section: 'Copy Trading',
      items: [
        { to: '/child/my-masters', icon: Users, label: 'My Masters' },
        { to: '/child/copied-trades', icon: Copy, label: 'Copied Trades' },
        { to: '/child/trade-execution', icon: Zap, label: 'Place Order' },
        { to: '/child/pnl-dashboard', icon: BarChart2, label: 'P&L Dashboard' },
      ],
    },
    {
      section: 'Discover',
      items: [
        { to: '/child/find-masters', icon: Search, label: 'Find Masters' },
      ],
    },
    {
      section: 'Portfolio',
      items: [
        { to: '/child/holdings', icon: Briefcase, label: 'My Holdings' },
        { to: '/child/unrealized-pnl', icon: TrendingUp, label: 'Unrealised P&L' },
      ],
    },
  ];

  const adminSidebarItems = [
    {
      section: 'Main',
      items: [{ to: '/admin/overview', icon: Home, label: 'Overview' }],
    },
    {
      section: 'Users',
      items: [
        { to: '/admin/users', icon: Users, label: 'All Users' },
        { to: '/admin/masters', icon: TrendingUp, label: 'Masters' },
        { to: '/admin/children', icon: UserCheck, label: 'Children' },
        { to: '/admin/verification', icon: UserPlus, label: 'Pending Verification', badge: '2' },
      ],
    },
    {
      section: 'Trade Monitor',
      items: [
        { to: '/admin/live-trades', icon: Activity, label: 'Live Trades' },
        { to: '/admin/order-feed', icon: List, label: 'Order Feed' },
        { to: '/admin/broker-status', icon: Server, label: 'Broker Status' },
        { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
        { to: '/admin/system-logs', icon: FileText, label: 'System Logs' },
      ],
    },
  ];

  const sidebarItems =
    role === 'Master' ? masterSidebarItems :
    role === 'Child' ? childSidebarItems :
    role === 'Admin' ? adminSidebarItems :
    masterSidebarItems;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-border/50 relative ${collapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed && !isMobile ? 'justify-center' : ''}`}>
          <div className={`${collapsed && !isMobile ? 'w-16 h-16' : 'w-40 h-12'} flex-shrink-0 transition-all duration-300`}>
            <img 
              src={collapsed && !isMobile
                ? (isDark ? singlelogo : logo)
                : (isDark ? whitelogo  : logomain)
              }
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${collapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2 bg-brand-purple text-white shadow-lg z-50 rounded-full w-6 h-6 items-center justify-center' : ''}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 scrollbar-hide">
        {sidebarItems.map((section, idx) => (
          <SidebarSection
            key={idx}
            title={section.section}
            collapsed={collapsed && !isMobile}
          >
            {section.items.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !isMobile}
                badge={item.badge}
              />
            ))}
          </SidebarSection>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-4">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-danger hover:bg-danger/10 dark:hover:bg-danger/10 transition-all duration-300 group ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed left-0 top-0 h-screen w-72 max-w-[85vw] glass-sidebar z-50 flex flex-col"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen glass-sidebar z-40 hidden md:flex flex-col"
    >
      {sidebarContent}
    </motion.aside>
  );
};

export default Sidebar;
