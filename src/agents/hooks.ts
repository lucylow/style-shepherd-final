/**
 * React Hooks for Specialized Agents
 * Custom hooks for using agents in React components
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentOrchestrator } from './orchestrator';
import type {
  UserQuery,
  OrchestratedResponse,
  OutfitRecommendationParams,
  OutfitRecommendationResult,
  MakeupRecommendationParams,
  MakeupRecommendationResult,
  SizePredictionParams,
  SizePredictionResult,
  ReturnPredictionParams,
  ReturnPredictionResult,
} from './types';

/**
 * Hook for orchestrating agent queries
 */
export function useAgentOrchestrator() {
  return useMutation({
    mutationFn: (query: UserQuery) => agentOrchestrator.parseIntent(query),
  });
}

/**
 * Hook for personal shopper outfit recommendations
 */
export function useOutfitRecommendations() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: OutfitRecommendationParams) =>
      agentOrchestrator.recommendOutfits(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });

  return {
    recommend: mutation.mutate,
    recommendAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Hook for makeup artist look generation
 */
export function useMakeupLook() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: MakeupRecommendationParams) =>
      agentOrchestrator.generateMakeupLook(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['makeup-looks'] });
    },
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Hook for size prediction
 */
export function useSizePrediction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: SizePredictionParams) =>
      agentOrchestrator.predictSize(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-predictions'] });
    },
  });

  return {
    predict: mutation.mutate,
    predictAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Hook for return risk prediction
 */
export function useReturnRiskPrediction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: ReturnPredictionParams) =>
      agentOrchestrator.predictReturnRisk(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-risks'] });
    },
  });

  return {
    predict: mutation.mutate,
    predictAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Hook for listing available agents
 */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => agentOrchestrator.listAgents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for cached outfit recommendations
 */
export function useOutfitRecommendationsQuery(params: OutfitRecommendationParams | null) {
  return useQuery({
    queryKey: ['outfits', params],
    queryFn: () => agentOrchestrator.recommendOutfits(params!),
    enabled: !!params,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for cached makeup looks
 */
export function useMakeupLookQuery(params: MakeupRecommendationParams | null) {
  return useQuery({
    queryKey: ['makeup-looks', params],
    queryFn: () => agentOrchestrator.generateMakeupLook(params!),
    enabled: !!params,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

