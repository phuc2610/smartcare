import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS, USE_MOCK_API } from './constants';
import { logger } from './logger';

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

if (!API_BASE_URL || API_BASE_URL.trim() === '') {
  const errorMsg = `API_BASE_URL is missing or empty. Current value: "${API_BASE_URL}". Please set it in mobile/.env file and rebuild the app (npm run android).`;
  console.error('[API]', errorMsg);
  console.error('[API] Make sure:');
  console.error('[API] 1. File mobile/.env exists');
  console.error('[API] 2. File contains: API_BASE_URL=http://10.0.2.2:4000');
  console.error('[API] 3. You have rebuilt the app after creating/editing .env');
  throw new Error(errorMsg);
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (__DEV__) {
  console.log('[API] baseUrl =', API_BASE_URL);
  console.log('[API] USE_MOCK_API =', USE_MOCK_API);
}

logger.config('API client initialized', {
  baseURL: API_BASE_URL,
  useMockApi: USE_MOCK_API,
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
      logger.api(`${method} ${url}`, { attempt: attempt + 1, body, params });

      const axiosConfig: AxiosRequestConfig = {
        method,
        url,
        data: body,
        params,
        headers,
        timeout,
      };

      const response = await apiClient.request<T>(axiosConfig);

      logger.api(`${method} ${url} SUCCESS`, { status: response.status });
      return { ok: true, data: response.data, status: response.status };
    } catch (error: any) {
      lastError = error;
      const isNetworkError = !error.response;
      const isRetryable = isNetworkError || (error.response?.status >= 500 && error.response?.status < 600);
      const status = error.response?.status;

      logger.api(`${method} ${url} FAILED`, {
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

export const healthCheck = async () => {
  const url = `${API_BASE_URL}/health`;
  try {
    logger.api('HEALTHCHECK start', { url });
    const response = await apiClient.get(url, { timeout: 5000 });
    logger.api('HEALTHCHECK success', { status: response.status, data: response.data });
    return { ok: true, data: response.data, status: response.status as number };
  } catch (error: any) {
    logger.error('HEALTHCHECK failed', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      url,
    });
    return {
      ok: false,
      error: error?.message || 'Healthcheck failed',
      status: error?.response?.status,
      data: error?.response?.data,
    };
  }
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

