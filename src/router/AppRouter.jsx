import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/shared/Toast';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';

// Master Components
import MasterOverview from '@/components/master/Overview';
import MyTrades from '@/components/master/MyTrades';
import OpenPositions from '@/components/master/OpenPositions';
import OrderBook from '@/components/master/OrderBook';
import Holdings from '@/components/master/Holdings';
import PnLSummary from '@/components/master/PnLSummary';
import ActiveFollowers from '@/components/master/ActiveFollowers';
import Earnings from '@/components/master/Earnings';
import Profile from '@/components/master/Profile';

// ── NEW MASTER COMPONENTS ──────────────────────────────────
import UserManagement from '@/components/master/UserManagement';
import TradeExecution from '@/components/master/TradeExecution';

import DematDetail from '@/components/master/DematDetail';
import CopyTrading from '@/components/master/CopyTrading';
import Logs from '@/components/master/Logs';
// ──────────────────────────────────────────────────────────

// Child Components
import MyMasters from '@/components/child/MyMasters';
import CopiedTrades from '@/components/child/CopiedTrades';
import ChildOverview from '@/components/child/Overview';
import FindMasters from '@/components/child/FindMasters';
import ChildTradeExecution from '@/components/child/TradeExecution';
import PnLDashboard from '@/components/child/PnLDashboard';



// Admin Components
import AdminOverview from '@/components/admin/Overview';
import BrokerStatus from '@/components/admin/BrokerStatus';
import Subscriptions from '@/components/admin/Subscriptions';
import AllUsers from '@/components/admin/AllUsers';
import PendingVerification from '@/components/admin/PendingVerification';
import SystemLogs from '@/components/admin/SystemLogs';
import LiveTrades from '@/components/admin/LiveTrades';
import OrderFeed from '@/components/admin/OrderFeed';


// ── DematDetail wrapper: reads accountId from URL params ──
import { useParams } from 'react-router-dom';
const DematDetailWrapper = () => {
  const { accountId } = useParams();
  const navigate = React.useCallback(() => window.history.back(), []);
  return <DematDetail accountId={accountId} onBack={navigate} />;
};
// ──────────────────────────────────────────────────────────

// Protected Route Component
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

// Role-based redirect
const RoleRedirect = () => {
  const { getEffectiveRole } = useAuth();
  const role = getEffectiveRole();

  if (role === 'Master') return <Navigate to="/master/overview" replace />;
  if (role === 'Child') return <Navigate to="/child/overview" replace />;
  if (role === 'Admin') return <Navigate to="/admin/overview" replace />;
  return <Navigate to="/login" replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RoleRedirect />} />

                {/* Master Routes */}
                <Route path="master/overview" element={<MasterOverview />} />
                <Route path="master/trades" element={<MyTrades />} />
                <Route path="master/positions" element={<OpenPositions />} />
                <Route path="master/orders" element={<OrderBook />} />
                <Route path="master/holdings" element={<Holdings />} />
                <Route path="master/pnl" element={<PnLSummary />} />
                <Route path="master/followers" element={<ActiveFollowers />} />
                <Route path="master/earnings" element={<Earnings />} />
                <Route path="master/profile" element={<Profile />} />


                {/* ── NEW MASTER ROUTES ── */}
                <Route path="master/user-management" element={<UserManagement />} />
                <Route path="master/demat/:accountId" element={<DematDetailWrapper />} />
                <Route path="master/copy-trading" element={<CopyTrading />} />
                <Route path="master/logs" element={<Logs />} />
                <Route path="master/trade-execution" element={<TradeExecution />} />
                {/* ───────────────────── */}

                {/* Child Routes */}
                <Route path="child/overview" element={<ChildOverview />} />
                <Route path="child/find-masters" element={<FindMasters />} />
                <Route path="child/holdings" element={<Holdings />} />
                <Route path="child/unrealized-pnl" element={<OpenPositions />} />
                <Route path="child/my-masters" element={<MyMasters />} />
                <Route path="child/copied-trades" element={<CopiedTrades />} />
                <Route path="child/profile" element={<Profile />} />
                <Route path="child/trade-execution" element={<ChildTradeExecution />} />
                <Route path="child/pnl-dashboard" element={<PnLDashboard />} />

                {/* Admin Routes */}
                <Route path="admin/overview" element={<AdminOverview />} />
                <Route path="admin/users" element={<AllUsers />} />
                <Route path="admin/masters" element={<AllUsers />} />
                <Route path="admin/children" element={<AllUsers />} />
                <Route path="admin/verification" element={<PendingVerification />} />
                <Route path="admin/profile" element={<Profile />} />
                <Route path="admin/live-trades" element={<LiveTrades />} />
                <Route path="admin/order-feed" element={<OrderFeed />} />
                <Route path="admin/broker-status" element={<BrokerStatus />} />
                <Route path="admin/subscriptions" element={<Subscriptions />} />
                <Route path="admin/system-logs" element={<SystemLogs />} />
                
              </Route>

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default AppRouter;
