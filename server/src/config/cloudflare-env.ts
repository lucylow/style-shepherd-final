/**
 * Cloudflare Environment Configuration
 * Adapts Cloudflare Workers env to application environment format
 */

export interface CloudflareEnv {
  NODE_ENV: string;
  PORT: string;
  DEMO_MODE: boolean;
  
  // Raindrop
  RAINDROP_API_KEY?: string;
  RAINDROP_PROJECT_ID?: string;
  RAINDROP_BASE_URL?: string;
  
  // Vultr Services
  VULTR_POSTGRES_HOST?: string;
  VULTR_POSTGRES_PORT?: number;
  VULTR_POSTGRES_DATABASE?: string;
  VULTR_POSTGRES_USER?: string;
  VULTR_POSTGRES_PASSWORD?: string;
  VULTR_POSTGRES_SSL?: boolean;
  
  VULTR_VALKEY_HOST?: string;
  VULTR_VALKEY_PORT?: number;
  VULTR_VALKEY_PASSWORD?: string;
  VULTR_VALKEY_TLS?: boolean;
  
  // API Keys
  ELEVENLABS_API_KEY?: string;
  OPENAI_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  WORKOS_API_KEY?: string;
  WORKOS_CLIENT_ID?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  
  // CORS
  CORS_ORIGIN: string;
  
  // Cloudflare-specific
  CACHE?: KVNamespace;
  DB?: D1Database;
  R2_STORAGE?: R2Bucket;
}

/**
 * Convert Cloudflare Workers env to application env format
 */
export function cloudflareEnv(env: any): CloudflareEnv {
  return {
    NODE_ENV: env.NODE_ENV || 'production',
    PORT: env.PORT || '8787',
    DEMO_MODE: env.DEMO_MODE === 'true',
    
    // Raindrop
    RAINDROP_API_KEY: env.RAINDROP_API_KEY,
    RAINDROP_PROJECT_ID: env.RAINDROP_PROJECT_ID,
    RAINDROP_BASE_URL: env.RAINDROP_BASE_URL,
    
    // Vultr Services
    VULTR_POSTGRES_HOST: env.VULTR_POSTGRES_HOST,
    VULTR_POSTGRES_PORT: env.VULTR_POSTGRES_PORT ? parseInt(env.VULTR_POSTGRES_PORT) : 5432,
    VULTR_POSTGRES_DATABASE: env.VULTR_POSTGRES_DATABASE,
    VULTR_POSTGRES_USER: env.VULTR_POSTGRES_USER,
    VULTR_POSTGRES_PASSWORD: env.VULTR_POSTGRES_PASSWORD,
    VULTR_POSTGRES_SSL: env.VULTR_POSTGRES_SSL === 'true',
    
    VULTR_VALKEY_HOST: env.VULTR_VALKEY_HOST,
    VULTR_VALKEY_PORT: env.VULTR_VALKEY_PORT ? parseInt(env.VULTR_VALKEY_PORT) : 6379,
    VULTR_VALKEY_PASSWORD: env.VULTR_VALKEY_PASSWORD,
    VULTR_VALKEY_TLS: env.VULTR_VALKEY_TLS === 'true',
    
    // API Keys
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    CEREBRAS_API_KEY: env.CEREBRAS_API_KEY,
    WORKOS_API_KEY: env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    
    // CORS
    CORS_ORIGIN: env.CORS_ORIGIN || '*',
    
    // Cloudflare-specific bindings
    CACHE: env.CACHE,
    DB: env.DB,
    R2_STORAGE: env.R2_STORAGE,
  };
}
