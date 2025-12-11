/**
 * Centralized API Client
 * 
 * Uses environment variable VITE_API_BASE_URL for base URL configuration.
 * Falls back to /api for same-origin requests or localhost for development.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from './api-config';
import { retry, isRetryableError } from './retry';

const baseURL = getApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request ID for tracking
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add request ID for tracking
    if (!config.headers['x-request-id']) {
      config.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for logging (dev only)
if (import.meta.env.DEV) {
  api.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );
}

// Response interceptor for error logging and handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Enhanced error logging with better context
    const errorContext = {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      isNetworkError: !error.response && !!error.request,
      isTimeout: error.code === 'ECONNABORTED',
      requestId: error.config?.headers['x-request-id'],
    };
    
    // Log error with appropriate level
    if (error.response) {
      const logLevel = error.response.status >= 500 ? 'error' : 'warn';
      console[logLevel](
        `[API] ${errorContext.method} ${errorContext.url} failed:`,
        errorContext.status,
        errorContext.data
      );
    } else if (error.request) {
      console.error('[API] No response received:', errorContext);
    } else {
      console.error('[API] Error setting up request:', error.message);
    }
    
    // For retryable errors, attempt retry if not already retried
    if (isRetryableError(error) && error.config && !(error.config as any).__retryCount) {
      const retryCount = (error.config as any).__retryCount || 0;
      const maxRetries = 2; // Limit retries in interceptor to avoid infinite loops
      
      if (retryCount < maxRetries) {
        (error.config as any).__retryCount = retryCount + 1;
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return api.request(error.config as AxiosRequestConfig);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

