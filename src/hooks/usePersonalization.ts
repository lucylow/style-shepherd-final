/**
 * usePersonalization Hook
 * React hook for fetching personalized recommendations
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface PersonalizedRecommendation {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  explanation?: string;
}

export interface UsePersonalizationOptions {
  query?: string;
  intent?: string;
  occasion?: string;
  budget?: number;
  userId: string;
  topK?: number;
  rerankTop?: number;
  enabled?: boolean;
}

export interface UsePersonalizationResult {
  recs: PersonalizedRecommendation[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePersonalization(
  options: UsePersonalizationOptions
): UsePersonalizationResult {
  const { enabled = true, ...params } = options;
  const [recs, setRecs] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecommendations = async () => {
    if (!enabled || !params.userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/personalize/recommend', params);
      setRecs(response.data.items || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch recommendations';
      setError(new Error(errorMessage));
      console.error('Personalization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && params.userId) {
      fetchRecommendations();
    }
  }, [params.userId, params.query, params.intent, params.occasion, params.budget, enabled]);

  return {
    recs,
    loading,
    error,
    refetch: fetchRecommendations,
  };
}
