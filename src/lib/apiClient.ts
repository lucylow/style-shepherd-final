/**
 * Enhanced API Client with Retry and Error Handling
 * 
 * This module provides a higher-level API client that wraps the base axios instance
 * with automatic retry logic and consistent error handling.
 * 
 * Usage:
 * - Use `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch` for most API calls
 * - Use the base `api` instance directly only when you need fine-grained control
 * - All functions support retry logic and error handling via `ApiClientOptions`
 * 
 * Example:
 * ```typescript
 * const response = await apiGet<User>('/users/123', undefined, {
 *   retry: { maxRetries: 3 },
 *   showErrorToast: false
 * });
 * ```
 */

import api from './api';
import { retry, isRetryableError, RetryOptions } from './retry';
import { handleError, getErrorMessage } from './errorHandler';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiClientOptions {
  retry?: RetryOptions;
  showErrorToast?: boolean;
  onError?: (error: unknown) => void;
}

/**
 * Makes an API request with automatic retry and error handling
 */
export async function apiRequest<T = any>(
  config: AxiosRequestConfig,
  options: ApiClientOptions = {}
): Promise<AxiosResponse<T>> {
  const {
    retry: retryOptions = {
      maxRetries: 2,
      retryable: isRetryableError,
    },
    showErrorToast = true,
    onError,
  } = options;

  try {
    const response = await retry(
      () => api.request<T>(config),
      retryOptions
    );
    return response;
  } catch (error) {
    if (onError) {
      onError(error);
    } else if (showErrorToast) {
      handleError(error, {
        defaultMessage: `Failed to ${config.method?.toUpperCase()} ${config.url}`,
      });
    }
    throw error;
  }
}

/**
 * GET request with retry
 */
export async function apiGet<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<T>> {
  return apiRequest<T>({ ...config, method: 'GET', url }, options);
}

/**
 * POST request with retry
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<T>> {
  return apiRequest<T>({ ...config, method: 'POST', url, data }, options);
}

/**
 * PUT request with retry
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<T>> {
  return apiRequest<T>({ ...config, method: 'PUT', url, data }, options);
}

/**
 * PATCH request with retry
 */
export async function apiPatch<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<T>> {
  return apiRequest<T>({ ...config, method: 'PATCH', url, data }, options);
}

/**
 * DELETE request with retry
 */
export async function apiDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<T>> {
  return apiRequest<T>({ ...config, method: 'DELETE', url }, options);
}

/**
 * Check endpoint status by making a lightweight request
 * Returns HTTP status code if successful, 0 if unavailable
 */
export async function checkEndpointStatus(
  path: string,
  method: string = 'GET'
): Promise<number> {
  try {
    // Use HEAD request for GET endpoints to minimize data transfer
    // For other methods, use OPTIONS to check if endpoint exists
    const checkMethod = method.toUpperCase() === 'GET' ? 'HEAD' : 'OPTIONS';
    
    const response = await api.request({
      method: checkMethod,
      url: path,
      timeout: 5000, // 5 second timeout for status checks
      validateStatus: () => true, // Don't throw on any status code
    });
    
    return response.status;
  } catch (error) {
    // Return 0 for any error (network error, timeout, etc.)
    return 0;
  }
}

// Re-export the base api instance for direct use when needed
export { api };
export default api;
