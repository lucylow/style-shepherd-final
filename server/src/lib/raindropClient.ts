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

