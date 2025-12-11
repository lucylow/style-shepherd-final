/**
 * Frontend Agent Orchestrator
 * Client-side interface for interacting with specialized agents
 */

import { api } from '@/lib/api';
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

export class AgentOrchestratorClient {
  /**
   * Parse user intent and route to appropriate agent(s)
   */
  async parseIntent(query: UserQuery): Promise<OrchestratedResponse> {
    const response = await api.post<OrchestratedResponse>('/agents/orchestrate', query);
    return response.data;
  }

  /**
   * Personal Shopper - Get outfit recommendations
   */
  async recommendOutfits(params: OutfitRecommendationParams): Promise<OutfitRecommendationResult> {
    const response = await api.post<OutfitRecommendationResult>('/agents/personal-shopper', params);
    return response.data;
  }

  /**
   * Makeup Artist - Generate makeup look
   */
  async generateMakeupLook(params: MakeupRecommendationParams): Promise<MakeupRecommendationResult> {
    const response = await api.post<MakeupRecommendationResult>('/agents/makeup-artist', params);
    return response.data;
  }

  /**
   * Size Predictor - Predict size
   */
  async predictSize(params: SizePredictionParams): Promise<SizePredictionResult> {
    const response = await api.post<SizePredictionResult>('/agents/size-predictor', params);
    return response.data;
  }

  /**
   * Returns Predictor - Predict return risk
   */
  async predictReturnRisk(params: ReturnPredictionParams): Promise<ReturnPredictionResult> {
    const response = await api.post<ReturnPredictionResult>('/agents/returns-predictor', params);
    return response.data;
  }

  /**
   * List all available agents
   */
  async listAgents() {
    const response = await api.get('/agents');
    return response.data;
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestratorClient();
