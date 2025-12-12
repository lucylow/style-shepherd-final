/**
 * Response Wrapper Middleware
 * 
 * Wraps all API responses in a consistent ApiResponse format
 */

import { Request, Response, NextFunction } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
    timestamp?: string;
  };
  requestId?: string;
  timestamp?: string;
}

/**
 * Middleware to wrap responses in ApiResponse format
 */
export function responseWrapper(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const requestId = (req as any).requestId || req.headers['x-request-id'] as string;

  // Override res.json to wrap responses
  res.json = function (body: any) {
    // If already wrapped in ApiResponse format, use as-is
    if (body && typeof body === 'object' && ('success' in body || 'error' in body)) {
      // Ensure requestId is set
      if (!body.requestId && requestId) {
        body.requestId = requestId;
      }
      if (!body.timestamp) {
        body.timestamp = new Date().toISOString();
      }
      return originalJson(body);
    }

    // Wrap successful response
    const wrapped: ApiResponse = {
      success: true,
      data: body,
      requestId,
      timestamp: new Date().toISOString(),
    };

    return originalJson(wrapped);
  };

  // Override res.send for non-JSON responses (but still wrap if it's JSON)
  res.send = function (body: any) {
    // Try to parse as JSON
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === 'object') {
          // If already wrapped, use as-is
          if ('success' in parsed || 'error' in parsed) {
            if (!parsed.requestId && requestId) {
              parsed.requestId = requestId;
            }
            if (!parsed.timestamp) {
              parsed.timestamp = new Date().toISOString();
            }
            return originalSend(JSON.stringify(parsed));
          }
          
          // Wrap it
          const wrapped: ApiResponse = {
            success: true,
            data: parsed,
            requestId,
            timestamp: new Date().toISOString(),
          };
          return originalSend(JSON.stringify(wrapped));
        }
      } catch {
        // Not JSON, send as-is
      }
    }
    
    return originalSend(body);
  };

  next();
}

/**
 * Helper function to send success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  const requestId = (res.req as any).requestId || res.req.headers['x-request-id'] as string;
  
  const response: ApiResponse<T> = {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Helper function to send error response
 */
export function sendError(
  res: Response,
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
  },
  statusCode?: number
) {
  const requestId = (res.req as any).requestId || res.req.headers['x-request-id'] as string;
  
  const response: ApiResponse = {
    success: false,
    error: {
      ...error,
      timestamp: new Date().toISOString(),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
  
  return res.status(statusCode || error.statusCode).json(response);
}
