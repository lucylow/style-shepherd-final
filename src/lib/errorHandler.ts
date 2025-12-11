/**
 * Centralized Error Handler for Frontend
 * Provides user-friendly error messages and error handling utilities
 */

import { AxiosError } from 'axios';
import { toast } from 'sonner';

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
    details?: any;
  };
  message?: string;
}

/**
 * Extracts user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Axios errors
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiErrorResponse;
    
    if (response?.error?.message) {
      return response.error.message;
    }
    
    if (response?.message) {
      return response.message;
    }
    
    if (error.response?.status) {
      return getHttpErrorMessage(error.response.status, error.message);
    }
    
    if (error.request) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    return error.message || 'An unexpected error occurred';
  }
  
  // Standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // String errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Gets user-friendly message for HTTP status codes
 */
function getHttpErrorMessage(status: number, defaultMessage?: string): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'You need to be logged in to perform this action.',
    403: 'You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with the current state. Please refresh and try again.',
    422: 'The request is valid but cannot be processed. Please check your input.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Our team has been notified. Please try again later.',
    502: 'Service temporarily unavailable. Please try again in a moment.',
    503: 'Service is currently unavailable. Please try again later.',
    504: 'Request timed out. Please try again.',
  };
  
  return messages[status] || defaultMessage || 'An error occurred. Please try again.';
}

/**
 * Gets error code from error object
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    const response = error.response?.data as ApiErrorResponse;
    return response?.error?.code;
  }
  
  return undefined;
}

/**
 * Gets HTTP status code from error object
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof AxiosError) {
    return error.response?.status;
  }
  
  return undefined;
}

/**
 * Checks if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && !!error.request;
  }
  
  if (error instanceof Error) {
    return error.message.includes('Network') || 
           error.message.includes('Failed to fetch') ||
           error.message.includes('timeout');
  }
  
  return false;
}

/**
 * Checks if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED' || error.message.includes('timeout');
  }
  
  if (error instanceof Error) {
    return error.message.includes('timeout') || error.message.includes('Timeout');
  }
  
  return false;
}

/**
 * Checks if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 400 && status < 500;
}

/**
 * Checks if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status !== undefined && status >= 500;
}

/**
 * Handles error and shows user-friendly toast notification
 */
export function handleError(error: unknown, options?: {
  defaultMessage?: string;
  showToast?: boolean;
  logToConsole?: boolean;
}): string {
  const {
    defaultMessage,
    showToast = true,
    logToConsole = true,
  } = options || {};
  
  const message = defaultMessage || getErrorMessage(error);
  const status = getErrorStatus(error);
  
  // Log error for debugging
  if (logToConsole) {
    console.error('Error:', {
      message,
      error,
      status,
      code: getErrorCode(error),
      isNetworkError: isNetworkError(error),
      isTimeoutError: isTimeoutError(error),
    });
  }
  
  // Show toast notification
  if (showToast) {
    if (isNetworkError(error)) {
      toast.error('Connection Error', {
        description: 'Unable to connect to the server. Please check your internet connection.',
      });
    } else if (isTimeoutError(error)) {
      toast.error('Request Timeout', {
        description: 'The request took too long. Please try again.',
      });
    } else if (isServerError(error)) {
      toast.error('Server Error', {
        description: 'Something went wrong on our end. Please try again later.',
      });
    } else {
      toast.error(message);
    }
  }
  
  return message;
}

/**
 * Handles error silently (logs but doesn't show toast)
 */
export function handleErrorSilently(error: unknown): string {
  return handleError(error, { showToast: false });
}

/**
 * Creates an error handler function for async operations
 */
export function createErrorHandler(options?: {
  defaultMessage?: string;
  showToast?: boolean;
  onError?: (error: unknown) => void;
}) {
  return (error: unknown) => {
    const message = handleError(error, {
      defaultMessage: options?.defaultMessage,
      showToast: options?.showToast,
    });
    
    if (options?.onError) {
      options.onError(error);
    }
    
    return message;
  };
}
