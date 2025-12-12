/**
 * Cloudflare Router
 * Converts Express-style routes to Cloudflare Workers fetch handlers
 */

import { cloudflareEnv } from '../config/cloudflare-env.js';

// Simple router implementation for Cloudflare Workers
export class CloudflareRouter {
  private routes: Array<{
    method: string;
    path: string;
    pattern: RegExp;
    handler: (req: Request, env: any, params: Record<string, string>) => Promise<Response>;
  }> = [];

  /**
   * Register a route
   */
  register(
    method: string,
    path: string,
    handler: (req: Request, env: any, params: Record<string, string>) => Promise<Response>
  ) {
    // Convert Express-style path to regex
    const pattern = this.pathToRegex(path);
    this.routes.push({ method, path, pattern, handler });
  }

  /**
   * Handle a request
   */
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') {
        continue;
      }

      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        const paramNames = this.extractParamNames(route.path);
        
        paramNames.forEach((name, index) => {
          params[name] = match[index + 1] || '';
        });

        try {
          return await route.handler(request, {}, params);
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'ROUTE_ERROR',
                message: error.message || 'Route handler error',
                statusCode: 500,
                timestamp: new Date().toISOString(),
              },
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // 404 Not Found
    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Convert Express path pattern to regex
   */
  private pathToRegex(path: string): RegExp {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '([^/]+)')
      .replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameter names from path
   */
  private extractParamNames(path: string): string[] {
    const matches = path.matchAll(/:(\w+)/g);
    return Array.from(matches, (m) => m[1]);
  }
}

/**
 * Create router with all routes registered
 */
export function createRouter(cfEnv: any, env: any): CloudflareRouter {
  const router = new CloudflareRouter();

  // Health check
  router.register('GET', '/health', async (req) => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        platform: 'cloudflare',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  // API routes - import and register Express routes
  // Note: We'll need to adapt Express route handlers to work with fetch API
  registerApiRoutes(router, cfEnv, env);

  return router;
}

/**
 * Register API routes
 * This function imports and adapts Express routes to Cloudflare Workers
 */
async function registerApiRoutes(router: CloudflareRouter, cfEnv: any, env: any) {
  // Import route modules dynamically
  // For now, we'll create simplified versions
  
  // Example: Health check endpoint
  router.register('GET', '/api/health', async (req) => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        platform: 'cloudflare',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  // Add more routes as needed
  // Each Express route needs to be adapted to work with Request/Response
}
