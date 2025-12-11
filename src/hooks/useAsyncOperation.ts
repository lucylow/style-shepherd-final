/**
 * React Hook for Safe Async Operations
 * Provides error handling wrapper for async operations in React components
 */

import { useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Hook that wraps async operations with error handling
 * Usage:
 *   const safeOperation = useAsyncOperation();
 *   const handleClick = () => safeOperation(async () => {
 *     await someAsyncFunction();
 *   });
 */
export function useAsyncOperation() {
  const { handle } = useErrorHandler();

  const wrap = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options?: {
        onError?: (error: unknown) => void;
        showToast?: boolean;
        defaultMessage?: string;
      }
    ): Promise<T | undefined> => {
      try {
        return await operation();
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        } else {
          handle(error, {
            showToast: options?.showToast !== false,
            defaultMessage: options?.defaultMessage,
          });
        }
        return undefined;
      }
    },
    [handle]
  );

  return wrap;
}

/**
 * Hook for async operations that should throw errors (for use in try-catch)
 * Usage:
 *   const safeOperation = useAsyncOperationWithThrow();
 *   try {
 *     await safeOperation(async () => {
 *       await someAsyncFunction();
 *     });
 *   } catch (error) {
 *     // Handle error
 *   }
 */
export function useAsyncOperationWithThrow() {
  const { handle } = useErrorHandler();

  const wrap = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options?: {
        onError?: (error: unknown) => void;
        showToast?: boolean;
        defaultMessage?: string;
      }
    ): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        } else {
          handle(error, {
            showToast: options?.showToast !== false,
            defaultMessage: options?.defaultMessage,
          });
        }
        throw error; // Re-throw for caller to handle
      }
    },
    [handle]
  );

  return wrap;
}
