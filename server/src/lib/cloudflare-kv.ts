/**
 * Cloudflare KV Adapter
 * Provides Redis-like interface using Cloudflare KV
 * Replaces Vultr Valkey for Cloudflare deployments
 */

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<void>;
}

/**
 * Cloudflare KV implementation
 */
export class CloudflareKVAdapter implements CacheAdapter {
  private kv: KVNamespace;
  private defaultTtl: number;

  constructor(kv: KVNamespace, defaultTtl: number = 3600) {
    this.kv = kv;
    this.defaultTtl = defaultTtl;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.kv.get(key);
    } catch (error: any) {
      console.error('KV get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const expirationTtl = ttl || this.defaultTtl;
      await this.kv.put(key, value, { expirationTtl });
    } catch (error: any) {
      console.error('KV set error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error: any) {
      console.error('KV delete error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.kv.get(key);
      return value !== null;
    } catch (error: any) {
      console.error('KV exists error:', error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    // KV doesn't support updating TTL directly
    // We need to get the value and set it again with new TTL
    try {
      const value = await this.kv.get(key);
      if (value !== null) {
        await this.kv.put(key, value, { expirationTtl: seconds });
      }
    } catch (error: any) {
      console.error('KV expire error:', error);
      throw error;
    }
  }

  // Additional helper methods
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}
