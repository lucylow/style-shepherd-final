/**
 * React Hook for Vultr PostgreSQL Integration
 * Provides easy access to Vultr PostgreSQL operations with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { vultrPostgres } from '@/integrations/vultr/postgres';
import type { ProductRecord, UserProfileRecord, OrderRecord, ReturnRecord } from '@/integrations/vultr/postgres';

interface UseVultrPostgresReturn {
  // Products
  getProducts: (filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }) => Promise<ProductRecord[]>;
  
  // User Profile
  getUserProfile: (userId: string) => Promise<UserProfileRecord | null>;
  saveUserProfile: (userId: string, profile: Partial<UserProfileRecord>) => Promise<UserProfileRecord>;
  
  // Orders
  getOrderHistory: (userId: string, limit?: number) => Promise<OrderRecord[]>;
  createOrder: (order: Omit<OrderRecord, 'order_id' | 'created_at'>) => Promise<OrderRecord>;
  
  // Returns
  getReturnHistory: (userId?: string, productId?: string) => Promise<ReturnRecord[]>;
  recordReturn: (returnData: Omit<ReturnRecord, 'return_id' | 'created_at'>) => Promise<ReturnRecord>;
  
  // Health
  healthCheck: () => Promise<{ status: string; latency?: number }>;
  
  // State
  loading: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useVultrPostgres(): UseVultrPostgresReturn {
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
      console.error(`Vultr PostgreSQL ${operationName} error:`, error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProducts = useCallback(async (filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }) => {
    return handleOperation(
      () => vultrPostgres.getProducts(filters),
      'getProducts'
    );
  }, [handleOperation]);

  const getUserProfile = useCallback(async (userId: string) => {
    return handleOperation(
      () => vultrPostgres.getUserProfile(userId),
      'getUserProfile'
    );
  }, [handleOperation]);

  const saveUserProfile = useCallback(async (
    userId: string,
    profile: Partial<UserProfileRecord>
  ) => {
    return handleOperation(
      () => vultrPostgres.saveUserProfile(userId, profile),
      'saveUserProfile'
    );
  }, [handleOperation]);

  const getOrderHistory = useCallback(async (userId: string, limit: number = 50) => {
    return handleOperation(
      () => vultrPostgres.getOrderHistory(userId, limit),
      'getOrderHistory'
    );
  }, [handleOperation]);

  const createOrder = useCallback(async (order: Omit<OrderRecord, 'order_id' | 'created_at'>) => {
    return handleOperation(
      () => vultrPostgres.createOrder(order),
      'createOrder'
    );
  }, [handleOperation]);

  const getReturnHistory = useCallback(async (userId?: string, productId?: string) => {
    return handleOperation(
      () => vultrPostgres.getReturnHistory(userId, productId),
      'getReturnHistory'
    );
  }, [handleOperation]);

  const recordReturn = useCallback(async (returnData: Omit<ReturnRecord, 'return_id' | 'created_at'>) => {
    return handleOperation(
      () => vultrPostgres.recordReturn(returnData),
      'recordReturn'
    );
  }, [handleOperation]);

  const healthCheck = useCallback(async () => {
    return handleOperation(
      () => vultrPostgres.healthCheck(),
      'healthCheck'
    );
  }, [handleOperation]);

  return {
    getProducts,
    getUserProfile,
    saveUserProfile,
    getOrderHistory,
    createOrder,
    getReturnHistory,
    recordReturn,
    healthCheck,
    loading,
    error,
    clearError,
  };
}
