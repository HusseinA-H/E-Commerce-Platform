import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Centralized API Error structure matching the NestJS global exception filter
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string[];
  timestamp: string;
  path: string;
}

// Create configured Axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Crucial for sending and receiving HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject tenant subdomain/custom-domain header
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    let tenantSlug: string | null = null;

    if (parts.length > 1) {
      if (hostname.endsWith('localhost') || hostname.endsWith('apexluxe.com')) {
        const sub = parts[0];
        if (sub !== 'www' && sub !== 'platform') {
          tenantSlug = sub;
        }
      } else {
        tenantSlug = hostname;
      }
    }

    if (tenantSlug) {
      config.headers['X-Tenant-Id'] = tenantSlug;
    }
  }
  return config;
});

// A flag to prevent infinite loops during refresh token retries
let isRefreshing = false;
let refreshFailedInSession = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle API errors and silent token rotation
apiClient.interceptors.response.use(
  (response) => {
    // If login or register succeeds, reset the session refresh failure flag
    if (response.config.url?.includes('/auth/login') || response.config.url?.includes('/auth/register')) {
      refreshFailedInSession = false;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 1. Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid refreshing on actual login/register page failures
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      // Check if user is a guest (unauthenticated) to avoid redundant refresh calls
      let isGuest = true;
      if (typeof window !== 'undefined') {
        try {
          const authData = window.localStorage.getItem('apex-luxe-auth');
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed?.state?.currentUser) {
              isGuest = false;
            }
          }
        } catch (e) {
          console.error('Failed to parse auth store from localStorage', e);
        }
      }

      // If user is a guest or refresh already failed in this session, reject immediately
      if (isGuest || refreshFailedInSession) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request token refresh endpoint (transmits the HTTP-only cookie automatically)
        await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        processQueue(null);
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshFailedInSession = true;
        processQueue(refreshError as Error);
        isRefreshing = false;

        // Refresh token is expired or invalid -> trigger global logout/clean up session
        if (typeof window !== 'undefined') {
          // Dispatch custom event to let the auth store or providers know we need to redirect to login
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Centralized error mapping helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (apiError && Array.isArray(apiError.message)) {
      return apiError.message.join(', ');
    }
    if (apiError && typeof apiError.message === 'string') {
      return apiError.message;
    }
    return error.message || 'An unexpected API error occurred.';
  }
  return error instanceof Error ? error.message : 'An unknown error occurred.';
}
