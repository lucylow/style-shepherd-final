/**
 * Simple in-memory cache with TTL.
 * Not distributed — good for demo caching.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry<any>>();

export function cacheSet<T>(key: string, value: T, ttlMs: number = 30_000): void {
  const expiresAt = Date.now() + ttlMs;
  CACHE.set(key, { value, expiresAt });
}

export function cacheGet<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheDelete(key: string): void {
  CACHE.delete(key);
}

export function cacheClear(): void {
  CACHE.clear();
}
