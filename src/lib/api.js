import axios from 'axios';

const FALLBACK_API_BASE_URL = 'https://copy-trading-production-3981.up.railway.app';
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL || '';

const baseURL = (configuredBaseURL || FALLBACK_API_BASE_URL).replace(/\/$/, '');

let accessToken = null;
let refreshRequest = null;
const REFRESH_TOKEN_KEY = 'tradepilot_refresh_token';

const getStorageTargets = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  return [window.localStorage, window.sessionStorage];
};

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
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

const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (!currentPath.startsWith('/login')) {
    window.location.href = '/login';
  }
};

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};

  if (accessToken) {
    nextConfig.headers.Authorization = `Bearer ${accessToken}`;
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
      if (!refreshRequest) {
        refreshRequest = refreshClient.post('/api/v1/auth/refresh-token', {
          refreshToken: getRefreshToken(),
        });
      }

      const refreshResponse = await refreshRequest;
      const refreshedToken =
        refreshResponse.data?.accessToken ||
        refreshResponse.data?.data?.accessToken ||
        refreshResponse.data?.data?.token ||
        refreshResponse.data?.token ||
        refreshResponse.data?.tokens?.accessToken ||
        null;
      const refreshedRefreshToken =
        refreshResponse.data?.refreshToken ||
        refreshResponse.data?.data?.refreshToken ||
        refreshResponse.data?.tokens?.refreshToken ||
        null;

      setAccessToken(refreshedToken);
      if (refreshedRefreshToken) {
        setRefreshToken(refreshedRefreshToken);
      }

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
    } finally {
      refreshRequest = null;
    }
  },
);

export default api;
