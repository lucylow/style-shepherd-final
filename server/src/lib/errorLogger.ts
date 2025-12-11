/**
 * Structured Error Logging
 * Provides consistent error logging with context and severity levels
 */

import { Request } from 'express';
import { AppError, isAppError } from './errors.js';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface ErrorLogContext {
  request?: {
    method: string;
    path: string;
    query?: any;
    body?: any;
    ip?: string;
    userAgent?: string;
    userId?: string;
  };
  error: {
    code: string;
    message: string;
    statusCode: number;
    stack?: string;
    details?: any;
  };
  timestamp: string;
  environment: string;
  [key: string]: any;
}

/**
 * Logs an error with structured context
 */
export function logError(
  error: Error | AppError,
  req?: Request,
  additionalContext?: Record<string, any>
): void {
  const appError = isAppError(error) ? error : error;
  const isOperational = isAppError(error) ? error.isOperational : false;
  
  const context: ErrorLogContext = {
    error: {
      code: isAppError(error) ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: isAppError(error) ? error.statusCode : 500,
      stack: error.stack,
      details: isAppError(error) ? error.details : undefined,
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ...additionalContext,
  };

  if (req) {
    context.request = {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' && req.body ? sanitizeBody(req.body) : undefined,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id || (req as any).userId,
    };
  }

  // Use appropriate log level
  const logLevel = isOperational ? LogLevel.WARN : LogLevel.ERROR;
  const logMethod = logLevel === LogLevel.ERROR ? console.error : console.warn;

  // Format log message
  const logMessage = `[${logLevel.toUpperCase()}] ${context.error.code}: ${context.error.message}`;
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log as JSON for structured logging systems
    logMethod(JSON.stringify(context));
  } else {
    // In development, log with better readability
    logMethod(logMessage);
    if (context.request) {
      console.log('Request:', context.request);
    }
    if (context.error.details) {
      console.log('Details:', context.error.details);
    }
    if (context.error.stack && process.env.NODE_ENV === 'development') {
      console.log('Stack:', context.error.stack);
    }
  }

  // TODO: Integrate with external error tracking service (e.g., Sentry, DataDog)
  // if (process.env.ERROR_TRACKING_DSN) {
  //   trackError(context);
  // }
}

/**
 * Sanitizes request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv', 'ssn'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Logs a warning with context
 */
export function logWarning(message: string, context?: Record<string, any>): void {
  const logContext = {
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    console.warn(JSON.stringify(logContext));
  } else {
    console.warn(`[WARN] ${message}`, context || '');
  }
}

/**
 * Logs an info message with context
 */
export function logInfo(message: string, context?: Record<string, any>): void {
  const logContext = {
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    console.info(JSON.stringify(logContext));
  } else {
    console.info(`[INFO] ${message}`, context || '');
  }
}
