/**
 * Timeout Utilities
 * Provides timeout handling for async operations
 */

import { ApiTimeoutError, ErrorCode } from './errors.js';

export interface TimeoutOptions {
  timeoutMs?: number;
  errorMessage?: string;
  onTimeout?: () => void;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    errorMessage,
    onTimeout,
  } = options;

  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      reject(
        new ApiTimeoutError(
          'Operation',
          timeoutMs,
          errorMessage
        )
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

/**
 * Creates a timeout wrapper for a function
 */
export function withTimeoutWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): T {
  return (async (...args: Parameters<T>) => {
    return withTimeout(fn(...args), { timeoutMs });
  }) as T;
}
