/**
 * Agent Orchestrator
 * Central coordinator for the four new specialized agents:
 * - Personal Shopper
 * - Makeup Artist
 * - Size Predictor
 * - Returns Predictor
 * 
 * Routes user queries via message passing and coordinates agent collaboration
 */

import { personalShopperAgent, type OutfitRecommendationParams, type OutfitRecommendationResult } from './PersonalShopperAgent.js';
import { makeupArtistAgent, type MakeupRecommendationParams, type MakeupRecommendationResult } from './MakeupArtistAgent.js';
import { sizePredictorAgent, type SizePredictionParams, type SizePredictionResult } from './SizePredictorAgent.js';
import { returnsPredictorAgent, type ReturnPredictionParams, type ReturnPredictionResult } from './ReturnsPredictorAgent.js';
import { ExternalServiceError } from '../../lib/errors.js';

export type AgentType = 'personal-shopper' | 'makeup-artist' | 'size-predictor' | 'returns-predictor';

export interface UserQuery {
  userId: string;
  intent: string;
  context?: {
    budget?: number;
    occasion?: string;
    style?: string;
    measurements?: any;
    items?: any[];
    selfieUrl?: string;
    skinTone?: any;
    preferences?: any;
  };
}

export interface AgentResponse {
  agentType: AgentType;
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    confidence?: number;
  };
}

export interface OrchestratedResponse {
  query: UserQuery;
  responses: AgentResponse[];
  primaryResponse?: AgentResponse;
  metadata: {
    totalProcessingTime: number;
    agentsUsed: AgentType[];
    overallConfidence?: number;
  };
}

export class AgentOrchestrator {
  /**
   * Parse user intent and route to appropriate agent(s)
   */
  async parseIntent(query: UserQuery): Promise<OrchestratedResponse> {
    const startTime = Date.now();
    const agentsToInvoke = this.determineAgents(query.intent, query.context);
    const responses: AgentResponse[] = [];

    try {
      // Invoke agents in parallel
      const agentPromises = agentsToInvoke.map((agentType) =>
        this.invokeAgent(agentType, query)
      );

      const results = await Promise.allSettled(agentPromises);

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agentType = agentsToInvoke[i];

        if (result.status === 'fulfilled') {
          responses.push(result.value);
        } else {
          responses.push({
            agentType,
            success: false,
            error: result.reason?.message || 'Unknown error',
            metadata: {
              processingTime: 0,
            },
          });
        }
      }

      // Determine primary response (highest confidence or first successful)
      const primaryResponse = responses
        .filter((r) => r.success)
        .sort((a, b) => (b.metadata?.confidence || 0) - (a.metadata?.confidence || 0))[0];

      const totalProcessingTime = Date.now() - startTime;

      // Calculate overall confidence
      const successfulResponses = responses.filter((r) => r.success);
      const overallConfidence = successfulResponses.length > 0
        ? successfulResponses.reduce((sum, r) => sum + (r.metadata?.confidence || 0), 0) / successfulResponses.length
        : 0;

      return {
        query,
        responses,
        primaryResponse,
        metadata: {
          totalProcessingTime,
          agentsUsed: agentsToInvoke,
          overallConfidence,
        },
      };
    } catch (error) {
      throw new ExternalServiceError(
        'AgentOrchestrator',
        `Failed to orchestrate agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error)),
        { userId: query.userId, intent: query.intent }
      );
    }
  }

  /**
   * Determine which agents to invoke based on intent
   */
  private determineAgents(intent: string, context?: UserQuery['context']): AgentType[] {
    const intentLower = intent.toLowerCase();
    const agents: AgentType[] = [];

    // Personal Shopper: outfit recommendations, shopping, styling
    if (
      intentLower.includes('outfit') ||
      intentLower.includes('styling') ||
      intentLower.includes('wardrobe') ||
      intentLower.includes('complete look') ||
      (intentLower.includes('recommend') && context?.budget)
    ) {
      agents.push('personal-shopper');
    }

    // Makeup Artist: makeup, beauty, cosmetics
    if (
      intentLower.includes('makeup') ||
      intentLower.includes('beauty') ||
      intentLower.includes('cosmetic') ||
      intentLower.includes('foundation') ||
      intentLower.includes('lipstick') ||
      context?.selfieUrl ||
      context?.skinTone
    ) {
      agents.push('makeup-artist');
    }

    // Size Predictor: size, fit, measurements
    if (
      intentLower.includes('size') ||
      intentLower.includes('fit') ||
      intentLower.includes('measurement') ||
      context?.measurements
    ) {
      agents.push('size-predictor');
    }

    // Returns Predictor: return risk, cart analysis
    if (
      intentLower.includes('return') ||
      intentLower.includes('risk') ||
      intentLower.includes('cart') ||
      context?.items
    ) {
      agents.push('returns-predictor');
    }

    // Default: if no specific intent, try personal shopper
    if (agents.length === 0 && context?.budget) {
      agents.push('personal-shopper');
    }

    return agents.length > 0 ? agents : ['personal-shopper'];
  }

  /**
   * Invoke a specific agent
   */
  private async invokeAgent(agentType: AgentType, query: UserQuery): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      let data: any;
      let confidence: number | undefined;

      switch (agentType) {
        case 'personal-shopper': {
          const params: OutfitRecommendationParams = {
            userId: query.userId,
            budget: query.context?.budget || 500,
            occasion: query.context?.occasion,
            style: query.context?.style,
            preferences: query.context?.preferences,
          };
          const result = await personalShopperAgent.recommendOutfits(params);
          data = result;
          confidence = result.averageConfidence;
          break;
        }

        case 'makeup-artist': {
          const params: MakeupRecommendationParams = {
            userId: query.userId,
            selfieUrl: query.context?.selfieUrl,
            occasion: query.context?.occasion || 'casual',
            skinTone: query.context?.skinTone,
            preferences: query.context?.preferences,
            budget: query.context?.budget,
          };
          const result = await makeupArtistAgent.generateLook(params);
          data = result;
          confidence = result.averageConfidence;
          break;
        }

        case 'size-predictor': {
          if (!query.context?.measurements) {
            throw new Error('Measurements required for size prediction');
          }
          const params: SizePredictionParams = {
            userId: query.userId,
            brand: query.context?.preferences?.brands?.[0] || 'unknown',
            category: query.context?.preferences?.styles?.[0] || 'general',
            measurements: query.context.measurements,
          };
          const result = await sizePredictorAgent.predictSize(params);
          data = result;
          confidence = result.prediction.confidence;
          break;
        }

        case 'returns-predictor': {
          if (!query.context?.items || query.context.items.length === 0) {
            throw new Error('Cart items required for return prediction');
          }
          const params: ReturnPredictionParams = {
            userId: query.userId,
            items: query.context.items,
          };
          const result = await returnsPredictorAgent.predictRisk(params);
          data = result;
          confidence = 1 - result.overallRisk.score; // Invert risk to get confidence
          break;
        }

        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        agentType,
        success: true,
        data,
        metadata: {
          processingTime,
          confidence,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        agentType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTime,
        },
      };
    }
  }

  /**
   * Direct agent invocation (bypass intent parsing)
   */
  async invokePersonalShopper(params: OutfitRecommendationParams): Promise<OutfitRecommendationResult> {
    return personalShopperAgent.recommendOutfits(params);
  }

  async invokeMakeupArtist(params: MakeupRecommendationParams): Promise<MakeupRecommendationResult> {
    return makeupArtistAgent.generateLook(params);
  }

  async invokeSizePredictor(params: SizePredictionParams): Promise<SizePredictionResult> {
    return sizePredictorAgent.predictSize(params);
  }

  async invokeReturnsPredictor(params: ReturnPredictionParams): Promise<ReturnPredictionResult> {
    return returnsPredictorAgent.predictRisk(params);
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();

