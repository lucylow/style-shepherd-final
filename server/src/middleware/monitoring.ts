/**
 * Monitoring Middleware
 * Automatically instruments HTTP routes with metrics and tracing
 */

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestSize,
  httpResponseSize,
  logger,
  errorsTotal,
} from '../lib/monitoring.js';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

/**
 * Middleware to instrument HTTP requests with metrics and tracing
 */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  
  // Add request ID to request object for use in handlers
  (req as any).requestId = requestId;

  // Get route pattern (normalize to avoid high cardinality)
  const route = normalizeRoute(req.path);
  const method = req.method;

  // Track request size
  const requestSize = req.headers['content-length'] 
    ? parseInt(req.headers['content-length'], 10) 
    : 0;

  if (requestSize > 0) {
    httpRequestSize.observe({ method, route }, requestSize);
  }

  // Create OpenTelemetry span
  const tracer = trace.getTracer('style-shepherd-http');
  const span = tracer.startSpan(`http.${method}.${route}`, {
    attributes: {
      'http.method': method,
      'http.route': route,
      'http.url': req.url,
      'http.user_agent': req.headers['user-agent'] || '',
      'http.request_id': requestId,
    },
  });

  // Store span in request for use in handlers
  (req as any).span = span;

  // Track response
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (body: any) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    // Track metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });

    // Track response size
    const responseSize = Buffer.byteLength(JSON.stringify(body || ''), 'utf8');
    httpResponseSize.observe({ method, route, status_code: statusCode.toString() }, responseSize);

    // Update span
    span.setAttributes({
      'http.status_code': statusCode,
      'http.response_size': responseSize,
      'http.duration_ms': duration * 1000,
    });

    if (statusCode >= 400) {
      span.setStatus({
        code: statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.UNSET,
        message: `HTTP ${statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();

    // Log request
    logger.info('http_request', {
      requestId,
      method,
      route,
      statusCode,
      durationMs: duration * 1000,
      requestSize,
      responseSize,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    });

    return originalSend.call(this, body);
  };

  res.json = function (body: any) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    // Track metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode.toString() });

    // Track response size
    const responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
    httpResponseSize.observe({ method, route, status_code: statusCode.toString() }, responseSize);

    // Update span
    span.setAttributes({
      'http.status_code': statusCode,
      'http.response_size': responseSize,
      'http.duration_ms': duration * 1000,
    });

    if (statusCode >= 400) {
      span.setStatus({
        code: statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.UNSET,
        message: `HTTP ${statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();

    // Log request
    logger.info('http_request', {
      requestId,
      method,
      route,
      statusCode,
      durationMs: duration * 1000,
      requestSize,
      responseSize,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    });

    return originalJson.call(this, body);
  };

  // Handle errors
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      errorsTotal.inc({
        error_type: 'http_error',
        error_code: res.statusCode.toString(),
        component: 'http_server',
      });
    }
  });

  next();
}

/**
 * Normalize route path to reduce cardinality
 * Converts /api/users/123 to /api/users/:id
 */
function normalizeRoute(path: string): string {
  // Remove query strings
  const pathWithoutQuery = path.split('?')[0];

  // Common patterns to normalize
  const patterns = [
    { regex: /\/api\/users\/[^/]+/g, replacement: '/api/users/:id' },
    { regex: /\/api\/products\/[^/]+/g, replacement: '/api/products/:id' },
    { regex: /\/api\/agents\/[^/]+/g, replacement: '/api/agents/:id' },
    { regex: /\/api\/conversations\/[^/]+/g, replacement: '/api/conversations/:id' },
    { regex: /\/api\/shopping\/[^/]+/g, replacement: '/api/shopping/:id' },
    { regex: /\/api\/workflows\/[^/]+/g, replacement: '/api/workflows/:id' },
    { regex: /\/api\/guardrails\/[^/]+/g, replacement: '/api/guardrails/:id' },
    { regex: /\/api\/errors\/[^/]+/g, replacement: '/api/errors/:id' },
    { regex: /\/api\/admin\/[^/]+/g, replacement: '/api/admin/:id' },
    { regex: /\/api\/personalize\/[^/]+/g, replacement: '/api/personalize/:id' },
    { regex: /\/api\/functions\/[^/]+/g, replacement: '/api/functions/:id' },
    // UUIDs
    { regex: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: ':uuid' },
    // Numeric IDs
    { regex: /\/\d+/g, replacement: '/:id' },
  ];

  let normalized = pathWithoutQuery;
  for (const pattern of patterns) {
    normalized = normalized.replace(pattern.regex, pattern.replacement);
  }

  return normalized;
}

/**
 * Middleware to add request context to OpenTelemetry spans
 */
export function contextMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = (req as any).span;
  if (span) {
    // Add user context if available
    const userId = (req as any).user?.id || req.headers['x-user-id'];
    if (userId) {
      span.setAttribute('user.id', userId);
    }

    // Add session context if available
    const sessionId = (req as any).session?.id || req.headers['x-session-id'];
    if (sessionId) {
      span.setAttribute('session.id', sessionId);
    }
  }

  next();
}
