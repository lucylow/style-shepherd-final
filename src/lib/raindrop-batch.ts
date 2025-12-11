/**
 * Raindrop Batch Request Utilities
 * Provides request batching and caching for Raindrop API calls
 */

import { getApiBaseUrl } from './api-config';
import { localCache } from './vultr-batch';

interface MemoryEntry {
  userId: string;
  type: string;
  text: string;
  metadata?: Record<string, any>;
}

/**
 * Batch store multiple memories efficiently
 */
export async function batchStoreMemories(
  memories: MemoryEntry[]
): Promise<Array<{ success: boolean; id?: string; error?: string }>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/raindrop/batch-store-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memories }),
    });

    if (!response.ok) {
      throw new Error(`Batch store failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error('Batch store memories error:', error);
    throw error;
  }
}

/**
 * Get memory statistics with caching
 */
export async function getMemoryStats(
  userId: string,
  useCache: boolean = true
): Promise<{
  total: number;
  byType: Record<string, number>;
  oldest: string | null;
  newest: string | null;
}> {
  const cacheKey = `raindrop:stats:${userId}`;

  if (useCache) {
    const cached = localCache.get<typeof stats>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/raindrop/memory-stats?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get memory stats: ${response.statusText}`);
    }

    const data = await response.json();
    const stats = data.stats;

    // Cache for 5 minutes
    if (useCache) {
      localCache.set(cacheKey, stats, 5 * 60 * 1000);
    }

    return stats;
  } catch (error: any) {
    console.error('Get memory stats error:', error);
    throw error;
  }
}

/**
 * Search memories with caching and debouncing
 */
let searchTimeout: NodeJS.Timeout | null = null;

export async function searchMemories(
  userId: string,
  query: string,
  topK: number = 20,
  debounceMs: number = 300
): Promise<Array<{
  id: string;
  userId: string;
  type: string;
  text: string;
  metadata: Record<string, any>;
  createdAt: string;
}>> {
  return new Promise((resolve, reject) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(async () => {
      try {
        const cacheKey = `raindrop:search:${userId}:${query}:${topK}`;
        const cached = localCache.get<typeof results>(cacheKey);
        
        if (cached !== null) {
          resolve(cached);
          return;
        }

        const response = await fetch(`${getApiBaseUrl()}/raindrop/search-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, q: query, topK }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results || [];

        // Cache for 2 minutes
        localCache.set(cacheKey, results, 2 * 60 * 1000);

        resolve(results);
      } catch (error) {
        reject(error);
      }
    }, debounceMs);
  });
}
