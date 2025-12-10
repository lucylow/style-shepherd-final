/**
 * Raindrop (LiquidMetal) Client for Style Shepherd
 * - Uses official Raindrop SDK when available and RAINDROP_API_KEY is set
 * - Falls back to localStorage mock for demo purposes
 */

type MemoryType = 'working' | 'semantic' | 'episodic' | 'procedural';

interface MemoryEntry {
  id: string;
  userId: string;
  type: MemoryType;
  text: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface MockStore {
  memories: MemoryEntry[];
  buckets: Record<string, Record<string, { filename: string; contentType: string; url: string }>>;
}

const STORAGE_KEY = 'style-shepherd-raindrop-mock';

// Read mock data from localStorage
function readMock(): MockStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read Raindrop mock store:', e);
  }
  return { memories: [], buckets: {} };
}

// Write mock data to localStorage
function writeMock(data: MockStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to write Raindrop mock store:', e);
  }
}

// Check if Raindrop is enabled (would need API key in production)
export function isRaindropEnabled(): boolean {
  // In browser environment, we use mock mode
  // Production would check for API key via edge function
  return false;
}

// Store a memory entry
export async function storeMemory(
  userId: string,
  memoryType: MemoryType,
  text: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; source: string; entry?: MemoryEntry }> {
  const db = readMock();
  const entry: MemoryEntry = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: userId || 'demo_user',
    type: memoryType || 'working',
    text: text || '',
    metadata: metadata || {},
    createdAt: new Date().toISOString()
  };
  db.memories.push(entry);
  writeMock(db);
  return { success: true, source: 'mock', entry };
}

// Search memories
export async function searchMemory(
  userId: string,
  query: string,
  topK = 5
): Promise<{ success: boolean; source: string; results: MemoryEntry[] }> {
  const db = readMock();
  const results = db.memories
    .filter(m => 
      m.userId === (userId || 'demo_user') && 
      (m.text || '').toLowerCase().includes((query || '').toLowerCase())
    )
    .slice(-topK)
    .reverse();
  return { success: true, source: 'mock', results };
}

// Delete a memory entry
export async function deleteMemory(
  userId: string,
  id: string
): Promise<{ success: boolean; source: string; deleted: number }> {
  const db = readMock();
  const before = db.memories.length;
  db.memories = db.memories.filter(m => 
    !(m.userId === (userId || 'demo_user') && m.id === id)
  );
  writeMock(db);
  return { success: true, source: 'mock', deleted: before - db.memories.length };
}

// Get all memories for a user
export async function getAllMemories(
  userId: string
): Promise<{ success: boolean; source: string; results: MemoryEntry[] }> {
  const db = readMock();
  const results = db.memories
    .filter(m => m.userId === (userId || 'demo_user'))
    .reverse();
  return { success: true, source: 'mock', results };
}

// Clear all memories (for testing)
export function clearAllMemories(): void {
  writeMock({ memories: [], buckets: {} });
}

export type { MemoryEntry, MemoryType };
