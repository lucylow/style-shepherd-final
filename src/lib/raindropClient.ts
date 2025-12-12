/**
 * Raindrop (LiquidMetal) Client for Style Shepherd
 * - Uses real Raindrop Platform API when RAINDROP_API_KEY is set
 * - Makes actual API calls to platform.raindrop.ai
 */

import { getRaindropBaseUrl } from './api-config';

type MemoryType = 'working' | 'semantic' | 'episodic' | 'procedural';

interface MemoryEntry {
  id: string;
  userId: string;
  type: MemoryType;
  text: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Get Raindrop API configuration
function getApiKey(): string {
  return import.meta.env.VITE_RAINDROP_API_KEY || '';
}

function getProjectId(): string {
  return import.meta.env.VITE_RAINDROP_PROJECT_ID || '';
}

function getBaseUrl(): string {
  return getRaindropBaseUrl();
}

// Check if Raindrop is enabled
export function isRaindropEnabled(): boolean {
  return !!import.meta.env.VITE_RAINDROP_API_KEY;
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const projectId = getProjectId();
  const baseUrl = getBaseUrl();

  if (!apiKey || !projectId) {
    throw new Error('Raindrop API key and project ID are required');
  }

  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Project-Id': projectId,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Raindrop API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Store a memory entry
export async function storeMemory(
  userId: string,
  memoryType: MemoryType,
  text: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; source: string; entry?: MemoryEntry }> {
  try {
    const response = await apiCall<{ id: string; createdAt: string }>('/v1/memory/store', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        type: memoryType,
        text,
        metadata: metadata || {},
      }),
    });

    const entry: MemoryEntry = {
      id: response.id,
      userId,
      type: memoryType,
      text,
      metadata: metadata || {},
      createdAt: response.createdAt || new Date().toISOString(),
    };

    return { success: true, source: 'raindrop', entry };
  } catch (error) {
    console.error('Failed to store memory:', error);
    throw error;
  }
}

// Search memories
export async function searchMemory(
  userId: string,
  query: string,
  topK = 5
): Promise<{ success: boolean; source: string; results: MemoryEntry[] }> {
  try {
    const response = await apiCall<{ results: MemoryEntry[] }>('/v1/memory/search', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        query,
        topK,
      }),
    });

    return { success: true, source: 'raindrop', results: response.results || [] };
  } catch (error) {
    console.error('Failed to search memories:', error);
    throw error;
  }
}

// Update a memory entry
export async function updateMemory(
  userId: string,
  id: string,
  text: string,
  memoryType?: MemoryType,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; source: string; entry?: MemoryEntry }> {
  try {
    const response = await apiCall<MemoryEntry>(`/v1/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        userId,
        text,
        type: memoryType,
        metadata,
      }),
    });

    return { success: true, source: 'raindrop', entry: response };
  } catch (error) {
    console.error('Failed to update memory:', error);
    if (error instanceof Error && error.message.includes('404')) {
      return { success: false, source: 'raindrop' };
    }
    throw error;
  }
}

// Delete a memory entry
export async function deleteMemory(
  userId: string,
  id: string
): Promise<{ success: boolean; source: string; deleted: number }> {
  try {
    await apiCall(`/v1/memory/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });

    return { success: true, source: 'raindrop', deleted: 1 };
  } catch (error) {
    console.error('Failed to delete memory:', error);
    if (error instanceof Error && error.message.includes('404')) {
      return { success: false, source: 'raindrop', deleted: 0 };
    }
    throw error;
  }
}

// Get all memories for a user
export async function getAllMemories(
  userId: string
): Promise<{ success: boolean; source: string; results: MemoryEntry[] }> {
  try {
    const response = await apiCall<{ results: MemoryEntry[] }>('/v1/memory/list', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    return { success: true, source: 'raindrop', results: response.results || [] };
  } catch (error) {
    console.error('Failed to get all memories:', error);
    throw error;
  }
}

// Clear all memories (for testing)
export async function clearAllMemories(): Promise<void> {
  // Note: This endpoint may not exist in the actual API
  // If not available, this would need to be implemented differently
  try {
    await apiCall('/v1/memory/clear', {
      method: 'DELETE',
    });
  } catch (error) {
    console.warn('Clear all memories endpoint may not be available:', error);
    throw error;
  }
}

export type { MemoryEntry, MemoryType };
