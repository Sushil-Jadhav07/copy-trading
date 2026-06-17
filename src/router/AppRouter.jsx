import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/shared/Toast';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import DematConnected from '@/pages/DematConnected';

import MasterOverview from '@/components/master/Overview';
import OpenPositions from '@/components/master/OpenPositions';
import OrderBook from '@/components/master/OrderBook';
import PnLSummary from '@/components/master/PnLSummary';
import ActiveFollowers from '@/components/master/ActiveFollowers';
import MasterProfile from '@/components/master/Profile';
import UserManagement from '@/components/master/UserManagement';
import DematDetail from '@/components/master/DematDetail';
import CopyTrading from '@/components/master/CopyTrading';
import Logs from '@/components/master/Logs';
import PnLAnalytics from '@/components/master/PnLAnalytics';
import MasterOptionsStatus from '@/components/master/OptionsStatus';
import LatencyHistory from '@/components/master/LatencyHistory';

import MyMasters from '@/components/child/MyMasters';
import CopiedTrades from '@/components/child/CopiedTrades';
import ChildOverview from '@/components/child/Overview';
import FindMasters from '@/components/child/FindMasters';
import PnLDashboard from '@/components/child/PnLDashboard';
import ChildOptionsStatus from '@/components/child/OptionsStatus';
import ChildOpenPositions from '@/components/child/OpenPositions';
import ChildOrderBook from '@/components/child/OrderBook';
import RiskSettings from '@/components/child/RiskSettings';
import ChildTradeTimeline from '@/components/child/TradeTimeline';
import ChildProfile from '@/components/child/Profile';

import AdminOverview from '@/components/admin/Overview';
import MasterChildMap from '@/components/admin/MasterChildMap';
import AllUsers from '@/components/admin/AllUsers';
import ChildAccounts from '@/components/admin/ChildAccounts';
import MasterAccounts from '@/components/admin/MasterAccounts';
import PendingVerification from '@/components/admin/PendingVerification';
import SystemLogs from '@/components/admin/SystemLogs';
import LiveTrades from '@/components/admin/LiveTrades';
import OrderFeed from '@/components/admin/OrderFeed';
import AdminPnL from '@/components/admin/AdminPnL';
import AdminProfile from '@/components/admin/Profile';
import TradeHistory from '@/components/admin/TradeHistory';

const DematDetailWrapper = () => {
  const { accountId } = useParams();
  const navigate = React.useCallback(() => window.history.back(), []);
  return <DematDetail accountId={accountId} onBack={navigate} scope="master" />;
};

const ChildDematDetailWrapper = () => {
  const { accountId } = useParams();
  const navigate = React.useCallback(() => window.history.back(), []);
  return <DematDetail accountId={accountId} onBack={navigate} scope="child" />;
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, getEffectiveRole, loading } = useAuth();
  const effectiveRole = getEffectiveRole();

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

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const RoleRedirect = () => {
  const { getEffectiveRole } = useAuth();
  const role = String(getEffectiveRole() || '').toUpperCase();

  if (role === 'MASTER') return <Navigate to="/master/overview" replace />;
  if (role === 'CHILD') return <Navigate to="/child/overview" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin/overview" replace />;
  return <Navigate to="/login" replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/platform/dematconnected" element={<DematConnected />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RoleRedirect />} />

                <Route path="master/overview" element={<MasterOverview />} />
                <Route path="master/positions" element={<OpenPositions />} />
                <Route path="master/orders" element={<OrderBook />} />
                <Route path="master/pnl" element={<PnLSummary />} />
                <Route path="master/followers" element={<ActiveFollowers />} />
                <Route path="master/profile" element={<MasterProfile />} />
                <Route path="master/user-management" element={<UserManagement />} />
                <Route path="master/demat/:accountId" element={<DematDetailWrapper />} />
                <Route path="master/copy-trading" element={<CopyTrading />} />
                <Route path="master/latency-history" element={<LatencyHistory />} />
                <Route path="master/logs" element={<Logs />} />
                <Route path="master/pnl-analytics" element={<PnLAnalytics />} />
                <Route path="master/options-status" element={<MasterOptionsStatus />} />

                <Route path="child/overview" element={<ChildOverview />} />
                <Route path="child/user-management" element={<Navigate to="/child/overview" replace />} />
                <Route path="child/demat/:accountId" element={<ChildDematDetailWrapper />} />
                <Route path="child/find-masters" element={<FindMasters />} />
                <Route path="child/my-masters" element={<MyMasters />} />
                <Route path="child/positions" element={<ChildOpenPositions />} />
                <Route path="child/orders" element={<ChildOrderBook />} />
                <Route path="child/copied-trades" element={<CopiedTrades />} />
                <Route path="child/trade-timeline" element={<ChildTradeTimeline />} />
                <Route path="child/options-status" element={<ChildOptionsStatus />} />
                <Route path="child/risk-settings" element={<RiskSettings />} />
                <Route path="child/profile" element={<ChildProfile />} />
                <Route path="child/pnl-dashboard" element={<PnLDashboard />} />

                <Route path="admin/overview" element={<AdminOverview />} />
                <Route path="admin/users" element={<AllUsers scope="all" />} />
                <Route path="admin/masters" element={<AllUsers scope="masters" />} />
                <Route path="admin/children" element={<AllUsers scope="children" />} />
                <Route path="admin/child-accounts" element={<ChildAccounts />} />
                <Route path="admin/master-accounts" element={<MasterAccounts />} />
                <Route path="admin/verification" element={<PendingVerification />} />
                <Route path="admin/profile" element={<AdminProfile />} />
                <Route path="admin/live-trades" element={<LiveTrades />} />
                <Route path="admin/order-feed" element={<OrderFeed />} />
                <Route path="admin/master-child-map" element={<MasterChildMap />} />
                <Route path="admin/system-logs" element={<SystemLogs />} />
                <Route path="admin/pnl" element={<AdminPnL />} />
                <Route path="admin/trade-history" element={<TradeHistory />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
