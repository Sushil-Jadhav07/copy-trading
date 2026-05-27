import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, authStorage } from '@/lib/auth';
import { brokerService } from '@/lib/broker';
import { disconnectAll } from '@/lib/websocket';

const AuthContext = createContext(null);
const normalizeRole = (value) => String(value || '').trim().toUpperCase();

const FALLBACK_AUTH_CONTEXT = {
  user: null,
  isAuthenticated: false,
  loading: false,
  login: async () => ({ success: false, error: 'Auth provider unavailable' }),
  register: async () => ({ success: false, error: 'Auth provider unavailable' }),
  logout: async () => {},
  switchRole: () => {},
  getEffectiveRole: () => null,
  refreshUser: async () => null,
  updateProfile: async () => null,
  changePassword: async () => null,
  verifyTwoFactor: async () => null,
  sendOtp: async () => ({ success: false, error: 'Auth provider unavailable' }),
  verifyOtp: async () => ({ success: false, error: 'Auth provider unavailable' }),
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || FALLBACK_AUTH_CONTEXT;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const currentUser = await authService.restoreSession();
        if (!isMounted) return;

        setUser(currentUser);
        setIsAuthenticated(Boolean(currentUser));
      } catch (error) {
        authService.clearSession();
        if (!isMounted) return;

        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password, role) => {
    try {
      const result = await authService.login({ email, password, role });

      if (result.requires2FA) {
        setIsAuthenticated(false);
        return { success: false, requires2FA: true };
      }

      setUser(result.user);
      setIsAuthenticated(true);
      brokerService.getAccounts()
        .then((accounts) => {
          setUser((prev) => (prev ? { ...prev, brokerAccounts: accounts } : prev));
        })
        .catch(() => {});
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword, role, phone = '') => {
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (
      password.length < 8 ||
      !/[0-9]/.test(password) ||
      !/[^a-zA-Z0-9]/.test(password)
    ) {
      return { success: false, error: 'Password must be at least 8 characters and include a number and special character.' };
    }

    try {
      await authService.register({
        name,
        email,
        password,
        role,
        phone,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      disconnectAll();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const switchRole = useCallback((newRole) => {
    if (user && normalizeRole(user.role) === 'ADMIN') {
      const updatedUser = { ...user, impersonatedRole: newRole };
      setUser(updatedUser);
      authStorage.setImpersonatedRole(newRole);
    }
  }, [user]);

  const getEffectiveRole = useCallback(() => {
    if (!user) return null;
    return normalizeRole(user.impersonatedRole || authStorage.getImpersonatedRole() || user.role);
  }, [user]);

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.getMe();
    setUser(currentUser);
    setIsAuthenticated(true);
    return currentUser;
  }, []);

  const updateProfile = useCallback(async (profile) => {
    const updatedUser = await authService.updateMe(profile);
    const nextUser = {
      ...updatedUser,
      impersonatedRole: user?.impersonatedRole,
    };

    setUser(nextUser);
    return nextUser;
  }, [user?.impersonatedRole]);

  const changePassword = useCallback(async ({ currentPassword, newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match');
    }

    return authService.changePassword({
      currentPassword,
      newPassword,
    });
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    const result = await authService.verifyTwoFactor(code);
    setUser(result.user);
    setIsAuthenticated(true);
    return result.user;
  }, []);

  const sendOtp = useCallback(async (phone) => {
    try {
      const res = await authService.sendOtp(phone);
      const data = res?.data || res;
      if (data?.success === false) {
        const retryAfter = data?.data?.retryAfter ?? null;
        return {
          success: false,
          error: data?.message || data?.error || 'Failed to send OTP',
          errorCode: data?.error || null,
          retryAfter,
        };
      }
      const retryAfter = data?.data?.retryAfter ?? null;
      const expiresIn = data?.data?.expiresIn ?? null;
      return { success: true, retryAfter, expiresIn };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const verifyOtp = useCallback(async (phone, otp) => {
    try {
      const result = await authService.verifyOtp(phone, otp);
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message, errorCode: error.errorCode || null };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    switchRole,
    getEffectiveRole,
    refreshUser,
    updateProfile,
    changePassword,
    verifyTwoFactor,
    sendOtp,
    verifyOtp,
  }), [
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    switchRole,
    getEffectiveRole,
    refreshUser,
    updateProfile,
    changePassword,
    verifyTwoFactor,
    sendOtp,
    verifyOtp,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
