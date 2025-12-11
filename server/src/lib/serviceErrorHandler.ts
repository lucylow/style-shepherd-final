/**
 * Service Error Handler Utilities
 * Provides utilities for consistent error handling in service methods
 */

import { AppError, toAppError, isAppError, ErrorCode } from './errors.js';
import { logError } from './errorLogger.js';

/**
 * Wraps a service method with error handling
 * Automatically converts errors to AppError and logs them
 */
export function withServiceErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  serviceName: string,
  operationName?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      // Convert to AppError if not already
      const appError = isAppError(error) ? error : toAppError(error);
      
      // Enhance error with service context
      if (!isAppError(error)) {
        // Add service context to error details
        const enhancedError = new AppError(
          appError.message,
          appError.code,
          appError.statusCode,
          {
            ...appError.details,
            service: serviceName,
            operation: operationName || fn.name,
          },
          appError.isOperational
        );
        
        // Log error with context
        logError(enhancedError);
        throw enhancedError;
      }
      
      // Log existing AppError
      logError(appError);
      throw appError;
    }
  }) as T;
}

/**
 * Creates a safe wrapper that returns a fallback value on error
 */
export function withFallback<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallbackValue: Awaited<ReturnType<T>>,
  serviceName: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      const appError = isAppError(error) ? error : toAppError(error);
      logError(appError, undefined, {
        service: serviceName,
        operation: fn.name,
        fallbackUsed: true,
      });
      return fallbackValue;
    }
  }) as T;
}

/**
 * Wraps a service method with timeout and error handling
 */
export async function withServiceTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  serviceName: string,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new AppError(
          `${serviceName}.${operationName} timed out after ${timeoutMs}ms`,
          ErrorCode.API_TIMEOUT,
          504,
          { service: serviceName, operation: operationName, timeoutMs }
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } catch (error: unknown) {
    const appError = isAppError(error) ? error : toAppError(error);
    logError(appError, undefined, {
      service: serviceName,
      operation: operationName,
    });
    throw appError;
  }
}
