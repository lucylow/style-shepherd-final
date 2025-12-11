/**
 * Error Handler Middleware
 * Wraps route handlers to ensure all errors are properly caught and handled
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, toAppError } from '../lib/errors.js';
import { logError } from '../lib/errorLogger.js';

/**
 * Async error handler wrapper
 * Automatically catches errors from async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
  
  // Log error with structured logging
  logError(error, req);
  
  // Send error response
  // Don't expose internal error details in production for non-operational errors
  const shouldExposeDetails = process.env.NODE_ENV === 'development' || error.isOperational;
  
  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(shouldExposeDetails && { details: error.details }),
      timestamp: error.timestamp.toISOString(),
    },
  });
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    'NOT_FOUND' as any,
    404
  );
  next(error);
}
