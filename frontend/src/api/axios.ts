import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_STORAGE_KEY = 'crm-auth-v2';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

function parseStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAuthAndRedirect() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = '/login';
}

async function refreshAccessToken() {
  const stored = parseStoredAuth();
  const refreshToken = stored?.state?.refreshToken as string | null | undefined;
  if (!refreshToken) return null;

  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const payload = response?.data?.data;
  if (!payload?.accessToken) return null;

  const nextState = {
    ...(stored?.state ?? {}),
    token: payload.accessToken,
    refreshToken: payload.refreshToken ?? refreshToken,
    user: payload.user ?? stored?.state?.user ?? null,
    isAuthenticated: true,
  };

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...(stored ?? {}),
      state: nextState,
    }),
  );

  return payload.accessToken as string;
}

api.interceptors.request.use((config) => {
  const stored = parseStoredAuth();
  const token = stored?.state?.token as string | undefined;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as any;
    const status = err.response?.status;
    const url = String(originalRequest?.url ?? '');

    if (status === 401 && originalRequest && !originalRequest._retry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        refreshPromise ||= refreshAccessToken();
        const accessToken = await refreshPromise;
        refreshPromise = null;

        if (accessToken) {
          originalRequest.headers = {
            ...(originalRequest.headers ?? {}),
            Authorization: `Bearer ${accessToken}`,
          };
          return api(originalRequest);
        }
      } catch {
        refreshPromise = null;
      }

      clearAuthAndRedirect();
    }

    if (status === 401) {
      clearAuthAndRedirect();
    }

    return Promise.reject(err);
  }
);

export default api;
