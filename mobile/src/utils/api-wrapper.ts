import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from './constants';
import { logger } from './logger';

// Check if should use mock
let Config: any = null;
try {
  Config = require('react-native-config').default || require('react-native-config');
} catch (error) {
  // Silent
}

const USE_MOCK_API = Config?.USE_MOCK_API === 'true';

// Result type
export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number; data?: any };

// Request config
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 10000; // 10s
const DEFAULT_RETRIES = 2;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error('Failed to get token from storage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      } catch (e) {
        logger.error('Failed to clear auth storage', e);
      }
    }
    return Promise.reject(error);
  }
);

// Sleep helper for retry
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Main request function
export const request = async <T = any>(config: RequestConfig): Promise<ApiResult<T>> => {
  const {
    method,
    path,
    body,
    params,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
  } = config;

  // If mock mode, return mock immediately
  if (USE_MOCK_API) {
    logger.mock(`Using mock for ${method} ${path}`);
    return { ok: true, data: {} as T, status: 200 };
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.api(`${method} ${path}`, { attempt: attempt + 1, body, params });

      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        data: body,
        params,
        headers,
        timeout,
      };

      const response = await apiClient.request<T>(axiosConfig);

      logger.api(`${method} ${path} SUCCESS`, { status: response.status });
      return { ok: true, data: response.data, status: response.status };
    } catch (error: any) {
      lastError = error;
      const isNetworkError = !error.response;
      const isRetryable = isNetworkError || (error.response?.status >= 500 && error.response?.status < 600);
      const status = error.response?.status;

      logger.api(`${method} ${path} FAILED`, {
        attempt: attempt + 1,
        status,
        error: error.message,
        retryable: isRetryable,
      });

      // Don't retry on 4xx (except network errors)
      if (!isRetryable || attempt === retries) {
        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Request failed';

        // Hide token in logs
        const safeError = errorMessage.replace(/Bearer\s+[\w-]+/gi, 'Bearer ***');

        return {
          ok: false,
          error: safeError,
          status: status || 0,
          data: error.response?.data,
        };
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await sleep(delay);
    }
  }

  // Should never reach here, but just in case
  return {
    ok: false,
    error: lastError?.message || 'Request failed after retries',
    status: lastError?.response?.status,
  };
};

// Convenience methods
export const api = {
  get: <T = any>(path: string, config?: Omit<RequestConfig, 'method' | 'path'>) =>
    request<T>({ method: 'GET', path, ...config }),
  post: <T = any>(path: string, body?: any, config?: Omit<RequestConfig, 'method' | 'path' | 'body'>) =>
    request<T>({ method: 'POST', path, body, ...config }),
  put: <T = any>(path: string, body?: any, config?: Omit<RequestConfig, 'method' | 'path' | 'body'>) =>
    request<T>({ method: 'PUT', path, body, ...config }),
  patch: <T = any>(path: string, body?: any, config?: Omit<RequestConfig, 'method' | 'path' | 'body'>) =>
    request<T>({ method: 'PATCH', path, body, ...config }),
  delete: <T = any>(path: string, config?: Omit<RequestConfig, 'method' | 'path'>) =>
    request<T>({ method: 'DELETE', path, ...config }),
};

