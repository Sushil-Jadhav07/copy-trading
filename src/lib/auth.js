import api, {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/api';

const ROLE_STORAGE_KEY = 'Ascentra Capital_impersonated_role';
const PENDING_2FA_KEY = 'Ascentra Capital_pending_2fa_token';

const setPending2FAToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(PENDING_2FA_KEY, token);
  } else {
    sessionStorage.removeItem(PENDING_2FA_KEY);
  }
};

const getPending2FAToken = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(PENDING_2FA_KEY);
};

const clearPending2FAToken = () => setPending2FAToken(null);

const isPending2FAToken = (token) => Boolean(parseJwtPayload(token)?.pending2fa);

const pickRole = (rawRole) => {
  if (!rawRole) {
    return 'CHILD';
  }

  const normalized = String(rawRole).trim().toLowerCase();

  if (normalized === 'master' || normalized === 'provider') {
    return 'MASTER';
  }

  if (normalized === 'admin' || normalized === 'administrator') {
    return 'ADMIN';
  }

  return 'CHILD';
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
    id: source.userId || source.id || source._id || null,
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
  const twoFactorChannel = source?.twoFactorChannel || source?.channel || null;
  const email = source?.email || null;

  return {
    requires2FA,
    requiresEmailOtp: Boolean(source?.requiresEmailOtp),
    twoFactorChannel,
    email,
    otpExpiresIn: source?.otpExpiresIn ?? source?.expiresIn ?? null,
    otpRetryAfter: source?.otpRetryAfter ?? source?.retryAfter ?? null,
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

      if (twoFactorState.requires2FA) {
        if (token) {
          setPending2FAToken(token);
        }
        clearAccessToken();
        clearRefreshToken();
        return {
          requires2FA: true,
          requiresEmailOtp: twoFactorState.requiresEmailOtp,
          twoFactorChannel: twoFactorState.twoFactorChannel,
          email: twoFactorState.email || email,
          otpExpiresIn: twoFactorState.otpExpiresIn,
          otpRetryAfter: twoFactorState.otpRetryAfter,
        };
      }

      if (token) {
        setAccessToken(token);
      }
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
      clearPending2FAToken();

      const user = response.data?.user
        ? normalizeUser(response.data)
        : await this.getMe();

      return {
        user,
      };
    } catch (error) {
      if (error.response?.status === 202) {
        const token = extractAccessToken(error.response?.data || {});
        const twoFactorState = extractTwoFactorState(error.response?.data || {});
        if (token) {
          setPending2FAToken(token);
        }
        clearAccessToken();
        clearRefreshToken();
        return {
          requires2FA: true,
          email,
          twoFactorChannel: twoFactorState.twoFactorChannel || 'EMAIL',
          otpExpiresIn: twoFactorState.otpExpiresIn,
          otpRetryAfter: twoFactorState.otpRetryAfter,
        };
      }

      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  },

  /** Confirm 2FA enable (settings) — OTP from email/SMS, not login. */
  async confirmTwoFactorEnable(otp) {
    try {
      const response = await api.post('/api/v1/auth/2fa/verify', { otp });
      return response.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Two-factor verification failed'));
    }
  },

  /** @deprecated Use confirmTwoFactorEnable for settings; verifyLoginOtp for login. */
  async verifyTwoFactor(code) {
    return this.confirmTwoFactorEnable(code);
  },

  async sendLoginOtp(email) {
    try {
      const response = await api.post(
        '/api/v1/auth/send-email-otp',
        { email },
        { skipAuthRefresh: true },
      );
      return response?.data || {};
    } catch (error) {
      try {
        const fallback = await api.post(
          '/api/v1/auth/send-login-otp',
          { email },
          { skipAuthRefresh: true },
        );
        return fallback?.data || {};
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to send login OTP'));
      }
    }
  },

  async verifyLoginOtp(email, otp) {
    const pending = getPending2FAToken();
    const headers = pending ? { Authorization: `Bearer ${pending}` } : {};
    const postOpts = { skipAuthRefresh: true, headers };
    try {
      const response = await api.post(
        '/api/v1/auth/verify-login-otp',
        { email, otp },
        postOpts,
      );
      const token = extractAccessToken(response.data);
      const refreshToken = extractRefreshToken(response.data);
      clearPending2FAToken();
      if (token) setAccessToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      const user = response.data?.user ? normalizeUser(response.data) : await this.getMe();
      return { user };
    } catch (error) {
      try {
        const fallback = await api.post(
          '/api/v1/auth/verify-email-otp',
          { email, otp },
          postOpts,
        );
        const token = extractAccessToken(fallback.data);
        const refreshToken = extractRefreshToken(fallback.data);
        clearPending2FAToken();
        if (token) setAccessToken(token);
        if (refreshToken) setRefreshToken(refreshToken);
        const user = fallback.data?.user ? normalizeUser(fallback.data) : await this.getMe();
        return { user };
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'OTP verification failed'));
      }
    }
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
      const response = await api.get('/api/v1/users/me/profile');
      return normalizeUser(response.data?.data || response.data);
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/auth/me');
        return normalizeUser(fallback.data?.data || fallback.data);
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load profile'));
      }
    }
  },

  async updateMe(body) {
    try {
      const response = await api.put('/api/v1/users/me/profile', body);
      return normalizeUser(response.data?.data || response.data);
    } catch (error) {
      try {
        const fallback = await api.put('/api/v1/auth/me', body);
        return normalizeUser(fallback.data?.data || fallback.data);
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to update profile'));
      }
    }
  },

  async forgotPassword(email) {
    try {
      const response = await api.post('/api/v1/auth/forgot-password', { email }, { skipAuthRefresh: true });
      return response.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to send verification code'));
    }
  },

  async resetPassword(token, newPassword) {
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword }, { skipAuthRefresh: true });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to reset password'));
    }
  },

  async resetPasswordWithOtp(email, otp, newPassword) {
    try {
      await api.post(
        '/api/v1/auth/reset-password',
        { email, otp, newPassword },
        { skipAuthRefresh: true },
      );
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to reset password'));
    }
  },

  async getTwoFactorOptions() {
    try {
      const res = await api.get('/api/v1/auth/2fa/options');
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load 2FA options'));
    }
  },

  async enableTwoFactor(channel = 'EMAIL') {
    try {
      const res = await api.post('/api/v1/auth/2fa/enable', { channel });
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
      this.clearSession();
    }
  },

  restoreSession: async function() {
    try {
      const token = getAccessToken();
      if (token && isPending2FAToken(token)) {
        setPending2FAToken(token);
        clearAccessToken();
        clearRefreshToken();
        return null;
      }
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
    clearPending2FAToken();
    authStorage.clearImpersonatedRole();
  },

  changePassword: async function({ currentPassword, newPassword }) {
    return await this.updateMe({ currentPassword, newPassword });
  },
};

