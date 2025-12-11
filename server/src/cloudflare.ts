/**
 * Cloudflare Workers Entry Point
 * Adapts Express routes to Cloudflare Workers fetch API
 */

import { createRouter } from './lib/cloudflare-router.js';
import { cloudflareEnv } from './config/cloudflare-env.js';

// Cloudflare Workers types
export interface Env {
  // KV Namespaces
  CACHE?: KVNamespace;
  STORAGE?: KVNamespace;
  
  // D1 Database
  DB?: D1Database;
  
  // R2 Buckets
  R2_STORAGE?: R2Bucket;
  
  // Environment variables
  NODE_ENV?: string;
  PORT?: string;
  [key: string]: any;
}

/**
 * Main fetch handler for Cloudflare Workers
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize Cloudflare-compatible environment
      const cfEnv = cloudflareEnv(env);
      
      // Initialize storage adapter with KV
      if (env.CACHE) {
        const { setStorageAdapter, getStorageAdapter } = await import('./lib/storage-adapter.js');
        const adapter = getStorageAdapter(env.CACHE);
        setStorageAdapter(adapter);
      }
      
      // Initialize Raindrop with KV
      const { initRaindrop } = await import('./lib/raindropClient.js');
      await initRaindrop(env.CACHE).catch((err: any) => {
        console.warn('Raindrop initialization error:', err);
      });
      
      // Create router with Cloudflare context
      const router = createRouter(cfEnv, env);
      
      // Handle request
      const response = await router.handle(request);
      
      // Add CORS headers
      return addCorsHeaders(response, request);
    } catch (error: any) {
      console.error('Cloudflare Worker error:', error);
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: error.message || 'Internal server error',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }
  },
};

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get('Origin');
  const headers = new Headers(response.headers);
  
  // Allow all origins (adjust as needed for production)
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
