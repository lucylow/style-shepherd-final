/**
 * Plain-JS Raindrop wrapper with safe mock fallback
 * - auto-init SDK if RAINDROP_API_KEY is present and SDK is installed
 * - otherwise writes to data/raindrop-mock.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getRaindropKey } from './keysValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_ROOT = join(__dirname, '..', '..');
const MOCK_FILE = join(SERVER_ROOT, '..', 'data', 'raindrop-mock.json');

let raindropClient: any = null;
let raindropEnabled = false;

interface MemoryEntry {
  id: string;
  userId: string;
  type: string;
  text: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface MockDatabase {
  memories: MemoryEntry[];
  buckets: Record<string, any>;
}

function ensureMockFile(): void {
  const dir = dirname(MOCK_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(MOCK_FILE)) {
    writeFileSync(
      MOCK_FILE,
      JSON.stringify({ memories: [], buckets: {} }, null, 2)
    );
  }
}

function readMock(): MockDatabase {
  try {
    ensureMockFile();
    return JSON.parse(readFileSync(MOCK_FILE, 'utf8'));
  } catch (e) {
    ensureMockFile();
    return { memories: [], buckets: {} };
  }
}

function writeMock(db: MockDatabase): void {
  writeFileSync(MOCK_FILE, JSON.stringify(db, null, 2));
}

async function tryLoadSdk(): Promise<any> {
  try {
    const mod = await import('raindrop');
    return mod.default || mod;
  } catch (e1) {
    // Try alternative package name
    try {
      const mod = await import('@liquidmetal-ai/raindrop');
      return mod.default || mod;
    } catch (e2) {
      return null;
    }
  }
}

export async function initRaindrop(): Promise<void> {
  const found = getRaindropKey();
  if (!found) {
    raindropEnabled = false;
    ensureMockFile();
    console.log('Raindrop: No API key found, using mock mode');
    return;
  }

  const RaindropCtor = await tryLoadSdk();
  if (!RaindropCtor) {
    raindropEnabled = false;
    ensureMockFile();
    console.log('Raindrop: SDK not installed, using mock mode');
    return;
  }

  try {
    raindropClient = new RaindropCtor({ apiKey: found.key });
    raindropEnabled = true;
    console.log('Raindrop client initialized (live mode).');
  } catch (err) {
    raindropEnabled = false;
    console.warn(
      'Raindrop init failed, using mock:',
      err && (err as Error).message ? (err as Error).message : err
    );
    ensureMockFile();
  }
}

interface StoreMemoryResponse {
  success: boolean;
  source: 'raindrop' | 'mock';
  resp?: any;
  entry?: MemoryEntry;
}

export async function storeMemory(
  userId: string = 'demo_user',
  type: string = 'working',
  text: string = '',
  metadata: Record<string, any> = {}
): Promise<StoreMemoryResponse> {
  if (raindropEnabled && raindropClient) {
    try {
      if (typeof raindropClient.smartMemory?.create === 'function') {
        const resp = await raindropClient.smartMemory.create({
          userId,
          type,
          text,
          metadata
        });
        return { success: true, source: 'raindrop', resp };
      }
    } catch (e) {
      console.warn('Raindrop SDK error on storeMemory — falling back to mock', e);
    }
  }

  // Mock path
  const db = readMock();
  const entry: MemoryEntry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    type,
    text,
    metadata,
    createdAt: new Date().toISOString()
  };
  db.memories.push(entry);
  writeMock(db);
  return { success: true, source: 'mock', entry };
}

interface SearchMemoryResponse {
  success: boolean;
  source: 'raindrop' | 'mock';
  resp?: any;
  results?: MemoryEntry[];
}

export async function searchMemory(
  userId: string = 'demo_user',
  q: string = '',
  topK: number = 5
): Promise<SearchMemoryResponse> {
  if (raindropEnabled && raindropClient) {
    try {
      if (typeof raindropClient.smartMemory?.search === 'function') {
        const resp = await raindropClient.smartMemory.search({
          userId,
          q,
          topK
        });
        return { success: true, source: 'raindrop', resp };
      }
    } catch (e) {
      console.warn('Raindrop SDK search error — falling back to mock', e);
    }
  }

  const db = readMock();
  const results = db.memories
    .filter(
      m =>
        m.userId === userId &&
        (m.text || '').toLowerCase().includes((q || '').toLowerCase())
    )
    .slice(-topK)
    .reverse();
  return { success: true, source: 'mock', results };
}

interface DeleteMemoryResponse {
  success: boolean;
  source: 'raindrop' | 'mock';
  resp?: any;
  deleted?: number;
}

export async function deleteMemory(
  userId: string = 'demo_user',
  id: string
): Promise<DeleteMemoryResponse> {
  if (raindropEnabled && raindropClient) {
    try {
      if (typeof raindropClient.smartMemory?.delete === 'function') {
        const resp = await raindropClient.smartMemory.delete({ userId, id });
        return { success: true, source: 'raindrop', resp };
      }
    } catch (e) {
      console.warn('Raindrop SDK delete error — falling back to mock', e);
    }
  }

  const db = readMock();
  const before = db.memories.length;
  db.memories = db.memories.filter(
    m => !(m.userId === userId && m.id === id)
  );
  writeMock(db);
  return {
    success: true,
    source: 'mock',
    deleted: before - db.memories.length
  };
}

export function isEnabled(): boolean {
  return raindropEnabled;
}

interface UpdateMemoryResponse {
  success: boolean;
  source: 'raindrop' | 'mock';
  resp?: any;
  entry?: MemoryEntry;
}

/**
 * Update a memory entry
 * Note: Raindrop SDK may not support direct updates, so we delete and recreate
 */
export async function updateMemory(
  userId: string = 'demo_user',
  id: string,
  text: string,
  type?: string,
  metadata?: Record<string, any>
): Promise<UpdateMemoryResponse> {
  if (raindropEnabled && raindropClient) {
    try {
      // Try to update if SDK supports it
      if (typeof raindropClient.smartMemory?.update === 'function') {
        const resp = await raindropClient.smartMemory.update({
          userId,
          id,
          text,
          type,
          metadata
        });
        return { success: true, source: 'raindrop', resp };
      }
      // Fallback: delete and recreate
      if (typeof raindropClient.smartMemory?.delete === 'function' && 
          typeof raindropClient.smartMemory?.create === 'function') {
        await raindropClient.smartMemory.delete({ userId, id });
        const resp = await raindropClient.smartMemory.create({
          userId,
          type: type || 'working',
          text,
          metadata: metadata || {}
        });
        return { success: true, source: 'raindrop', resp };
      }
    } catch (e) {
      console.warn('Raindrop SDK update error — falling back to mock', e);
    }
  }

  // Mock path
  const db = readMock();
  const index = db.memories.findIndex(
    m => m.userId === userId && m.id === id
  );
  
  if (index === -1) {
    return { success: false, source: 'mock' };
  }

  db.memories[index] = {
    ...db.memories[index],
    text: text || db.memories[index].text,
    type: type || db.memories[index].type,
    metadata: metadata !== undefined ? metadata : db.memories[index].metadata,
  };
  writeMock(db);
  return { success: true, source: 'mock', entry: db.memories[index] };
}

/**
 * Batch store multiple memories
 */
export async function batchStoreMemory(
  memories: Array<{
    userId: string;
    type: string;
    text: string;
    metadata?: Record<string, any>;
  }>
): Promise<Array<{ success: boolean; source: 'raindrop' | 'mock'; id?: string; error?: string }>> {
  const results = [];
  
  if (raindropEnabled && raindropClient) {
    try {
      if (typeof raindropClient.smartMemory?.batchCreate === 'function') {
        const resp = await raindropClient.smartMemory.batchCreate({ memories });
        return memories.map((_, idx) => ({
          success: true,
          source: 'raindrop' as const,
          id: resp?.results?.[idx]?.id,
        }));
      }
    } catch (e) {
      console.warn('Raindrop SDK batch error — falling back to mock', e);
    }
  }

  // Mock path - store sequentially
  const db = readMock();
  for (const { userId, type, text, metadata = {} } of memories) {
    try {
      const entry: MemoryEntry = {
        id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        type,
        text,
        metadata,
        createdAt: new Date().toISOString()
      };
      db.memories.push(entry);
      results.push({ success: true, source: 'mock' as const, id: entry.id });
    } catch (error: any) {
      results.push({
        success: false,
        source: 'mock' as const,
        error: error.message,
      });
    }
  }
  writeMock(db);
  return results;
}

/**
 * Get memory statistics for a user
 */
export async function getMemoryStats(userId: string = 'demo_user'): Promise<{
  total: number;
  byType: Record<string, number>;
  oldest: string | null;
  newest: string | null;
}> {
  const db = readMock();
  const userMemories = db.memories.filter(m => m.userId === userId);
  
  const byType: Record<string, number> = {};
  let oldest: string | null = null;
  let newest: string | null = null;

  for (const mem of userMemories) {
    byType[mem.type] = (byType[mem.type] || 0) + 1;
    if (!oldest || mem.createdAt < oldest) oldest = mem.createdAt;
    if (!newest || mem.createdAt > newest) newest = mem.createdAt;
  }

  return {
    total: userMemories.length,
    byType,
    oldest,
    newest,
  };
}

