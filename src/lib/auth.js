import api, {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/api';

const ROLE_STORAGE_KEY = 'tradepilot_impersonated_role';

const pickRole = (rawRole) => {
  if (!rawRole) {
    return 'Child';
  }

  const normalized = String(rawRole).trim().toLowerCase();

  if (normalized === 'master' || normalized === 'provider') {
    return 'Master';
  }

  if (normalized === 'admin' || normalized === 'administrator') {
    return 'Admin';
  }

  return 'Child';
};

const normalizeUser = (payload = {}) => {
  const source = payload?.user || payload?.data?.user || payload?.data || payload;
  const firstName = source.firstName || source.first_name || '';
  const lastName = source.lastName || source.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const twoFactorEnabled =
    Boolean(source.twoFactorEnabled) ||
    Boolean(source.isTwoFactorEnabled) ||
    Boolean(source.two_factor_enabled);

  return {
    id: source.id || source._id || source.userId || null,
    userId: source.userId || source.id || source._id || null,
    name: source.name || source.fullName || fullName || source.username || 'User',
    email: source.email || '',
    phone: source.phone || source.mobile || '',
    role: pickRole(source.role || source.userType),
    status: source.status || '',
    createdAt: source.createdAt || source.created_at || null,
    brokerAccounts: Array.isArray(source.brokerAccounts) ? source.brokerAccounts : [],
    twoFactorEnabled,
    raw: source,
  };
};

const extractAccessToken = (payload = {}) =>
  payload?.accessToken ||
  payload?.token ||
  payload?.data?.accessToken ||
  payload?.data?.token ||
  payload?.tokens?.accessToken ||
  payload?.data?.tokens?.accessToken ||
  null;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const extractTwoFactorState = (payload = {}) => {
  const source = payload?.data || payload;
  const requires2FA = Boolean(source?.requires2FA || source?.requiresTwoFactor || source?.twoFactorRequired);

  return {
    requires2FA,
    challenge: {
      challengeToken:
        source?.challengeToken ||
        source?.twoFactorToken ||
        source?.verificationToken ||
        null,
      tempToken:
        source?.tempToken ||
        source?.tempAccessToken ||
        null,
    },
  };
};

export const authStorage = {
  getImpersonatedRole: () => localStorage.getItem(ROLE_STORAGE_KEY),
  setImpersonatedRole: (role) => {
    if (role) {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  },
  clearImpersonatedRole: () => {
    localStorage.removeItem(ROLE_STORAGE_KEY);
  },
};

export const authService = {
  async login({ email, password }) {
    try {
      const response = await api.post(
        '/api/v1/auth/login',
        {
          email,
          password,
        },
        {
          skipAuthRefresh: true,
        },
      );

      const token = extractAccessToken(response.data);
      const refreshToken =
        response.data?.refreshToken ||
        response.data?.data?.refreshToken ||
        response.data?.tokens?.refreshToken ||
        null;
      const twoFactorState = extractTwoFactorState(response.data);

      if (token) {
        setAccessToken(token);
      }
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      if (twoFactorState.requires2FA) {
        return {
          requires2FA: true,
        };
      }

      const user = response.data?.user
        ? normalizeUser(response.data)
        : await this.getMe();

      return {
        user,
      };
    } catch (error) {
      if (error.response?.status === 202) {
        const token = extractAccessToken(error.response?.data || {});
        const refreshToken =
          error.response?.data?.refreshToken ||
          error.response?.data?.data?.refreshToken ||
          error.response?.data?.tokens?.refreshToken ||
          null;

        if (token) {
          setAccessToken(token);
        }
        if (refreshToken) {
          setRefreshToken(refreshToken);
        }

        return {
          requires2FA: true,
        };
      }

      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  },

  async verifyTwoFactor(code) {
    let response;

    try {
      response = await api.post(
        '/api/v1/auth/2fa/verify',
        {
          otp: code,
        },
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Two-factor verification failed'));
    }

    const token = extractAccessToken(response.data);
    const refreshToken =
      response.data?.refreshToken ||
      response.data?.data?.refreshToken ||
      response.data?.tokens?.refreshToken ||
      null;
    if (token) {
      setAccessToken(token);
    }
    if (refreshToken) {
      setRefreshToken(refreshToken);
    }

    const user = response.data?.user
      ? normalizeUser(response.data)
      : await this.getMe();

    return {
      user,
    };
  },

  async register({ name, email, password, role, phone }) {
    try {
      await api.post(
        '/api/v1/auth/register',
        {
          name,
          email,
          password,
          role: pickRole(role),
          phone,
        },
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }

    return {
      success: true,
    };
  },

  async logout() {
    let logoutError = null;

    try {
      await api.post(
        '/api/v1/auth/logout',
        {
          refreshToken: getRefreshToken(),
        },
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      logoutError = error;
    } finally {
      clearAccessToken();
      clearRefreshToken();
      authStorage.clearImpersonatedRole();
    }

    if (logoutError) {
      return {
        success: false,
        error: getErrorMessage(logoutError, 'Logout failed'),
      };
    }

    return {
      success: true,
    };
  },

  async getMe() {
    const response = await api.get('/api/v1/auth/me');
    return normalizeUser(response.data);
  },

  async restoreSession() {
    const hasAccessToken = Boolean(getAccessToken());
    const hasRefreshToken = Boolean(getRefreshToken());
    const refreshToken = getRefreshToken();

    if (!hasAccessToken && !hasRefreshToken) {
      return null;
    }

    const refreshSession = async () => {
      if (!refreshToken) {
        return null;
      }

      const refreshResponse = await api.post(
        '/api/v1/auth/refresh-token',
        {
          refreshToken,
        },
        {
          skipAuthRefresh: true,
        },
      );

      const token = extractAccessToken(refreshResponse.data);
      const nextRefreshToken =
        refreshResponse.data?.refreshToken ||
        refreshResponse.data?.data?.refreshToken ||
        refreshResponse.data?.tokens?.refreshToken ||
        null;

      if (!token) {
        throw new Error('Missing access token');
      }

      setAccessToken(token);
      if (nextRefreshToken) {
        setRefreshToken(nextRefreshToken);
      }

      return this.getMe();
    };

    try {
      if (!hasAccessToken && hasRefreshToken) {
        return await refreshSession();
      }

      return await this.getMe();
    } catch (error) {
      if (error.response?.status === 401 && hasRefreshToken) {
        try {
          return await refreshSession();
        } catch {
          clearAccessToken();
          clearRefreshToken();
          authStorage.clearImpersonatedRole();
          return null;
        }
      }

      clearAccessToken();
      clearRefreshToken();
      authStorage.clearImpersonatedRole();
      return null;
    }
  },

  async updateMe(profile) {
    const response = await api.put('/api/v1/auth/me', {
      name: profile.name,
      phone: profile.phone,
      currentPassword: profile.currentPassword,
      newPassword: profile.newPassword,
    });
    return normalizeUser(response.data);
  },

  async forgotPassword(email) {
    try {
      return await api.post(
        '/api/v1/auth/forgot-password',
        { email },
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to send reset instructions'));
    }
  },

  async resetPassword(body) {
    try {
      return await api.post(
        '/api/v1/auth/reset-password',
        body,
        {
          skipAuthRefresh: true,
        },
      );
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to reset password'));
    }
  },

  async changePassword(body) {
    try {
      return await api.put('/api/v1/auth/me', body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update password'));
    }
  },

  async enableTwoFactor() {
    let response;

    try {
      response = await api.post('/api/v1/auth/2fa/enable', {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to enable two-factor authentication'));
    }

    return response.data?.data || response.data || {};
  },

  async disableTwoFactor(body) {
    try {
      return await api.delete('/api/v1/auth/2fa/disable', {
        data: body,
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to disable two-factor authentication'));
    }
  },

  clearSession() {
    clearAccessToken();
    clearRefreshToken();
    authStorage.clearImpersonatedRole();
  },
};
