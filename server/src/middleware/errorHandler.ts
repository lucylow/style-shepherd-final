/**
 * Error Handler Middleware
 * Wraps route handlers to ensure all errors are properly caught and handled
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, toAppError, ErrorCode } from '../lib/errors.js';
import { logError } from '../lib/errorLogger.js';
import { createErrorContext, enhanceErrorWithContext } from '../lib/errorContext.js';

/**
 * Async error handler wrapper
 * Automatically catches errors from async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Enhance error with context before passing to error handler
      if (isAppError(error)) {
        const context = createErrorContext(req);
        const enhancedError = enhanceErrorWithContext(error, context);
        return next(enhancedError);
      }
      next(error);
    });
  };
}

/**
 * Error handler middleware
 * Should be used as the last middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Convert to AppError if needed
  const error = isAppError(err) ? err : toAppError(err);
  
  // Enhance with request context if not already enhanced
  let finalError = error;
  if (req && (!error.details?.context)) {
    const context = createErrorContext(req);
    finalError = enhanceErrorWithContext(error, context);
  }
  
  // Log error with structured logging
  logError(finalError, req);
  
  // Send error response
  // Don't expose internal error details in production for non-operational errors
  const shouldExposeDetails = process.env.NODE_ENV === 'development' || finalError.isOperational;
  
  // Determine if we should send error response or if response was already sent
  if (res.headersSent) {
    return next(finalError);
  }
  
  res.status(finalError.statusCode).json({
    error: {
      code: finalError.code,
      message: finalError.message,
      statusCode: finalError.statusCode,
      ...(shouldExposeDetails && { details: finalError.details }),
      timestamp: finalError.timestamp.toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        requestId: req.headers['x-request-id'],
      }),
    },
  });
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    ErrorCode.NOT_FOUND,
    404,
    {
      method: req.method,
      path: req.path,
    }
  );
  next(error);
}
