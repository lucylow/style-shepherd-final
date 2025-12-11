/**
 * Cloudflare Environment Detection
 * Detects if code is running on Cloudflare Workers
 */

/**
 * Check if running on Cloudflare Workers
 */
export function isCloudflare(): boolean {
  // Check for Cloudflare-specific globals
  if (typeof caches !== 'undefined') {
    return true;
  }
  
  // Check for EdgeRuntime (Cloudflare Workers)
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
    return true;
  }
  
  // Check for Cloudflare-specific environment variables
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.CF_PAGES || process.env.CF_WORKERS) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get Cloudflare environment info
 */
export function getCloudflareInfo(): {
  isCloudflare: boolean;
  platform: 'cloudflare' | 'node' | 'unknown';
  runtime: 'workers' | 'pages' | 'node';
} {
  const isCF = isCloudflare();
  
  if (!isCF) {
    return {
      isCloudflare: false,
      platform: 'node',
      runtime: 'node',
    };
  }
  
  // Determine if Pages or Workers
  const isPages = typeof process !== 'undefined' && 
                  process.env && 
                  process.env.CF_PAGES === '1';
  
  return {
    isCloudflare: true,
    platform: 'cloudflare',
    runtime: isPages ? 'pages' : 'workers',
  };
}
