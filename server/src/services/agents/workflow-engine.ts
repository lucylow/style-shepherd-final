/**
 * Multi-Agent Workflow Engine
 * Orchestrates Style Shepherd's 4 specialized agents through event-driven state machine
 * Uses Supabase as the central workflow engine
 */

import { supabaseWorkflowService, type ShoppingWorkflow } from '../../lib/supabase-client.js';
import { personalShopperAgent, type OutfitRecommendationParams, type OutfitRecommendationResult } from './PersonalShopperAgent.js';
import { makeupArtistAgent, type MakeupRecommendationParams, type MakeupRecommendationResult } from './MakeupArtistAgent.js';
import { sizePredictorAgent, type SizePredictionParams, type SizePredictionResult } from './SizePredictorAgent.js';
import { returnsPredictorAgent, type ReturnPredictionParams, type ReturnPredictionResult } from './ReturnsPredictorAgent.js';
import { ExternalServiceError } from '../../lib/errors.js';

export interface ShoppingIntent {
  userId: string;
  budget?: number;
  occasion?: string;
  style?: string;
  preferences?: {
    colors?: string[];
    brands?: string[];
    styles?: string[];
  };
  selfieUrl?: string;
  skinTone?: {
    undertone?: 'warm' | 'cool' | 'neutral';
    depth?: 'light' | 'medium' | 'tan' | 'deep';
  };
  measurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    inseam?: number;
    shoeSize?: number;
  };
}

export interface CompleteRecommendation {
  workflowId: string;
  outfits?: OutfitRecommendationResult;
  makeup?: MakeupRecommendationResult;
  sizePredictions?: SizePredictionResult[];
  returnRisks?: ReturnPredictionResult;
  aggregated: {
    recommendations: any[];
    confidence: number;
    reasoning: string;
    totalPrice?: number;
    returnRisk?: number;
  };
  metadata: {
    processingTime: number;
    agentsUsed: string[];
    success: boolean;
  };
}

export class MultiAgentWorkflow {
  private readonly MAX_RETRIES = 3;
  private readonly AGENT_TIMEOUT_MS = 30000; // 30 seconds per agent

  /**
   * Execute a complete shopping workflow
   */
  async execute(userIntent: ShoppingIntent): Promise<CompleteRecommendation> {
    const startTime = Date.now();

    try {
      // Create workflow in Supabase
      const workflow = await supabaseWorkflowService.createWorkflow(
        userIntent.userId,
        userIntent
      );

      // Update status to running
      await supabaseWorkflowService.updateWorkflowStatus(workflow.id, 'running', {
        current_stage: 'discovery',
      });

      // Stage 1: Parallel execution - Discovery agents
      const discoveryPromises: Promise<any>[] = [
        this.executePersonalShopper(workflow.id, userIntent),
      ];

      // Add makeup artist if selfie provided
      if (userIntent.selfieUrl || userIntent.skinTone) {
        discoveryPromises.push(
          this.executeMakeupArtist(workflow.id, userIntent)
        );
      }

      // Execute discovery agents in parallel
      await Promise.allSettled(discoveryPromises);

      // Wait for personal shopper to complete (required for next stage)
      await this.waitForAgentComplete(workflow.id, 'personal-shopper', this.AGENT_TIMEOUT_MS);

      // Stage 2: Sequential validation - Size prediction
      // This is triggered automatically by Supabase trigger when shopper completes
      await this.executeSizePredictor(workflow.id, userIntent);

      // Wait for size predictor to complete
      await this.waitForAgentComplete(workflow.id, 'size-predictor', this.AGENT_TIMEOUT_MS);

      // Stage 3: Sequential risk assessment - Returns prediction
      // This is triggered automatically by Supabase trigger when size predictor completes
      await this.executeReturnsPredictor(workflow.id, userIntent);

      // Wait for returns predictor to complete
      await this.waitForAgentComplete(workflow.id, 'returns-predictor', this.AGENT_TIMEOUT_MS);

      // Stage 4: Final synthesis - Aggregator
      // This is triggered automatically by Supabase trigger when all required agents complete
      await this.executeAggregator(workflow.id);

      // Wait for aggregator to complete
      await this.waitForAgentComplete(workflow.id, 'aggregator', this.AGENT_TIMEOUT_MS);

      // Get final workflow state
      const finalWorkflow = await supabaseWorkflowService.getWorkflow(workflow.id);
      if (!finalWorkflow) {
        throw new Error('Workflow not found after completion');
      }

      // Update to delivered
      await supabaseWorkflowService.updateWorkflowStatus(workflow.id, 'delivered');

      const processingTime = Date.now() - startTime;

      // Build complete recommendation
      const recommendation: CompleteRecommendation = {
        workflowId: workflow.id,
        aggregated: finalWorkflow.final_result || {
          recommendations: [],
          confidence: 0,
          reasoning: 'Workflow completed',
        },
        metadata: {
          processingTime,
          agentsUsed: this.getAgentsUsed(finalWorkflow),
          success: true,
        },
      };

      // Extract agent results from workflow
      const agentResults = finalWorkflow.agent_results || [];
      for (const result of agentResults) {
        if (result.agent_type === 'personal-shopper') {
          recommendation.outfits = result.result;
        } else if (result.agent_type === 'makeup-artist') {
          recommendation.makeup = result.result;
        } else if (result.agent_type === 'size-predictor') {
          if (!recommendation.sizePredictions) {
            recommendation.sizePredictions = [];
          }
          recommendation.sizePredictions.push(result.result);
        } else if (result.agent_type === 'returns-predictor') {
          recommendation.returnRisks = result.result;
        }
      }

      return recommendation;
    } catch (error) {
      const appError = error instanceof Error ? error : new Error(String(error));
      
      // Try to get workflow ID from error context or create a new one
      let workflowId: string | undefined;
      try {
        const workflow = await supabaseWorkflowService.createWorkflow(
          userIntent.userId,
          userIntent
        );
        workflowId = workflow.id;
        await supabaseWorkflowService.updateWorkflowStatus(workflowId, 'error', {
          error_message: appError.message,
        });
      } catch (createError) {
        // Ignore if we can't create workflow
      }

      throw new ExternalServiceError(
        'MultiAgentWorkflow',
        `Workflow execution failed: ${appError.message}`,
        appError,
        { userId: userIntent.userId, workflowId }
      );
    }
  }

  /**
   * Execute Personal Shopper Agent
   */
  private async executePersonalShopper(workflowId: string, intent: ShoppingIntent): Promise<void> {
    const startTime = Date.now();

    try {
      // Create input message
      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'personal-shopper',
        'input',
        { intent }
      );

      // Execute agent
      const params: OutfitRecommendationParams = {
        userId: intent.userId,
        budget: intent.budget || 500,
        occasion: intent.occasion,
        style: intent.style,
        preferences: intent.preferences,
      };

      const result = await personalShopperAgent.recommendOutfits(params);

      // Record result
      await supabaseWorkflowService.addAgentResult(workflowId, 'personal-shopper', result);

      // Create output message (triggers size predictor via Supabase trigger)
      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'personal-shopper',
        'output',
        result
      );

      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'personal-shopper',
        duration,
        true
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'personal-shopper',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'personal-shopper',
        'error',
        { error: error instanceof Error ? error.message : String(error) }
      );

      throw error;
    }
  }

  /**
   * Execute Makeup Artist Agent
   */
  private async executeMakeupArtist(workflowId: string, intent: ShoppingIntent): Promise<void> {
    const startTime = Date.now();

    try {
      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'makeup-artist',
        'input',
        { intent }
      );

      const params: MakeupRecommendationParams = {
        userId: intent.userId,
        selfieUrl: intent.selfieUrl,
        occasion: intent.occasion || 'casual',
        skinTone: intent.skinTone,
        budget: intent.budget,
        preferences: intent.preferences,
      };

      const result = await makeupArtistAgent.generateLook(params);

      await supabaseWorkflowService.addAgentResult(workflowId, 'makeup-artist', result);

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'makeup-artist',
        'output',
        result
      );

      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'makeup-artist',
        duration,
        true
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'makeup-artist',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'makeup-artist',
        'error',
        { error: error instanceof Error ? error.message : String(error) }
      );

      // Makeup artist is optional, so we don't throw
      console.warn('Makeup artist agent failed (non-critical):', error);
    }
  }

  /**
   * Execute Size Predictor Agent
   */
  private async executeSizePredictor(workflowId: string, intent: ShoppingIntent): Promise<void> {
    const startTime = Date.now();

    try {
      // Get shopper results to extract products
      const messages = await supabaseWorkflowService.getAgentMessages(workflowId, 'personal-shopper');
      const shopperOutput = messages.find(m => m.message_type === 'output');
      
      if (!shopperOutput) {
        throw new Error('Personal shopper results not found');
      }

      const shopperResult = shopperOutput.payload as OutfitRecommendationResult;
      const products = shopperResult.outfits.flatMap(outfit => outfit.items);

      // Execute size prediction for each product
      const sizePredictions: SizePredictionResult[] = [];

      for (const item of products) {
        if (!intent.measurements) {
          continue; // Skip if no measurements
        }

        const params: SizePredictionParams = {
          userId: intent.userId,
          productId: item.productId,
          brand: item.product.brand || 'unknown',
          category: item.product.category || 'unknown',
          measurements: intent.measurements,
        };

        const prediction = await sizePredictorAgent.predictSize(params);
        sizePredictions.push(prediction);
      }

      const result = {
        predictions: sizePredictions,
        totalProducts: products.length,
      };

      await supabaseWorkflowService.addAgentResult(workflowId, 'size-predictor', result);

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'size-predictor',
        'output',
        result
      );

      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'size-predictor',
        duration,
        true
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'size-predictor',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'size-predictor',
        'error',
        { error: error instanceof Error ? error.message : String(error) }
      );

      throw error;
    }
  }

  /**
   * Execute Returns Predictor Agent
   */
  private async executeReturnsPredictor(workflowId: string, intent: ShoppingIntent): Promise<void> {
    const startTime = Date.now();

    try {
      // Get shopper results to extract cart items
      const messages = await supabaseWorkflowService.getAgentMessages(workflowId, 'personal-shopper');
      const shopperOutput = messages.find(m => m.message_type === 'output');
      
      if (!shopperOutput) {
        throw new Error('Personal shopper results not found');
      }

      const shopperResult = shopperOutput.payload as OutfitRecommendationResult;
      const cartItems = shopperResult.outfits.flatMap(outfit =>
        outfit.items.map(item => ({
          productId: item.productId,
          brand: item.product.brand || 'unknown',
          category: item.product.category || 'unknown',
          price: item.product.price,
          size: item.recommendedSize,
          color: item.product.color,
          rating: item.product.rating,
        }))
      );

      const params: ReturnPredictionParams = {
        userId: intent.userId,
        items: cartItems,
      };

      const result = await returnsPredictorAgent.predictRisk(params);

      await supabaseWorkflowService.addAgentResult(workflowId, 'returns-predictor', result);

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'returns-predictor',
        'output',
        result
      );

      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'returns-predictor',
        duration,
        true
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'returns-predictor',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'returns-predictor',
        'error',
        { error: error instanceof Error ? error.message : String(error) }
      );

      throw error;
    }
  }

  /**
   * Execute Aggregator Agent (final synthesis)
   */
  private async executeAggregator(workflowId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Get all agent results
      const workflow = await supabaseWorkflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const agentResults = workflow.agent_results || [];
      
      // Extract results by agent type
      const shopperResult = agentResults.find(r => r.agent_type === 'personal-shopper')?.result as OutfitRecommendationResult | undefined;
      const makeupResult = agentResults.find(r => r.agent_type === 'makeup-artist')?.result as MakeupRecommendationResult | undefined;
      const sizeResults = agentResults.filter(r => r.agent_type === 'size-predictor').map(r => r.result);
      const returnsResult = agentResults.find(r => r.agent_type === 'returns-predictor')?.result as ReturnPredictionResult | undefined;

      // Aggregate results
      const aggregated = this.aggregateResults({
        outfits: shopperResult,
        makeup: makeupResult,
        sizePredictions: sizeResults,
        returnRisks: returnsResult,
      });

      // Update workflow with final result
      await supabaseWorkflowService.updateWorkflowStatus(workflowId, 'aggregated', {
        final_result: aggregated,
      });

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'aggregator',
        'output',
        aggregated
      );

      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'aggregator',
        duration,
        true
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await supabaseWorkflowService.recordAnalytics(
        workflowId,
        'aggregator',
        duration,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await supabaseWorkflowService.createAgentMessage(
        workflowId,
        'aggregator',
        'error',
        { error: error instanceof Error ? error.message : String(error) }
      );

      throw error;
    }
  }

  /**
   * Aggregate results from all agents
   */
  private aggregateResults(params: {
    outfits?: OutfitRecommendationResult;
    makeup?: MakeupRecommendationResult;
    sizePredictions?: any[];
    returnRisks?: ReturnPredictionResult;
  }): CompleteRecommendation['aggregated'] {
    const recommendations: any[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalPrice = 0;
    let returnRisk = 0;

    // Add outfit recommendations
    if (params.outfits) {
      for (const outfit of params.outfits.outfits) {
        recommendations.push({
          type: 'outfit',
          id: outfit.id,
          name: outfit.name,
          items: outfit.items,
          price: outfit.totalPrice,
          confidence: outfit.confidence,
          reasoning: outfit.reasoning,
        });
        totalConfidence += outfit.confidence;
        confidenceCount++;
        totalPrice += outfit.totalPrice;
      }
    }

    // Add makeup recommendations
    if (params.makeup) {
      for (const look of params.makeup.looks) {
        recommendations.push({
          type: 'makeup',
          id: look.id,
          name: look.name,
          steps: look.steps,
          price: look.totalPrice,
          confidence: look.confidence,
          reasoning: look.reasoning,
        });
        totalConfidence += look.confidence;
        confidenceCount++;
        totalPrice += look.totalPrice;
      }
    }

    // Get return risk
    if (params.returnRisks) {
      returnRisk = params.returnRisks.overallRisk.score;
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Generate reasoning
    const reasoningParts: string[] = [];
    if (params.outfits && params.outfits.outfits.length > 0) {
      reasoningParts.push(`${params.outfits.outfits.length} outfit recommendation(s)`);
    }
    if (params.makeup && params.makeup.looks.length > 0) {
      reasoningParts.push(`${params.makeup.looks.length} makeup look(s)`);
    }
    if (returnRisk > 0) {
      const riskLevel = returnRisk > 0.6 ? 'high' : returnRisk > 0.3 ? 'medium' : 'low';
      reasoningParts.push(`Return risk: ${riskLevel} (${(returnRisk * 100).toFixed(1)}%)`);
    }

    const reasoning = reasoningParts.length > 0
      ? `Complete shopping recommendations: ${reasoningParts.join(', ')}.`
      : 'Shopping recommendations generated.';

    return {
      recommendations,
      confidence: averageConfidence,
      reasoning,
      totalPrice: totalPrice > 0 ? totalPrice : undefined,
      returnRisk: returnRisk > 0 ? returnRisk : undefined,
    };
  }

  /**
   * Wait for agent to complete
   */
  private async waitForAgentComplete(
    workflowId: string,
    agentType: string,
    timeoutMs: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const messages = await supabaseWorkflowService.getAgentMessages(workflowId, agentType as any);
      const hasOutput = messages.some(m => m.message_type === 'output');
      const hasError = messages.some(m => m.message_type === 'error');

      if (hasOutput) {
        return; // Agent completed successfully
      }

      if (hasError) {
        throw new Error(`${agentType} agent failed`);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`${agentType} agent timeout after ${timeoutMs}ms`);
  }

  /**
   * Get list of agents used in workflow
   */
  private getAgentsUsed(workflow: ShoppingWorkflow): string[] {
    const agentResults = workflow.agent_results || [];
    return agentResults.map(r => r.agent_type).filter((v, i, a) => a.indexOf(v) === i);
  }
}

// Singleton instance
export const multiAgentWorkflow = new MultiAgentWorkflow();
