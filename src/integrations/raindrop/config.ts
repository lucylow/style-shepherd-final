/**
 * Raindrop SDK Configuration
 * 
 * This module sets up the Raindrop SDK and initializes all four Smart Components:
 * - SmartMemory: User profiles and context
 * - SmartBuckets: Product images and visual search
 * - SmartSQL: Structured data (orders, catalog, returns)
 * - SmartInference: AI recommendations and intent analysis
 * 
 * Uses the official @liquidmetal-ai/raindrop SDK with fallback to custom implementation
 */

// Raindrop SDK Configuration
export interface RaindropConfig {
  apiKey: string;
  projectId: string;
  baseUrl?: string;
}

// Lazy load official SDK
let officialSDKModule: any = null;
let officialSDKLoaded = false;

async function loadOfficialSDK() {
  if (officialSDKLoaded) return officialSDKModule;
  
  try {
    const module = await import('@liquidmetal-ai/raindrop');
    officialSDKModule = module.RaindropSDK || module.default || module;
    officialSDKLoaded = true;
    return officialSDKModule;
  } catch (error) {
    officialSDKLoaded = true; // Mark as loaded to avoid repeated attempts
    console.warn('[Raindrop Config] Official SDK not available, using custom implementation');
    return null;
  }
}

// Initialize Raindrop SDK - uses official SDK if available, otherwise custom
class RaindropSDK {
  private config: RaindropConfig;
  private sdk: any = null;
  private sdkInitialized = false;

  constructor(config: RaindropConfig) {
    this.config = config;
  }

  private async initializeSDK() {
    if (this.sdkInitialized) return;
    
    const OfficialSDK = await loadOfficialSDK();
    if (OfficialSDK) {
      try {
        this.sdk = new OfficialSDK({
          apiKey: this.config.apiKey,
          projectId: this.config.projectId,
          baseUrl: this.config.baseUrl || 'https://platform.raindrop.ai',
        });
      } catch (error) {
        console.warn('[Raindrop Config] Failed to initialize official SDK, using custom implementation:', error);
      }
    }
    this.sdkInitialized = true;
  }

  async smartMemory(namespace: string) {
    await this.initializeSDK();
    if (this.sdk?.smartMemory) {
      return this.sdk.smartMemory(namespace);
    }
    return new SmartMemoryClient(this.config, namespace);
  }

  async smartBuckets(namespace: string) {
    await this.initializeSDK();
    if (this.sdk?.smartBuckets) {
      return this.sdk.smartBuckets(namespace);
    }
    return new SmartBucketsClient(this.config, namespace);
  }

  async smartSQL(namespace: string) {
    await this.initializeSDK();
    if (this.sdk?.smartSQL) {
      return this.sdk.smartSQL(namespace);
    }
    return new SmartSQLClient(this.config, namespace);
  }

  async smartInference(namespace: string) {
    await this.initializeSDK();
    if (this.sdk?.smartInference) {
      return this.sdk.smartInference(namespace);
    }
    return new SmartInferenceClient(this.config, namespace);
  }
}

// SmartMemory Client - Persistent user context & preferences
class SmartMemoryClient {
  constructor(
    private config: RaindropConfig,
    private namespace: string
  ) {}

  async set(key: string, value: any): Promise<void> {
    // Implementation: Store user profile, preferences, history
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/memory/${this.namespace}/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) throw new Error(`Failed to set memory: ${response.statusText}`);
  }

  async get(key: string): Promise<any> {
    // Implementation: Retrieve user profile, preferences, history
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/memory/${this.namespace}/${key}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get memory: ${response.statusText}`);
    }
    const data = await response.json();
    return data.value;
  }

  async append(key: string, value: any): Promise<void> {
    // Implementation: Append to conversation history or logs
    const existing = await this.get(key) || [];
    const updated = Array.isArray(existing) ? [...existing, { ...value, timestamp: Date.now() }] : [value];
    await this.set(key, updated);
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/memory/${this.namespace}/${key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete memory: ${response.statusText}`);
    }
  }
}

// SmartBuckets Client - Scalable media storage for product images
class SmartBucketsClient {
  constructor(
    private config: RaindropConfig,
    private namespace: string
  ) {}

  async upload(path: string, file: Blob | Buffer | ArrayBuffer, metadata?: Record<string, any>): Promise<string> {
    // Implementation: Upload product images with metadata
    const formData = new FormData();
    const blob = file instanceof Blob ? file : new Blob([new Uint8Array(file as ArrayBuffer)]);
    formData.append('file', blob);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/buckets/${this.namespace}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error(`Failed to upload: ${response.statusText}`);
    const data = await response.json();
    return data.url;
  }

  async findSimilar(imageUrl: string, options?: { limit?: number; category?: string }): Promise<any[]> {
    // Implementation: Visual search for similar products
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/buckets/${this.namespace}/similar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, ...options }),
    });
    if (!response.ok) throw new Error(`Failed to find similar: ${response.statusText}`);
    const data = await response.json();
    return data.results || [];
  }

  async getUrl(path: string): Promise<string> {
    // Implementation: Get CDN URL for product images
    return `${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/buckets/${this.namespace}/${path}`;
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/buckets/${this.namespace}/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }
  }
}

// SmartSQL Client - Flexible, queryable database
class SmartSQLClient {
  constructor(
    private config: RaindropConfig,
    private namespace: string
  ) {}

  async insert(table: string, data: Record<string, any>): Promise<void> {
    // Implementation: Insert structured order, catalog, returns data
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/sql/${this.namespace}/${table}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to insert: ${response.statusText}`);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    // Implementation: Query orders, catalog, returns using SQL or natural language
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/sql/${this.namespace}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });
    if (!response.ok) throw new Error(`Failed to query: ${response.statusText}`);
    const data = await response.json();
    return data.rows || [];
  }

  async update(table: string, id: string | number, data: Record<string, any>): Promise<void> {
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/sql/${this.namespace}/${table}/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to update: ${response.statusText}`);
  }

  async delete(table: string, id: string | number): Promise<void> {
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/sql/${this.namespace}/${table}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }
  }
}

// SmartInference Client - Fast inference for AI tasks
class SmartInferenceClient {
  constructor(
    private config: RaindropConfig,
    private namespace: string
  ) {}

  async predict(input: Record<string, any>): Promise<any> {
    // Implementation: AI recommendations, intent analysis, style advice
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/inference/${this.namespace}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Failed to predict: ${response.statusText}`);
    return response.json();
  }

  async batchPredict(inputs: Record<string, any>[]): Promise<any[]> {
    const response = await fetch(`${this.config.baseUrl || 'https://platform.raindrop.ai'}/v1/inference/${this.namespace}/batch-predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs }),
    });
    if (!response.ok) throw new Error(`Failed to batch predict: ${response.statusText}`);
    const data = await response.json();
    return data.results || [];
  }
}

// Initialize Raindrop SDK with environment variables
import { getRaindropBaseUrl } from '@/lib/api-config';

const raindropConfig: RaindropConfig = {
  apiKey: import.meta.env.VITE_RAINDROP_API_KEY || '',
  projectId: import.meta.env.VITE_RAINDROP_PROJECT_ID || '',
  baseUrl: getRaindropBaseUrl(),
};

export const raindrop = new RaindropSDK(raindropConfig);

// Export Smart Component clients with lazy initialization
// These will use the official SDK if available, otherwise fallback to custom implementation
let _userMemory: any = null;
let _productBuckets: any = null;
let _orderSQL: any = null;
let _styleInference: any = null;

export async function getUserMemory() {
  if (!_userMemory) {
    _userMemory = await raindrop.smartMemory('user-profiles');
  }
  return _userMemory;
}

export async function getProductBuckets() {
  if (!_productBuckets) {
    _productBuckets = await raindrop.smartBuckets('product-images');
  }
  return _productBuckets;
}

export async function getOrderSQL() {
  if (!_orderSQL) {
    _orderSQL = await raindrop.smartSQL('orders');
  }
  return _orderSQL;
}

export async function getStyleInference() {
  if (!_styleInference) {
    _styleInference = await raindrop.smartInference('style-recommendations');
  }
  return _styleInference;
}

// Sync accessors for backwards compatibility (they'll initialize on first use)
export const userMemory = {
  set: async (key: string, value: any) => (await getUserMemory()).set(key, value),
  get: async (key: string) => (await getUserMemory()).get(key),
  append: async (key: string, value: any) => (await getUserMemory()).append(key, value),
  delete: async (key: string) => (await getUserMemory()).delete(key),
};

export const productBuckets = {
  upload: async (path: string, file: Blob | Buffer | ArrayBuffer, metadata?: Record<string, any>) => 
    (await getProductBuckets()).upload(path, file, metadata),
  findSimilar: async (imageUrl: string, options?: { limit?: number; category?: string }) => 
    (await getProductBuckets()).findSimilar(imageUrl, options),
  getUrl: async (path: string) => (await getProductBuckets()).getUrl(path),
  delete: async (path: string) => (await getProductBuckets()).delete(path),
};

export const orderSQL = {
  insert: async (table: string, data: Record<string, any>) => (await getOrderSQL()).insert(table, data),
  query: async (sql: string, params?: any[]) => (await getOrderSQL()).query(sql, params),
  update: async (table: string, id: string | number, data: Record<string, any>) => 
    (await getOrderSQL()).update(table, id, data),
  delete: async (table: string, id: string | number) => (await getOrderSQL()).delete(table, id),
};

export const styleInference = {
  predict: async (input: Record<string, any>) => (await getStyleInference()).predict(input),
  batchPredict: async (inputs: Record<string, any>[]) => (await getStyleInference()).batchPredict(inputs),
};

