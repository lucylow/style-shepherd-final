/**
 * React Hook for Vultr Valkey Integration
 * Provides easy access to Vultr Valkey caching operations with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { vultrValkey } from '@/integrations/vultr/valkey';
import type { SessionData } from '@/integrations/vultr/valkey';

interface UseVultrValkeyReturn {
  // Session Management
  setSession: (sessionId: string, sessionData: SessionData, ttl?: number) => Promise<boolean>;
  getSession: (sessionId: string) => Promise<SessionData | null>;
  updateSessionAccess: (sessionId: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  
  // Conversation Context
  cacheConversationContext: (
    userId: string,
    context: SessionData['conversationContext'],
    ttl?: number
  ) => Promise<boolean>;
  getConversationContext: (userId: string) => Promise<SessionData['conversationContext'] | null>;
  
  // Recommendations
  cacheRecommendations: (userId: string, recommendations: any[], ttl?: number) => Promise<boolean>;
  getCachedRecommendations: (userId: string) => Promise<any[] | null>;
  
  // Preferences
  cacheUserPreferences: (
    userId: string,
    preferences: Record<string, any>,
    ttl?: number
  ) => Promise<boolean>;
  getCachedPreferences: (userId: string) => Promise<Record<string, any> | null>;
  
  // Generic Cache
  set: <T>(key: string, value: T, ttl?: number) => Promise<boolean>;
  get: <T>(key: string) => Promise<T | null>;
  delete: (key: string) => Promise<boolean>;
  
  // Health & Metrics
  healthCheck: () => Promise<{ status: string; latency?: number }>;
  getMetrics: () => Promise<{
    hitRate?: number;
    missRate?: number;
    averageLatency?: number;
    totalRequests?: number;
  }>;
  
  // State
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useVultrValkey(): UseVultrValkeyReturn {
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
      console.error(`Vultr Valkey ${operationName} error:`, error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(async (
    sessionId: string,
    sessionData: SessionData,
    ttl: number = 86400
  ) => {
    return handleOperation(
      () => vultrValkey.setSession(sessionId, sessionData, ttl),
      'setSession'
    );
  }, [handleOperation]);

  const getSession = useCallback(async (sessionId: string) => {
    return handleOperation(
      () => vultrValkey.getSession(sessionId),
      'getSession'
    );
  }, [handleOperation]);

  const updateSessionAccess = useCallback(async (sessionId: string) => {
    return handleOperation(
      () => vultrValkey.updateSessionAccess(sessionId),
      'updateSessionAccess'
    );
  }, [handleOperation]);

  const deleteSession = useCallback(async (sessionId: string) => {
    return handleOperation(
      () => vultrValkey.deleteSession(sessionId),
      'deleteSession'
    );
  }, [handleOperation]);

  const cacheConversationContext = useCallback(async (
    userId: string,
    context: SessionData['conversationContext'],
    ttl: number = 3600
  ) => {
    return handleOperation(
      () => vultrValkey.cacheConversationContext(userId, context, ttl),
      'cacheConversationContext'
    );
  }, [handleOperation]);

  const getConversationContext = useCallback(async (userId: string) => {
    return handleOperation(
      () => vultrValkey.getConversationContext(userId),
      'getConversationContext'
    );
  }, [handleOperation]);

  const cacheRecommendations = useCallback(async (
    userId: string,
    recommendations: any[],
    ttl: number = 1800
  ) => {
    return handleOperation(
      () => vultrValkey.cacheRecommendations(userId, recommendations, ttl),
      'cacheRecommendations'
    );
  }, [handleOperation]);

  const getCachedRecommendations = useCallback(async (userId: string) => {
    return handleOperation(
      () => vultrValkey.getCachedRecommendations(userId),
      'getCachedRecommendations'
    );
  }, [handleOperation]);

  const cacheUserPreferences = useCallback(async (
    userId: string,
    preferences: Record<string, any>,
    ttl: number = 3600
  ) => {
    return handleOperation(
      () => vultrValkey.cacheUserPreferences(userId, preferences, ttl),
      'cacheUserPreferences'
    );
  }, [handleOperation]);

  const getCachedPreferences = useCallback(async (userId: string) => {
    return handleOperation(
      () => vultrValkey.getCachedPreferences(userId),
      'getCachedPreferences'
    );
  }, [handleOperation]);

  const set = useCallback(async <T,>(key: string, value: T, ttl?: number) => {
    return handleOperation(
      () => vultrValkey.set(key, value, ttl),
      'set'
    );
  }, [handleOperation]);

  const get = useCallback(async <T,>(key: string) => {
    return handleOperation(
      () => vultrValkey.get<T>(key),
      'get'
    );
  }, [handleOperation]);

  const deleteCache = useCallback(async (key: string) => {
    return handleOperation(
      () => vultrValkey.delete(key),
      'delete'
    );
  }, [handleOperation]);

  const healthCheck = useCallback(async () => {
    return handleOperation(
      () => vultrValkey.healthCheck(),
      'healthCheck'
    );
  }, [handleOperation]);

  const getMetrics = useCallback(async () => {
    return handleOperation(
      () => vultrValkey.getMetrics(),
      'getMetrics'
    );
  }, [handleOperation]);

  return {
    setSession,
    getSession,
    updateSessionAccess,
    deleteSession,
    cacheConversationContext,
    getConversationContext,
    cacheRecommendations,
    getCachedRecommendations,
    cacheUserPreferences,
    getCachedPreferences,
    set: set,
    get: get,
    delete: deleteCache,
    healthCheck,
    getMetrics,
    loading,
    error,
    clearError,
  };
}
