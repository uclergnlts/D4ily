import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom Axios instance for API requests
 * Provides automatic authentication, error handling, and request/response interceptors
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://d4ily-production.up.railway.app';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased from 60s to 120s for large data operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { token } = useAuthStore.getState();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (__DEV__) {
      console.log(`[API Response] ${response.config.url}`, response.status, response.data);
    }

    return response;
  },
  (error) => {
    const { response } = error;

    // Handle different error scenarios
    if (response) {
      const status = response.status;
      const data = response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - Clear auth and redirect to login
          console.error('[API] Unauthorized - Clearing auth token');
          useAuthStore.getState().logout();
          break;

        case 403:
          // Forbidden
          console.error('[API] Forbidden - Insufficient permissions');
          break;

        case 404:
          // Not Found
          console.error('[API] Not Found');
          break;

        case 429:
          // Too Many Requests
          console.error('[API] Rate limit exceeded');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('[API] Server error:', status);
          break;

        default:
          console.error('[API] Error:', status, data?.message || error.message);
      }

      return Promise.reject({
        status,
        message: data?.message || error.message,
        data: data,
      });
    }

    // Network errors
    if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout');
      return Promise.reject({
        status: 408,
        message: 'Request timeout',
      });
    }

    if (error.code === 'ERR_NETWORK') {
      console.error('[API] Network error');
      return Promise.reject({
        status: 0,
        message: 'Network error - Please check your connection',
      });
    }

    return Promise.reject(error);
  }
);

/**
 * API client methods
 */
export const client = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data, config);
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch<T>(url, data, config);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, config);
  },
};

export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data, config);
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch<T>(url, data, config);
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, config);
  },
};

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: any): never {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || 'An error occurred';

    throw new Error(`API Error (${status}): ${message}`);
  }

  if (error.request) {
    throw new Error('Network error: No response received');
  }

  throw error;
}

/**
 * Helper function to check if error is a specific type
 */
export function isApiError(error: any, status: number): boolean {
  return error?.response?.status === status;
}

/**
 * Helper function to get error message
 */
export function getErrorMessage(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Example usage:
 * 
 * import { api, handleApiError, isApiError } from '../api/client';
 * 
 * // GET request
 * const response = await api.get('/feed/tr');
 * const articles = response.data;
 * 
 * // POST request
 * const response = await api.post('/auth/login', { email, password });
 * const { user, token } = response.data;
 * 
 * // Error handling
 * try {
 *   const response = await api.get('/feed/tr');
 *   // Handle success
 * } catch (error) {
 *   if (isApiError(error, 401)) {
 *     // Handle unauthorized
 *   }
 *   const message = getErrorMessage(error);
 *   // Show error message
 * }
 */
