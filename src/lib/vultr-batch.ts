/**
 * Vultr Batch Request Utilities
 * Provides request batching and caching for Vultr API calls
 */

import { getApiBaseUrl } from './api-config';

interface BatchOperation {
  type: 'set' | 'get' | 'delete';
  key: string;
  value?: any;
  ttl?: number;
}

interface BatchResult {
  success: boolean;
  key: string;
  value?: any;
  error?: string;
}

/**
 * Batch multiple Valkey operations
 */
export async function batchValkeyOperations(
  operations: BatchOperation[]
): Promise<BatchResult[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/vultr/valkey/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });

    if (!response.ok) {
      throw new Error(`Batch operation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Batch Valkey operations error:', error);
    throw error;
  }
}

/**
 * Cache manager with automatic TTL and invalidation
 */
class CacheManager {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private defaultTTL: number = 3600000; // 1 hour

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }

  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const localCache = new CacheManager();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    localCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Cached fetch wrapper with automatic retry
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl?: number
): Promise<T> {
  // Check local cache first
  if (cacheKey) {
    const cached = localCache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch with retry logic
  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;

      // Cache the result
      if (cacheKey) {
        localCache.set(cacheKey, data, ttl);
      }

      return data;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.message?.includes('HTTP 4')) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed');
}
