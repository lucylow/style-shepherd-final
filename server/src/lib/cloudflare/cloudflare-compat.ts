/**
 * Cloudflare Compatibility Layer
 * Provides Node.js API compatibility shims for Cloudflare Workers
 */

// Polyfill for process.env
if (typeof process === 'undefined') {
  (globalThis as any).process = {
    env: {},
    cwd: () => '/',
    exit: (code: number) => {
      throw new Error(`Process exit: ${code}`);
    },
    on: () => {},
    off: () => {},
  };
}

// Polyfill for Buffer (if needed)
if (typeof Buffer === 'undefined') {
  (globalThis as any).Buffer = {
    from: (data: any, encoding?: string) => {
      if (typeof data === 'string') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    isBuffer: (obj: any) => obj instanceof Uint8Array,
  };
}

// File system compatibility - use KV or R2 instead
export const cloudflareFS = {
  existsSync: (path: string): boolean => {
    // In Cloudflare, we can't check file existence synchronously
    // This should be replaced with async KV/R2 checks
    console.warn('existsSync called in Cloudflare environment - use async methods instead');
    return false;
  },
  
  readFileSync: (path: string): string => {
    throw new Error('readFileSync not available in Cloudflare - use KV or R2 storage');
  },
  
  writeFileSync: (path: string, data: string): void => {
    throw new Error('writeFileSync not available in Cloudflare - use KV or R2 storage');
  },
  
  mkdirSync: (path: string): void => {
    throw new Error('mkdirSync not available in Cloudflare - directories not supported');
  },
};

// Path compatibility
export const cloudflarePath = {
  join: (...paths: string[]): string => {
    return paths.filter(Boolean).join('/').replace(/\/+/g, '/');
  },
  
  dirname: (path: string): string => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },
  
  basename: (path: string): string => {
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  },
};

// URL compatibility
export const cloudflareURL = {
  fileURLToPath: (url: string): string => {
    if (url.startsWith('file://')) {
      return url.replace('file://', '');
    }
    return url;
  },
  
  pathToFileURL: (path: string): string => {
    return `file://${path}`;
  },
};
