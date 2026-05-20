import api, {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/api';

const ROLE_STORAGE_KEY = 'Ascentra Capital_impersonated_role';

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
    telegramChatId: source.telegramChatId || source.telegram_chat_id || '',
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
  payload?.access_token ||
  payload?.token ||
  payload?.data?.accessToken ||
  payload?.data?.access_token ||
  payload?.data?.token ||
  payload?.tokens?.accessToken ||
  payload?.tokens?.access_token ||
  payload?.data?.tokens?.accessToken ||
  payload?.data?.tokens?.access_token ||
  payload?.data?.jwt ||
  payload?.jwt ||
  null;

const extractRefreshToken = (payload = {}) =>
  payload?.refreshToken ||
  payload?.refresh_token ||
  payload?.data?.refreshToken ||
  payload?.data?.refresh_token ||
  payload?.tokens?.refreshToken ||
  payload?.tokens?.refresh_token ||
  payload?.data?.tokens?.refreshToken ||
  payload?.data?.tokens?.refresh_token ||
  null;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const getErrorCode = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.errorCode ||
  error?.errorCode ||
  null;

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

const parseJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isJwtExpired = (token) => {
  const exp = Number(parseJwtPayload(token)?.exp);
  if (!exp) return false;
  return exp * 1000 <= Date.now();
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
      clearAccessToken();
      clearRefreshToken();
      authStorage.clearImpersonatedRole();

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
      const refreshToken = extractRefreshToken(response.data);
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
        const refreshToken = extractRefreshToken(error.response?.data || {});

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
    const refreshToken = extractRefreshToken(response.data);
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

  async sendOtp(phone, purpose = 'login') {
    return await api.post('/api/v1/auth/send-otp', { phone, purpose }, { skipAuthRefresh: true });
  },

  async verifyOtp(phone, otp, purpose = 'login') {
    try {
      const response = await api.post('/api/v1/auth/verify-otp', { phone, otp, purpose }, { skipAuthRefresh: true });
      const payload = response?.data || {};
      if (payload?.success === false) {
        const error = new Error(payload?.message || payload?.error || 'OTP verification failed');
        error.errorCode = payload?.error || payload?.errorCode || null;
        throw error;
      }
      const token = extractAccessToken(response.data);
      const refreshToken = extractRefreshToken(response.data);
      if (token) setAccessToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      const user = response.data?.user ? normalizeUser(response.data) : await this.getMe();
      return { user };
    } catch (error) {
      const wrapped = new Error(getErrorMessage(error, 'OTP verification failed'));
      wrapped.errorCode = getErrorCode(error);
      throw wrapped;
    }
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
  },

  async validatePassword(password) {
    try {
      const response = await api.post(
        '/api/v1/auth/validate-password',
        { password },
        { skipAuthRefresh: true },
      );
      return response.data?.data || response.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to validate password'));
    }
  },

  async getMe() {
    try {
      const response = await api.get('/api/v1/auth/me');
      return normalizeUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load profile'));
    }
  },

  async updateMe(body) {
    try {
      const response = await api.put('/api/v1/auth/me', body);
      return normalizeUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update profile'));
    }
  },

  async forgotPassword(email) {
    try {
      await api.post('/api/v1/auth/forgot-password', { email });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to send reset link'));
    }
  },

  async resetPassword(token, newPassword) {
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to reset password'));
    }
  },

  async enableTwoFactor() {
    try {
      const res = await api.post('/api/v1/auth/2fa/enable');
      // API returns { qrCodeUri, secret } — pass through so Profile can render the QR code
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to enable 2FA'));
    }
  },

  async disable2FA(password, otp) {
    try {
      await api.delete('/api/v1/auth/2fa/disable', { data: { password, otp } });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to disable 2FA'));
    }
  },

  async disableTwoFactor({ password, otp }) {
    return this.disable2FA(password, otp);
  },

  async logout() {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAccessToken();
      clearRefreshToken();
      authStorage.clearImpersonatedRole();
    }
  },

  restoreSession: async function() {
    try {
      const token = getAccessToken();
      if (!token) return null;
      const refreshToken = getRefreshToken();

      if (isJwtExpired(token) && !refreshToken) {
        this.clearSession();
        return null;
      }

      return await this.getMe();
    } catch {
      this.clearSession();
      return null;
    }
  },

  clearSession: function() {
    clearAccessToken();
    clearRefreshToken();
    authStorage.clearImpersonatedRole();
  },

  changePassword: async function({ currentPassword, newPassword }) {
    return await this.updateMe({ currentPassword, newPassword });
  },
};
