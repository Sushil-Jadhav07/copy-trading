import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  TrendingUp,
  Activity,
  BookOpen,
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
  Link2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePendingFollowCount } from '@/hooks/useMaster';
import { useTheme } from '@/context/ThemeContext';
import { adminService } from '@/lib/admin';
const whitelogo = '/asset/whitelogo.png';
const singlelogo = '/asset/singlelogo.png';
const logomain = '/asset/logomain.png';

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
          `flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
            isActive
              ? 'bg-brand-purple/10 text-brand-purple dark:text-white border border-brand-purple/20 shadow-lg shadow-brand-purple/5'
              : 'text-slate-500 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-foreground border border-transparent'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-brand-purple' : ''}`} />
            {!collapsed && (
              <span className="text-sm font-bold tracking-tight truncate">{label}</span>
            )}
            {!collapsed && badge && (
              <span className="ml-auto bg-brand-purple text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md shadow-brand-purple/20 uppercase tracking-tighter">
                {badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="active-indicator"
                className="absolute left-0 top-3 bottom-3 w-1 bg-brand-purple rounded-r-full"
              />
            )}
          </>
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
  if (collapsed) return <div className="space-y-2">{children}</div>;

  return (
    <div className="space-y-2">
      <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-muted-foreground/60">{title}</h3>
      <div className="space-y-1.5 px-1">{children}</div>
    </div>
  );
};

const Sidebar = ({ collapsed, setCollapsed, isMobile = false, isOpen = false, onClose }) => {
  const { getEffectiveRole, logout } = useAuth();
  const { isDark } = useTheme();
  const role = getEffectiveRole();
  const pendingFollowCount = usePendingFollowCount();
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const normalizedRole = String(role || '').toUpperCase();
  const pendingFollowCountBadge =
    normalizedRole === 'MASTER' && pendingFollowCount > 0 ? String(pendingFollowCount) : undefined;
  const pendingVerificationBadge =
    normalizedRole === 'ADMIN' && pendingVerificationCount > 0 ? String(pendingVerificationCount) : undefined;

  useEffect(() => {
    if (role !== 'Admin') {
      setPendingVerificationCount(0);
      return undefined;
    }

    let active = true;

    const fetchPendingCount = async () => {
      try {
        const response = await adminService.getUsers({ status: 'PENDING' });
        if (active) {
          setPendingVerificationCount(response.meta?.total ?? response.users.length);
        }
      } catch {
        if (active) {
          setPendingVerificationCount(0);
        }
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [role]);

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
        { to: '/master/latency-history', icon: Clock, label: 'Latency & History' },
        { to: '/master/logs', icon: FileText, label: 'Logs' },
        { to: '/master/pnl-analytics', icon: TrendingUp, label: 'P&L Analytics' },
      ],
    },
    {
      section: 'Trading',
      items: [
        { to: '/master/positions', icon: Activity, label: 'Open Positions' },
        { to: '/master/orders', icon: BookOpen, label: 'Order Book' },
        { to: '/master/options-status', icon: Target, label: 'Options Status' },
      ],
    },
    {
      section: 'Child Accounts',
      items: [
        { to: '/master/followers', icon: Users, label: 'Followers' },
        { to: '/master/follow-requests', icon: UserPlus, label: 'Follow Requests', badge: pendingFollowCountBadge },
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
        { to: '/child/positions', icon: Activity, label: 'Open Positions' },
        { to: '/child/orders', icon: BookOpen, label: 'Order Book' },
        { to: '/child/copied-trades', icon: Copy, label: 'Copied Trades' },
        { to: '/child/trade-timeline', icon: Clock, label: 'Trade Timeline' },
        { to: '/child/options-status', icon: Target, label: 'Options Status' },
        { to: '/child/risk-settings', icon: Shield, label: 'Risk Settings' },
        { to: '/child/pnl-dashboard', icon: BarChart2, label: 'P&L Dashboard' },
      ],
    },
    {
      section: 'Discover',
      items: [
        { to: '/child/find-masters', icon: Search, label: 'Find Masters' },
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
        { to: '/admin/verification', icon: UserPlus, label: 'Pending Verification', badge: pendingVerificationBadge },
      ],
    },
    {
      section: 'Trade Monitor',
      items: [
        { to: '/admin/order-feed', icon: List, label: 'Order Feed' },
        { to: '/admin/broker-status', icon: Server, label: 'Broker Status' },
        { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
        { to: '/admin/master-child-map', icon: Link2, label: 'Master-Child Map' },
        { to: '/admin/system-logs', icon: FileText, label: 'System Logs' },
        { to: '/admin/pnl', icon: DollarSign, label: 'Platform P&L' },
      ],
    },
  ];

  const sidebarItems =
    normalizedRole === 'MASTER' ? masterSidebarItems :
    normalizedRole === 'CHILD' ? childSidebarItems :
    normalizedRole === 'ADMIN' ? adminSidebarItems :
    masterSidebarItems;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`h-20 flex items-center border-b border-slate-100/50 dark:border-white/5 relative transition-all duration-300 ${collapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-6'}`}>
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed && !isMobile ? 'justify-center' : ''}`}>
          <div className={`${collapsed && !isMobile ? 'w-14 h-14 flex items-center justify-center' : 'w-40 h-12'} flex-shrink-0 transition-all duration-500`}>
            {collapsed && !isMobile ? (
              <img src={singlelogo} alt="Logo" className="w-12 h-12 object-contain" />
            ) : (
              <img 
                src={isDark ? whitelogo : logomain}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all group ${collapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2 bg-brand-purple text-white shadow-xl z-50 rounded-full w-7 h-7 items-center justify-center scale-110 hover:scale-125' : 'text-slate-400 dark:text-muted-foreground'}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-hide">
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
      <div className="p-4 mt-auto">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 group ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <LogOut className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 group-hover:-translate-x-0.5 ${collapsed && !isMobile ? '' : ''}`} />
          {(!collapsed || isMobile) && (
            <span className="text-sm font-bold uppercase tracking-wider">Sign Out</span>
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
