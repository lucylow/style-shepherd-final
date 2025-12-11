/**
 * Vultr Integration Utilities
 * Helper functions for Vultr service integration
 */

import { vultrPostgres } from '../vultr-postgres.js';
import { vultrValkey } from '../vultr-valkey.js';
import { callVultrInference } from '../clients/vultrClient.js';

export interface VultrHealthStatus {
  postgres: {
    status: string;
    latency?: number;
    error?: string;
  };
  valkey: {
    status: string;
    latency?: number;
    error?: string;
  };
  inference: {
    status: string;
    available: boolean;
    error?: string;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Comprehensive health check for all Vultr services
 */
export async function checkVultrHealth(): Promise<VultrHealthStatus> {
  const health: VultrHealthStatus = {
    postgres: { status: 'unknown' },
    valkey: { status: 'unknown' },
    inference: { status: 'unknown', available: false },
    overall: 'unhealthy',
  };

  // Check PostgreSQL
  try {
    const pgHealth = await vultrPostgres.healthCheck();
    health.postgres = pgHealth;
  } catch (error: any) {
    health.postgres = {
      status: 'unhealthy',
      error: error.message || 'Unknown error',
    };
  }

  // Check Valkey
  try {
    const valkeyHealth = await vultrValkey.healthCheck();
    health.valkey = valkeyHealth;
  } catch (error: any) {
    health.valkey = {
      status: 'unhealthy',
      error: error.message || 'Unknown error',
    };
  }

  // Check Inference API (lightweight test)
  try {
    const testResponse = await callVultrInference({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      timeoutMs: 5000,
      maxTokens: 5,
    });
    health.inference = {
      status: testResponse.success ? 'healthy' : 'unhealthy',
      available: testResponse.success,
      error: testResponse.error,
    };
  } catch (error: any) {
    health.inference = {
      status: 'unhealthy',
      available: false,
      error: error.message || 'Unknown error',
    };
  }

  // Determine overall status
  const allHealthy = 
    health.postgres.status === 'healthy' &&
    health.valkey.status === 'healthy' &&
    health.inference.available;

  const anyHealthy = 
    health.postgres.status === 'healthy' ||
    health.valkey.status === 'healthy' ||
    health.inference.available;

  if (allHealthy) {
    health.overall = 'healthy';
  } else if (anyHealthy) {
    health.overall = 'degraded';
  } else {
    health.overall = 'unhealthy';
  }

  return health;
}

/**
 * Get connection statistics for all Vultr services
 */
export async function getVultrStats(): Promise<{
  postgres: {
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  valkey: {
    status: string;
    connected: boolean;
  };
}> {
  const [pgStats, valkeyStats] = await Promise.all([
    Promise.resolve(vultrPostgres.getPoolStats()),
    Promise.resolve(vultrValkey.getConnectionStats()),
  ]);

  return {
    postgres: pgStats,
    valkey: valkeyStats,
  };
}

/**
 * Test Vultr services with a simple operation
 */
export async function testVultrServices(): Promise<{
  postgres: boolean;
  valkey: boolean;
  inference: boolean;
}> {
  const results = {
    postgres: false,
    valkey: false,
    inference: false,
  };

  // Test PostgreSQL
  try {
    await vultrPostgres.query('SELECT 1');
    results.postgres = true;
  } catch {
    results.postgres = false;
  }

  // Test Valkey
  try {
    const testKey = `test:${Date.now()}`;
    await vultrValkey.set(testKey, 'test', 10);
    const value = await vultrValkey.get(testKey);
    await vultrValkey.delete(testKey);
    results.valkey = value === 'test';
  } catch {
    results.valkey = false;
  }

  // Test Inference
  try {
    const response = await callVultrInference({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "OK"' }],
      timeoutMs: 5000,
      maxTokens: 5,
    });
    results.inference = response.success;
  } catch {
    results.inference = false;
  }

  return results;
}

/**
 * Cache helper with automatic TTL management
 */
export class VultrCacheHelper {
  /**
   * Get or compute value with caching
   */
  static async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    const cached = await vultrValkey.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await computeFn();

    // Cache it
    await vultrValkey.set(key, value, ttl).catch(() => {
      // Ignore cache errors, return computed value anyway
    });

    return value;
  }

  /**
   * Invalidate cache pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await vultrValkey.keys(pattern);
      if (keys.length === 0) return 0;
      
      const deleted = await vultrValkey.mdelete(keys);
      return deleted;
    } catch {
      return 0;
    }
  }

  /**
   * Cache with tags for easier invalidation
   */
  static async setWithTags(
    key: string,
    value: any,
    tags: string[],
    ttl: number = 3600
  ): Promise<void> {
    // Store the value
    await vultrValkey.set(key, value, ttl);

    // Store tag mappings
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const existing = await vultrValkey.get<string[]>(tagKey) || [];
      if (!existing.includes(key)) {
        existing.push(key);
        await vultrValkey.set(tagKey, existing, ttl);
      }
    }
  }

  /**
   * Invalidate by tag
   */
  static async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await vultrValkey.get<string[]>(tagKey) || [];
      
      if (keys.length === 0) return 0;

      // Delete all keys with this tag
      const deleted = await vultrValkey.mdelete(keys);
      
      // Delete the tag mapping
      await vultrValkey.delete(tagKey);
      
      return deleted;
    } catch {
      return 0;
    }
  }
}
