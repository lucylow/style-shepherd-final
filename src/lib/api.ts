/**
 * Centralized API Client
 * 
 * Base Axios instance with request/response interceptors for logging and request tracking.
 * For retry logic and enhanced error handling, use the functions from './apiClient'.
 * 
 * Uses environment variable VITE_API_BASE_URL for base URL configuration.
 * Falls back to /api for same-origin requests or localhost for development.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getApiBaseUrl } from './api-config';
import { ApiResponse, ApiError, RequestMetadata } from './api-types';

const baseURL = getApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request ID and metadata for tracking
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add request ID for tracking
    if (!config.headers['x-request-id']) {
      config.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add timestamp
    config.headers['x-request-timestamp'] = new Date().toISOString();
    
    // Add metadata if provided
    const metadata = (config as any).metadata as RequestMetadata | undefined;
    if (metadata) {
      if (metadata.userId) {
        config.headers['x-user-id'] = metadata.userId;
      }
      if (metadata.sessionId) {
        config.headers['x-session-id'] = metadata.sessionId;
      }
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

// Response interceptor for error logging and response normalization
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Normalize response to ApiResponse format if needed
    // Backend may return data directly or wrapped in ApiResponse
    if (response.data && typeof response.data === 'object') {
      // If backend already returns ApiResponse format, use it
      if ('success' in response.data || 'error' in response.data) {
        // Already in ApiResponse format
        return response;
      }
      
      // Otherwise, wrap it in ApiResponse format
      // This ensures consistent handling on frontend
      const requestId = response.config.headers['x-request-id'] as string;
      response.data = {
        success: true,
        data: response.data,
        requestId,
        timestamp: new Date().toISOString(),
      } as ApiResponse;
    }
    
    return response;
  },
  (error: AxiosError<ApiResponse | ApiError>) => {
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
    
    // Normalize error response to ApiResponse format
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // If backend returns ApiResponse format with error, use it
      if (typeof errorData === 'object' && 'error' in errorData) {
        const apiResponse = errorData as ApiResponse;
        error.response.data = {
          success: false,
          error: apiResponse.error || {
            code: 'UNKNOWN_ERROR',
            message: error.message,
            statusCode: error.response.status || 500,
          },
          requestId: apiResponse.requestId || errorContext.requestId,
          timestamp: new Date().toISOString(),
        } as ApiResponse;
      } else {
        // Wrap error in ApiResponse format
        error.response.data = {
          success: false,
          error: {
            code: error.response.status?.toString() || 'UNKNOWN_ERROR',
            message: error.message || 'An error occurred',
            statusCode: error.response.status || 500,
            details: errorData,
          },
          requestId: errorContext.requestId,
          timestamp: new Date().toISOString(),
        } as ApiResponse;
      }
    }
    
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

