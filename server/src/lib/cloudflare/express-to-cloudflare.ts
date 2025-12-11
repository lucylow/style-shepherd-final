/**
 * Express to Cloudflare Adapter
 * Converts Express request/response to Cloudflare fetch API
 */

import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

/**
 * Convert Cloudflare Request to Express-like request object
 */
export function cloudflareToExpress(request: Request): ExpressRequest {
  const url = new URL(request.url);
  
  // Create a mock Express request
  const expressReq = {
    method: request.method,
    url: url.pathname + url.search,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers),
    body: null as any,
    params: {} as Record<string, string>,
    ip: request.headers.get('cf-connecting-ip') || 'unknown',
    protocol: url.protocol.slice(0, -1),
    hostname: url.hostname,
    get: (name: string) => request.headers.get(name),
  } as any;

  // Parse body if present
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Body will be parsed asynchronously
      (expressReq as any)._bodyPromise = request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      expressReq._bodyPromise = request.formData().then((fd) => {
        const body: Record<string, string> = {};
        fd.forEach((value, key) => {
          body[key] = value.toString();
        });
        return body;
      });
    } else {
      (expressReq as any)._bodyPromise = request.text();
    }
  }

  return expressReq;
}

/**
 * Convert Express response to Cloudflare Response
 */
export async function expressToCloudflare(
  expressRes: ExpressResponse,
  bodyPromise?: Promise<any>
): Promise<Response> {
  // Wait for body if needed
  let body: any = null;
  if (bodyPromise) {
    body = await bodyPromise;
  }

  // Get response body from Express response
  const responseBody = (expressRes as any)._body || body || expressRes.locals?.body;
  
  // Determine content type
  const contentType = expressRes.get('content-type') || 'application/json';
  
  // Convert body to appropriate format
  let responseBodyText: string | ReadableStream;
  if (typeof responseBody === 'string') {
    responseBodyText = responseBody;
  } else if (responseBody instanceof ReadableStream) {
    responseBodyText = responseBody;
  } else {
    responseBodyText = JSON.stringify(responseBody);
  }

  // Create Cloudflare Response
  return new Response(responseBodyText, {
    status: expressRes.statusCode || 200,
    statusText: expressRes.statusMessage || 'OK',
    headers: expressRes.getHeaders() as HeadersInit,
  });
}

/**
 * Wrap Express route handler for Cloudflare
 */
export function wrapExpressHandler(
  handler: (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => void | Promise<void>
) {
  return async (request: Request, env: any, params: Record<string, string>): Promise<Response> => {
    // Convert Cloudflare Request to Express-like request
    const expressReq = cloudflareToExpress(request);
    expressReq.params = params;

    // Create Express-like response
    const expressRes = {
      statusCode: 200,
      statusMessage: 'OK',
      _headers: {} as Record<string, string>,
      _body: null as any,
      locals: {} as Record<string, any>,
      
      status: function(code: number) {
        this.statusCode = code;
        return this;
      },
      
      json: function(body: any) {
        this._body = body;
        this.setHeader('Content-Type', 'application/json');
        return this;
      },
      
      send: function(body: any) {
        this._body = body;
        return this;
      },
      
      setHeader: function(name: string, value: string) {
        this._headers[name.toLowerCase()] = value;
        return this;
      },
      
      getHeader: function(name: string) {
        return this._headers[name.toLowerCase()];
      },
      
      get: function(name: string) {
        return this.getHeader(name);
      },
      
      set: function(name: string, value: string) {
        return this.setHeader(name, value);
      },
      
      getHeaders: function() {
        return { ...this._headers };
      },
    } as any;

    // Create next function
    const next = (error?: any) => {
      if (error) {
        throw error;
      }
    };

    try {
      // Wait for body if needed
      if ((expressReq as any)._bodyPromise) {
        expressReq.body = await (expressReq as any)._bodyPromise;
      }

      // Call Express handler
      await handler(expressReq, expressRes, next);

      // Convert to Cloudflare Response
      return await expressToCloudflare(expressRes, (expressReq as any)._bodyPromise);
    } catch (error: any) {
      // Error handling
      expressRes.statusCode = error.statusCode || 500;
      expressRes._body = {
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
          statusCode: expressRes.statusCode,
          timestamp: new Date().toISOString(),
        },
      };
      expressRes.setHeader('Content-Type', 'application/json');
      return await expressToCloudflare(expressRes);
    }
  };
}
