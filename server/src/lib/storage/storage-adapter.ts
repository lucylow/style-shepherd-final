/**
 * Storage Adapter
 * Provides unified interface for file storage across Node.js and Cloudflare
 * - Node.js: Uses file system
 * - Cloudflare: Uses KV or R2 storage
 */

import { isCloudflare } from './cloudflare-detection.js';
import { CloudflareKVAdapter } from './cloudflare-kv.js';

export interface StorageAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string | null>;
  write(path: string, data: string): Promise<void>;
  delete(path: string): Promise<void>;
  readJSON<T = any>(path: string): Promise<T | null>;
  writeJSON(path: string, data: any): Promise<void>;
}

/**
 * Node.js file system adapter
 */
class NodeStorageAdapter implements StorageAdapter {
  private fs: any;
  private path: any;

  constructor() {
    // Dynamic import to avoid issues in Cloudflare
    // Use try-catch for environments where these aren't available
    try {
      this.fs = require('fs/promises');
      this.path = require('path');
    } catch (error) {
      // If require fails, we'll use in-memory fallback
      throw new Error('Node.js file system not available');
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async read(path: string): Promise<string | null> {
    try {
      const data = await this.fs.readFile(path, 'utf8');
      return data;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(path: string, data: string): Promise<void> {
    const dir = this.path.dirname(path);
    const dirExists = await this.exists(dir);
    if (!dirExists) {
      await this.fs.mkdir(dir, { recursive: true });
    }
    await this.fs.writeFile(path, data, 'utf8');
  }

  async delete(path: string): Promise<void> {
    try {
      await this.fs.unlink(path);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async readJSON<T = any>(path: string): Promise<T | null> {
    const data = await this.read(path);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async writeJSON(path: string, data: any): Promise<void> {
    await this.write(path, JSON.stringify(data, null, 2));
  }
}

/**
 * Cloudflare KV storage adapter
 */
class CloudflareStorageAdapter implements StorageAdapter {
  private kv: CloudflareKVAdapter;

  constructor(kv: KVNamespace) {
    this.kv = new CloudflareKVAdapter(kv);
  }

  async exists(path: string): Promise<boolean> {
    return await this.kv.exists(path);
  }

  async read(path: string): Promise<string | null> {
    return await this.kv.get(path);
  }

  async write(path: string, data: string): Promise<void> {
    await this.kv.set(path, data);
  }

  async delete(path: string): Promise<void> {
    await this.kv.del(path);
  }

  async readJSON<T = any>(path: string): Promise<T | null> {
    return await this.kv.getJSON<T>(path);
  }

  async writeJSON(path: string, data: any): Promise<void> {
    await this.kv.setJSON(path, data);
  }
}

/**
 * Get storage adapter based on environment
 */
export function getStorageAdapter(kv?: KVNamespace): StorageAdapter {
  if (isCloudflare() && kv) {
    return new CloudflareStorageAdapter(kv);
  }
  // Try to use Node.js adapter, but handle gracefully if not available
  try {
    return new NodeStorageAdapter();
  } catch (error) {
    // Fallback to in-memory adapter if Node.js APIs not available
    return new InMemoryStorageAdapter();
  }
}

/**
 * In-memory storage adapter (fallback)
 */
class InMemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  async exists(path: string): Promise<boolean> {
    return this.storage.has(path);
  }

  async read(path: string): Promise<string | null> {
    return this.storage.get(path) || null;
  }

  async write(path: string, data: string): Promise<void> {
    this.storage.set(path, data);
  }

  async delete(path: string): Promise<void> {
    this.storage.delete(path);
  }

  async readJSON<T = any>(path: string): Promise<T | null> {
    const data = await this.read(path);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async writeJSON(path: string, data: any): Promise<void> {
    await this.write(path, JSON.stringify(data, null, 2));
  }
}

/**
 * Global storage instance (set after initialization)
 */
let storageInstance: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  storageInstance = adapter;
}

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    throw new Error('Storage adapter not initialized. Call setStorageAdapter() first.');
  }
  return storageInstance;
}
