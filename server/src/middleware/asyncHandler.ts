/**
 * Async Handler Middleware
 * Wraps async route handlers to automatically catch errors and pass them to error middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler to automatically catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
