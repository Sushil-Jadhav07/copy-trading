import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, authStorage } from '@/lib/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword, role, phone = '') => {
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
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
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const switchRole = useCallback((newRole) => {
    if (user && user.role === 'Admin') {
      const updatedUser = { ...user, impersonatedRole: newRole };
      setUser(updatedUser);
      authStorage.setImpersonatedRole(newRole);
    }
  }, [user]);

  const getEffectiveRole = useCallback(() => {
    if (!user) return null;
    return user.impersonatedRole || authStorage.getImpersonatedRole() || user.role;
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
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
