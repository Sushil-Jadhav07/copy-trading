import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const ACCESS_TOKEN_KEY = 'Ascentra Capital_access_token';
let accessToken = null;
let refreshRequest = null;
const REFRESH_TOKEN_KEY = 'Ascentra Capital_refresh_token';
const TOKEN_EXPIRY_SKEW_SECONDS = 30;

const getStorageTargets = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  return [window.localStorage, window.sessionStorage];
};

export const setAccessToken = (token) => {
  accessToken = token || null;
  getStorageTargets().forEach((storage) => {
    if (token) {
      storage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      storage.removeItem(ACCESS_TOKEN_KEY);
    }
  });
};

export const getAccessToken = () => {
  if (accessToken) {
    return accessToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  accessToken =
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    null;

  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
  getStorageTargets().forEach((storage) => {
    storage.removeItem(ACCESS_TOKEN_KEY);
  });
};

export const setRefreshToken = (token) => {
  getStorageTargets().forEach((storage) => {
    if (token) {
      storage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      storage.removeItem(REFRESH_TOKEN_KEY);
    }
  });
};

export const getRefreshToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
};

export const clearRefreshToken = () => {
  getStorageTargets().forEach((storage) => {
    storage.removeItem(REFRESH_TOKEN_KEY);
  });
};

const IMPERSONATION_KEY = 'Ascentra Capital_impersonation';
const ADMIN_TOKEN_KEY = 'Ascentra Capital_admin_token';
const ADMIN_REFRESH_KEY = 'Ascentra Capital_admin_refresh';

const removeImpersonationState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
};

export const startImpersonation = (token, targetUser) => {
  const adminToken = getAccessToken();
  const adminRefresh = getRefreshToken();
  if (adminToken) localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
  if (adminRefresh) localStorage.setItem(ADMIN_REFRESH_KEY, adminRefresh);
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
    userId: targetUser.userId || targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: targetUser.role,
    startedAt: new Date().toISOString(),
  }));
  setAccessToken(token);
  clearRefreshToken();
};

export const clearImpersonationState = () => {
  removeImpersonationState();
};

export const endImpersonation = () => {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  const adminRefresh = localStorage.getItem(ADMIN_REFRESH_KEY);
  removeImpersonationState();
  if (adminToken) {
    setAccessToken(adminToken);
  } else {
    clearAccessToken();
  }
  if (adminRefresh) {
    setRefreshToken(adminRefresh);
  } else {
    clearRefreshToken();
  }
};

export const getImpersonation = () => {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const isImpersonating = () => Boolean(localStorage.getItem(IMPERSONATION_KEY));

const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (!currentPath.startsWith('/login')) {
    window.location.href = '/login';
  }
};

const isAuthBootstrapRequest = (url = '') =>
  url.includes('/api/v1/auth/login') ||
  url.includes('/api/v1/auth/google') ||
  url.includes('/api/v1/auth/logout') ||
  url.includes('/api/v1/auth/register') ||
  url.includes('/api/v1/auth/validate-password') ||
  url.includes('/api/v1/auth/forgot-password') ||
  url.includes('/api/v1/auth/reset-password') ||
  url.includes('/api/v1/auth/send-email-otp') ||
  url.includes('/api/v1/auth/send-login-otp') ||
  url.includes('/api/v1/auth/verify-login-otp') ||
  url.includes('/api/v1/auth/verify-email-otp') ||
  url.includes('/api/v1/auth/send-otp') ||
  url.includes('/api/v1/auth/verify-otp') ||
  url.includes('/api/v1/auth/refresh-token');

const parseJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = parseJwtPayload(token);
  const expSeconds = Number(payload?.exp);

  if (!expSeconds) {
    return false;
  }

  const expiresAtMs = expSeconds * 1000;
  return expiresAtMs <= Date.now() + TOKEN_EXPIRY_SKEW_SECONDS * 1000;
};

const refreshAccessToken = async () => {
  if (!refreshRequest) {
    refreshRequest = refreshClient
      .post('/api/v1/auth/refresh-token', {
        refreshToken: getRefreshToken(),
      })
      .then((refreshResponse) => {
        const refreshedToken =
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.access_token ||
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.data?.access_token ||
          refreshResponse.data?.data?.token ||
          refreshResponse.data?.token ||
          refreshResponse.data?.tokens?.accessToken ||
          refreshResponse.data?.tokens?.access_token ||
          refreshResponse.data?.data?.tokens?.accessToken ||
          refreshResponse.data?.data?.tokens?.access_token ||
          refreshResponse.data?.jwt ||
          refreshResponse.data?.data?.jwt ||
          null;
        const refreshedRefreshToken =
          refreshResponse.data?.refreshToken ||
          refreshResponse.data?.refresh_token ||
          refreshResponse.data?.data?.refreshToken ||
          refreshResponse.data?.data?.refresh_token ||
          refreshResponse.data?.tokens?.refreshToken ||
          refreshResponse.data?.tokens?.refresh_token ||
          refreshResponse.data?.data?.tokens?.refreshToken ||
          refreshResponse.data?.data?.tokens?.refresh_token ||
          null;

        if (!refreshedToken) {
          throw new Error('No access token in refresh response');
        }

        setAccessToken(refreshedToken);
        if (refreshedRefreshToken) {
          setRefreshToken(refreshedRefreshToken);
        }

        return refreshedToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};
  const url = String(nextConfig.url || '');
  const isAuthRequest = isAuthBootstrapRequest(url);

  if (isImpersonating() && !isAuthRequest) {
    const method = String(nextConfig.method || '').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return Promise.reject(new Error('Read-only session — this action is not allowed while viewing as another user.'));
    }
  }

  const token = getAccessToken();
  const shouldHandleAuth = !isAuthRequest && !nextConfig.skipAuthRefresh;

  if (token && !isTokenExpired(token) && shouldHandleAuth) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
    return nextConfig;
  }

  if (token && isTokenExpired(token)) {
    clearAccessToken();
  }

  const refreshToken = getRefreshToken();
  if (shouldHandleAuth && refreshToken) {
    try {
      const refreshedToken = await refreshAccessToken();
      nextConfig.headers.Authorization = `Bearer ${refreshedToken}`;
    } catch {
      clearAccessToken();
      clearRefreshToken();
      redirectToLogin();
    }
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const isRefreshRequest = originalRequest.url?.includes('/api/v1/auth/refresh-token');

    if (status !== 401 || originalRequest._retry || originalRequest.skipAuthRefresh || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshedToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers || {};
      if (refreshedToken) {
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
      } else {
        delete originalRequest.headers.Authorization;
      }

      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      clearRefreshToken();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
