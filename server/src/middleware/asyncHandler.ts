/**
 * Async Handler Middleware
 * Wraps async route handlers to automatically catch errors and pass them to error middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, toAppError } from '../lib/errors.js';
import { createErrorContext, enhanceErrorWithContext } from '../lib/errorContext.js';

/**
 * Wraps an async route handler to automatically catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Convert to AppError if not already
      const appError = isAppError(error) ? error : toAppError(error);
      
      // Enhance error with context before passing to error handler
      const context = createErrorContext(req);
      const enhancedError = enhanceErrorWithContext(appError, context);
      
      return next(enhancedError);
    });
  };
}

/**
 * Wraps multiple async route handlers
 * Usage: router.get('/path', ...asyncHandlers([middleware1, middleware2, handler]))
 */
export function asyncHandlers(
  handlers: Array<(req: Request, res: Response, next: NextFunction) => Promise<any> | any>
) {
  return handlers.map(handler => {
    if (handler.constructor.name === 'AsyncFunction' || handler.length === 3) {
      return asyncHandler(handler as any);
    }
    return handler;
  });
}
