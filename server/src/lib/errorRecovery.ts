/**
 * Error Recovery Utilities
 * Provides strategies for recovering from errors
 */

import { AppError, ErrorCode, isAppError } from './errors.js';

export interface RecoveryStrategy {
  canRecover: (error: unknown) => boolean;
  recover: (error: unknown) => Promise<any> | any;
}

/**
 * Creates a fallback value recovery strategy
 */
export function createFallbackStrategy<T>(
  fallbackValue: T,
  errorMatcher?: (error: unknown) => boolean
): RecoveryStrategy {
  return {
    canRecover: (error) => {
      if (errorMatcher) {
        return errorMatcher(error);
      }
      return true; // Recover from any error
    },
    recover: () => Promise.resolve(fallbackValue),
  };
}

/**
 * Creates a retry recovery strategy
 */
export function createRetryStrategy(
  maxRetries: number = 3,
  delay: number = 1000,
  errorMatcher?: (error: unknown) => boolean
): RecoveryStrategy {
  return {
    canRecover: (error) => {
      if (errorMatcher && !errorMatcher(error)) {
        return false;
      }
      // Only retry on transient errors
      if (isAppError(error)) {
        return (
          error.code === ErrorCode.DATABASE_CONNECTION_ERROR ||
          error.code === ErrorCode.CACHE_CONNECTION_ERROR ||
          error.code === ErrorCode.EXTERNAL_SERVICE_ERROR ||
          error.code === ErrorCode.API_TIMEOUT ||
          error.code === ErrorCode.SERVICE_UNAVAILABLE
        );
      }
      return false;
    },
    recover: async (error) => {
      // This is a placeholder - actual retry should be handled by retry utility
      throw error; // Re-throw to let retry utility handle it
    },
  };
}

/**
 * Attempts to recover from an error using provided strategies
 */
export async function attemptRecovery<T>(
  fn: () => Promise<T>,
  strategies: RecoveryStrategy[]
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          return await strategy.recover(error);
        } catch (recoveryError) {
          // If recovery fails, try next strategy
          continue;
        }
      }
    }
    // If no strategy can recover, throw original error
    throw error;
  }
}

/**
 * Wraps a function with error recovery
 */
export function withRecovery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  strategies: RecoveryStrategy[]
): T {
  return (async (...args: Parameters<T>) => {
    return attemptRecovery(() => fn(...args), strategies);
  }) as T;
}
