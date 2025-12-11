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
import { ApiResponse, ApiRequestOptions, RequestMetadata } from './api-types';
import { apiHealthMonitor } from './api-health';

export interface ApiClientOptions extends ApiRequestOptions {
  retry?: RetryOptions;
  showErrorToast?: boolean;
  onError?: (error: unknown) => void;
  checkHealth?: boolean; // Check API health before making request
}

/**
 * Makes an API request with automatic retry and error handling
 */
export async function apiRequest<T = any>(
  config: AxiosRequestConfig,
  options: ApiClientOptions = {}
): Promise<AxiosResponse<ApiResponse<T>>> {
  const {
    retry: retryOptions = {
      maxRetries: 2,
      retryable: isRetryableError,
    },
    showErrorToast = true,
    onError,
    checkHealth = false,
    timeout,
    metadata,
  } = options;

  // Check API health if requested
  if (checkHealth) {
    const isAvailable = await apiHealthMonitor.ensureAvailable();
    if (!isAvailable) {
      const error = new Error('API is currently unavailable');
      if (showErrorToast) {
        handleError(error, {
          defaultMessage: 'Service is temporarily unavailable. Please try again later.',
        });
      }
      throw error;
    }
  }

  // Apply timeout if specified
  if (timeout) {
    config.timeout = timeout;
  }

  // Add metadata to config
  if (metadata) {
    (config as any).metadata = metadata;
  }

  try {
    const response = await retry(
      () => api.request<ApiResponse<T>>(config),
      retryOptions
    );
    
    // Extract data from ApiResponse wrapper if present
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const apiResponse = response.data as ApiResponse<T>;
      if (!apiResponse.success && apiResponse.error) {
        const error = new Error(apiResponse.error.message);
        (error as any).response = {
          ...response,
          data: apiResponse,
          status: apiResponse.error.statusCode,
        };
        throw error;
      }
    }
    
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
): Promise<AxiosResponse<ApiResponse<T>>> {
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
): Promise<AxiosResponse<ApiResponse<T>>> {
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
): Promise<AxiosResponse<ApiResponse<T>>> {
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
): Promise<AxiosResponse<ApiResponse<T>>> {
  return apiRequest<T>({ ...config, method: 'PATCH', url, data }, options);
}

/**
 * DELETE request with retry
 */
export async function apiDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: ApiClientOptions
): Promise<AxiosResponse<ApiResponse<T>>> {
  return apiRequest<T>({ ...config, method: 'DELETE', url }, options);
}

/**
 * Helper to extract data from ApiResponse
 */
export function extractApiData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    const apiResponse = response.data as ApiResponse<T>;
    if (apiResponse.success && apiResponse.data !== undefined) {
      return apiResponse.data;
    }
    if (!apiResponse.success && apiResponse.error) {
      throw new Error(apiResponse.error.message);
    }
  }
  // Fallback: return response.data directly if not wrapped
  return response.data as T;
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
