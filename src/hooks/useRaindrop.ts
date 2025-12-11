/**
 * React Hook for Raindrop Integration
 * Provides easy access to Raindrop Smart Components with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '@/lib/api-config';

interface MemoryEntry {
  id: string;
  userId: string;
  type: string;
  text: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface UseRaindropReturn {
  // Memory Operations
  storeMemory: (
    userId: string,
    type: string,
    text: string,
    metadata?: Record<string, any>
  ) => Promise<{ success: boolean; source: 'raindrop' | 'mock'; id?: string }>;
  
  searchMemory: (
    userId: string,
    query: string,
    topK?: number
  ) => Promise<{ success: boolean; source: 'raindrop' | 'mock'; results: MemoryEntry[] }>;
  
  deleteMemory: (
    userId: string,
    id: string
  ) => Promise<{ success: boolean; source: 'raindrop' | 'mock' }>;
  
  batchStoreMemory: (
    memories: Array<{
      userId: string;
      type: string;
      text: string;
      metadata?: Record<string, any>;
    }>
  ) => Promise<Array<{ success: boolean; source: 'raindrop' | 'mock'; id?: string; error?: string }>>;
  
  getMemoryStats: (
    userId: string
  ) => Promise<{
    total: number;
    byType: Record<string, number>;
    oldest: string | null;
    newest: string | null;
  }>;
  
  exportMemory: (userId: string) => Promise<Blob>;
  clearMemory: (userId: string) => Promise<{ success: boolean; deleted: number }>;
  
  // State
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useRaindrop(): UseRaindropReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleOperation = useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await operation();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Raindrop ${operationName} error:`, error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const storeMemory = useCallback(async (
    userId: string,
    type: string,
    text: string,
    metadata: Record<string, any> = {}
  ) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/store-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, text, metadata }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to store memory: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        source: data.source,
        id: data.entry?.id || data.resp?.id,
      };
    }, 'storeMemory');
  }, [handleOperation]);

  const searchMemory = useCallback(async (
    userId: string,
    query: string,
    topK: number = 20
  ) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/search-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, q: query, topK }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to search memory: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        source: data.source,
        results: data.results || [],
      };
    }, 'searchMemory');
  }, [handleOperation]);

  const deleteMemory = useCallback(async (userId: string, id: string) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/delete-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        source: data.source,
      };
    }, 'deleteMemory');
  }, [handleOperation]);

  const batchStoreMemory = useCallback(async (
    memories: Array<{
      userId: string;
      type: string;
      text: string;
      metadata?: Record<string, any>;
    }>
  ) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/batch-store-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to batch store memory: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    }, 'batchStoreMemory');
  }, [handleOperation]);

  const getMemoryStats = useCallback(async (userId: string) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/memory-stats?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get memory stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.stats;
    }, 'getMemoryStats');
  }, [handleOperation]);

  const exportMemory = useCallback(async (userId: string) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/export-memory?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to export memory: ${response.statusText}`);
      }
      
      return await response.blob();
    }, 'exportMemory');
  }, [handleOperation]);

  const clearMemory = useCallback(async (userId: string) => {
    return handleOperation(async () => {
      const response = await fetch(`${getApiBaseUrl()}/raindrop/clear-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear memory: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        success: data.success,
        deleted: data.deleted || 0,
      };
    }, 'clearMemory');
  }, [handleOperation]);

  return {
    storeMemory,
    searchMemory,
    deleteMemory,
    batchStoreMemory,
    getMemoryStats,
    exportMemory,
    clearMemory,
    loading,
    error,
    clearError,
  };
}
