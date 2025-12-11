/**
 * Centralized API Client
 * 
 * Base Axios instance with request/response interceptors for logging and request tracking.
 * For retry logic and enhanced error handling, use the functions from './apiClient'.
 * 
 * Uses environment variable VITE_API_BASE_URL for base URL configuration.
 * Falls back to /api for same-origin requests or localhost for development.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from './api-config';

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

// Response interceptor for error logging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
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
    
    // Don't retry here - let apiClient handle retries
    return Promise.reject(error);
  }
);

export default api;

