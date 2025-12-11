/**
 * Error Context Utilities
 * Provides utilities for adding context to errors for better debugging
 */

import { Request } from 'express';
import { AppError, ErrorDetails } from './errors.js';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates error context from request
 */
export function createErrorContext(
  req: Request,
  additionalContext?: Partial<ErrorContext>
): ErrorContext {
  return {
    userId: (req as any).user?.id || (req as any).userId,
    requestId: req.headers['x-request-id'] as string,
    operation: `${req.method} ${req.path}`,
    ...additionalContext,
  };
}

/**
 * Enhances an error with context
 */
export function enhanceErrorWithContext(
  error: AppError,
  context: ErrorContext
): AppError {
  const enhancedDetails: ErrorDetails = {
    ...error.details,
    ...context.metadata,
    context: {
      userId: context.userId,
      requestId: context.requestId,
      operation: context.operation,
      resource: context.resource,
    },
  };

  return new (error.constructor as any)(
    error.message,
    error.code,
    error.statusCode,
    enhancedDetails,
    error.isOperational
  );
}

/**
 * Wraps an async function with error context
 */
export function withErrorContext<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  contextProvider: (...args: Parameters<T>) => ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        const context = contextProvider(...args);
        throw enhanceErrorWithContext(error, context);
      }
      throw error;
    }
  }) as T;
}
