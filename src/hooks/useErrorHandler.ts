/**
 * React Hook for Error Handling
 * Provides convenient error handling utilities for React components
 */

import { useCallback } from 'react';
import { handleError, createErrorHandler, getErrorMessage } from '@/lib/errorHandler';

/**
 * Hook that provides error handling utilities
 */
export function useErrorHandler() {
  const handle = useCallback((error: unknown, options?: {
    defaultMessage?: string;
    showToast?: boolean;
  }) => {
    return handleError(error, options);
  }, []);

  const handleSilently = useCallback((error: unknown) => {
    return handleError(error, { showToast: false });
  }, []);

  const createHandler = useCallback((options?: {
    defaultMessage?: string;
    showToast?: boolean;
    onError?: (error: unknown) => void;
  }) => {
    return createErrorHandler(options);
  }, []);

  const getMessage = useCallback((error: unknown): string => {
    return getErrorMessage(error);
  }, []);

  return {
    handle,
    handleSilently,
    createHandler,
    getMessage,
  };
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncErrorHandler<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  options?: {
    defaultMessage?: string;
    showToast?: boolean;
    onError?: (error: unknown) => void;
  }
): T {
  const errorHandler = createErrorHandler(options);

  return useCallback(async (...args: Parameters<T>) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler(error);
      throw error; // Re-throw so caller can handle if needed
    }
  }, [asyncFn, errorHandler]) as T;
}
