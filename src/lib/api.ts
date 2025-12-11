/**
 * Centralized API Client
 * 
 * Uses environment variable VITE_API_BASE_URL for base URL configuration.
 * Falls back to /api for same-origin requests or localhost for development.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiBaseUrl } from './api-config';

const baseURL = getApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  // Response interceptor for error logging and handling
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
      };
      
      if (error.response) {
        console.error(
          `[API] ${errorContext.method} ${errorContext.url} failed:`,
          errorContext.status,
          errorContext.data
        );
      } else if (error.request) {
        console.error('[API] No response received:', errorContext);
      } else {
        console.error('[API] Error setting up request:', error.message);
      }
      
      return Promise.reject(error);
    }
  );
}

export default api;

