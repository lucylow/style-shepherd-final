/**
 * Human-in-the-Loop (HITL) Orchestrator
 * Adds human approval gates at critical decision points in Style Shepherd's 4-agent pipeline
 * Uses Supabase workflows to pause agents until stylist/expert validation
 */

import { createClient } from '@supabase/supabase-js';
import { personalShopperAgent } from './agents/PersonalShopperAgent.js';
import { sizePredictorAgent } from './agents/size-predictor/index.js';
import { returnsPredictorAgent } from './agents/returns-predictor/index.js';
import { makeupArtistAgent } from './agents/MakeupArtistAgent/index.js';
import { AppError, ExternalServiceError, toAppError } from '../lib/errors.js';
import type { OutfitRecommendationParams, OutfitRecommendationResult } from './agents/PersonalShopperAgent.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface UserIntent {
  sessionId: string;
  userId: string;
  query: string;
  budget?: number;
  occasion?: string;
  preferences?: Record<string, any>;
  tier?: 'premium' | 'express' | 'vip';
}

export interface ShoppingSession {
  id: string;
  session_id: string;
  user_id: string;
  status: 'shopper_pending' | 'shopper_approved' | 'shopper_refined' | 'size_review' | 'size_approved' | 'final_approval' | 'checkout_ready' | 'completed' | 'cancelled';
  human_action: string | null;
  stylist_id: string | null;
  stylist_name: string | null;
  stylist_level: string | null;
  outfits: any;
  size_predictions: any;
  return_risks: any;
  makeup_recommendations: any;
  query: any;
  user_intent: string | null;
  budget: number | null;
  occasion: string | null;
  size_confidence: number | null;
  return_risk_score: number | null;
  overall_confidence: number | null;
  tier: string;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  sla_deadline: string | null;
}

export interface HITLResponse {
  sessionId: string;
  status: string;
  outfits?: OutfitRecommendationResult;
  sizePredictions?: any;
  returnRisks?: any;
  message: string;
  nextStep?: string;
}

export class HITLOrchestrator {
  private readonly MAX_WAIT_TIME = 600000; // 10 minutes max wait
  private readonly POLL_INTERVAL = 2000; // Check every 2 seconds
  private readonly SIZE_CONFIDENCE_THRESHOLD = 0.80;
  private readonly RETURN_RISK_THRESHOLD = 0.40;

  /**
   * Process shopping query with human approval gates
   */
  async processWithHumanReview(intent: UserIntent): Promise<HITLResponse> {
    const sessionId = intent.sessionId || `session_${intent.userId}_${Date.now()}`;

    try {
      // 1. Create shopping session
      const session = await this.createSession({
        session_id: sessionId,
        user_id: intent.userId,
        query: intent,
        user_intent: intent.query,
        budget: intent.budget || null,
        occasion: intent.occasion || null,
        tier: intent.tier || 'premium',
        status: 'shopper_pending',
      });

      // 2. Personal Shopper (always human-reviewed for premium)
      const outfits = await personalShopperAgent.recommendOutfits({
        userId: intent.userId,
        budget: intent.budget || 500,
        occasion: intent.occasion,
        preferences: intent.preferences,
      });

      // 3. Update session with outfits and wait for approval
      await this.updateSession(sessionId, {
        outfits: outfits,
        status: 'shopper_pending',
      });

      // 4. Wait for stylist approval
      const approvedSession = await this.waitForHumanAction('shopper_approved', sessionId);

      if (approvedSession.human_action === 'rejected') {
        // Refine and re-queue
        await this.updateSession(sessionId, {
          status: 'shopper_refined',
        });
        // Re-run Personal Shopper with refinements
        const refinedOutfits = await personalShopperAgent.recommendOutfits({
          userId: intent.userId,
          budget: intent.budget || 500,
          occasion: intent.occasion,
          preferences: intent.preferences,
        });
        await this.updateSession(sessionId, {
          outfits: refinedOutfits,
          status: 'shopper_pending',
        });
        // Wait again
        await this.waitForHumanAction('shopper_approved', sessionId);
      }

      // 5. Continue with Size Predictor
      return await this.completePipeline(approvedSession, outfits);

    } catch (error) {
      const appError = toAppError(error);
      throw new ExternalServiceError(
        'HITLOrchestrator',
        `Failed to process with human review: ${appError.message}`,
        error as Error,
        { sessionId, userId: intent.userId }
      );
    }
  }

  /**
   * Complete the pipeline after initial approval
   */
  private async completePipeline(session: ShoppingSession, outfits: OutfitRecommendationResult): Promise<HITLResponse> {
    const sessionId = session.session_id;

    try {
      // Extract product IDs from outfits
      const productIds: string[] = [];
      outfits.outfits.forEach(outfit => {
        outfit.items.forEach(item => {
          if (item.productId) productIds.push(item.productId);
        });
      });

      // Step 1: Size Predictor with HITL gate
      const sizePredictions: Record<string, any> = {};
      let requiresSizeReview = false;

      for (const outfit of outfits.outfits) {
        for (const item of outfit.items) {
          if (item.product?.brand && item.product?.category) {
            // Use the size predictor's predictSizes method
            const sizeResult = await sizePredictorAgent.predictSizes({
              userId: session.user_id,
              products: [item.product],
            });

            const prediction = sizeResult.predictions[0];
            if (prediction) {
              sizePredictions[item.productId] = {
                recommendedSize: prediction.prediction.recommendedSize,
                confidence: prediction.prediction.confidence,
                alternatives: prediction.prediction.alternatives,
                riskScore: prediction.prediction.riskScore,
                warnings: prediction.prediction.warnings,
              };

              // HITL Gate: If confidence < 80%, require human review
              if (prediction.prediction.confidence < this.SIZE_CONFIDENCE_THRESHOLD) {
                requiresSizeReview = true;
              }
            }
          }
        }
      }

      // Update session with size predictions
      await this.updateSession(sessionId, {
        size_predictions: sizePredictions,
        size_confidence: this.calculateAverageConfidence(sizePredictions),
      });

      // HITL Gate for Size Predictor
      if (requiresSizeReview) {
        await this.updateSession(sessionId, {
          status: 'size_review',
        });
        const sizeApprovedSession = await this.waitForHumanAction('size_approved', sessionId);
        
        // Handle size override if provided
        if (sizeApprovedSession.human_action === 'override_size') {
          // Apply overrides from session data
          const overrides = sizeApprovedSession.size_predictions;
          if (overrides) {
            Object.assign(sizePredictions, overrides);
          }
        }
      } else {
        // Auto-approve if confidence is high
        await this.updateSession(sessionId, {
          status: 'size_approved',
          human_action: 'approved',
        });
      }

      // Step 2: Returns Predictor with HITL gate
      const returnRisks: Record<string, any> = {};
      let requiresReturnReview = false;

      // Group products into cart items for returns predictor
      const cartItems = productIds.map(productId => {
        const product = outfits.outfits
          .flatMap(o => o.items)
          .find(item => item.productId === productId)?.product;
        
        return {
          productId,
          product: product || { id: productId } as any,
          size: sizePredictions[productId]?.recommendedSize,
          quantity: 1,
        };
      });

      const assessments = await returnsPredictorAgent.assessCart(
        cartItems.filter(item => item.product.id),
        session.user_id
      );

      assessments.forEach((assessment, index) => {
        const productId = cartItems[index]?.productId;
        if (productId) {
          returnRisks[productId] = {
            riskScore: assessment.returnRisk,
            riskLevel: assessment.riskLevel,
            confidence: assessment.confidence,
            reason: assessment.reason,
            factors: assessment.factors,
            alternatives: assessment.alternatives,
          };

          // HITL Gate: If risk > 40%, require human review
          if (assessment.returnRisk > this.RETURN_RISK_THRESHOLD) {
            requiresReturnReview = true;
          }
        }
      });

      const avgRiskScore = Object.values(returnRisks).reduce(
        (sum: number, risk: any) => sum + (risk.riskScore || 0),
        0
      ) / Object.keys(returnRisks).length || 0;

      await this.updateSession(sessionId, {
        return_risks: returnRisks,
        return_risk_score: avgRiskScore,
        status: requiresReturnReview ? 'final_approval' : 'checkout_ready',
      });

      // HITL Gate for Returns Predictor
      if (requiresReturnReview) {
        const finalSession = await this.waitForHumanAction('checkout_ready', sessionId);
        
        // Handle risk mitigation actions
        if (finalSession.human_action === 'swap_item' || finalSession.human_action === 'remove') {
          // Apply swaps/removals from session data
          // This would be handled by updating the outfits
        }
      }

      // Final status
      await this.updateSession(sessionId, {
        status: 'checkout_ready',
        overall_confidence: this.calculateOverallConfidence(sizePredictions, returnRisks),
        completed_at: new Date().toISOString(),
      });

      return {
        sessionId,
        status: 'checkout_ready',
        outfits,
        sizePredictions,
        returnRisks,
        message: 'Your complete look is ready to shop!',
      };

    } catch (error) {
      const appError = toAppError(error);
      throw new ExternalServiceError(
        'HITLOrchestrator',
        `Failed to complete pipeline: ${appError.message}`,
        error as Error,
        { sessionId }
      );
    }
  }

  /**
   * Wait for human action (polling with timeout)
   */
  private async waitForHumanAction(
    targetStatus: string,
    sessionId: string,
    timeout: number = this.MAX_WAIT_TIME
  ): Promise<ShoppingSession> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const session = await this.getSession(sessionId);

      if (!session) {
        throw new AppError('Session not found', 404);
      }

      // Check if target status reached
      if (session.status === targetStatus || 
          (targetStatus === 'shopper_approved' && session.status === 'shopper_approved') ||
          (targetStatus === 'size_approved' && session.status === 'size_approved') ||
          (targetStatus === 'checkout_ready' && session.status === 'checkout_ready')) {
        return session;
      }

      // Check if cancelled
      if (session.status === 'cancelled') {
        throw new AppError('Session was cancelled', 400);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, this.POLL_INTERVAL));
    }

    throw new AppError(`Timeout waiting for human action. Expected status: ${targetStatus}`, 408);
  }

  /**
   * Create a new shopping session
   */
  private async createSession(data: Partial<ShoppingSession>): Promise<ShoppingSession> {
    const { data: session, error } = await supabase
      .from('shopping_sessions')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new ExternalServiceError('Supabase', `Failed to create session: ${error.message}`, error as Error);
    }

    return session as ShoppingSession;
  }

  /**
   * Get a shopping session by session_id
   */
  async getSession(sessionId: string): Promise<ShoppingSession | null> {
    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new ExternalServiceError('Supabase', `Failed to get session: ${error.message}`, error as Error);
    }

    return data as ShoppingSession;
  }

  /**
   * Update a shopping session
   */
  async updateSession(sessionId: string, updates: Partial<ShoppingSession>): Promise<ShoppingSession> {
    const { data, error } = await supabase
      .from('shopping_sessions')
      .update(updates)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      throw new ExternalServiceError('Supabase', `Failed to update session: ${error.message}`, error as Error);
    }

    return data as ShoppingSession;
  }

  /**
   * Handle human action (approve/reject/override)
   */
  async handleHumanAction(
    sessionId: string,
    action: string,
    stylistId: string,
    updates?: Partial<ShoppingSession>
  ): Promise<ShoppingSession> {
    const updateData: Partial<ShoppingSession> = {
      human_action: action,
      stylist_id: stylistId,
      ...updates,
    };

    // Determine next status based on action
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (action === 'approved') {
      if (session.status === 'shopper_pending') {
        updateData.status = 'shopper_approved';
      } else if (session.status === 'size_review') {
        updateData.status = 'size_approved';
      } else if (session.status === 'final_approval') {
        updateData.status = 'checkout_ready';
      }
    } else if (action === 'rejected') {
      if (session.status === 'shopper_pending') {
        updateData.status = 'shopper_refined';
      }
    }

    return await this.updateSession(sessionId, updateData);
  }

  /**
   * Calculate average confidence from size predictions
   */
  private calculateAverageConfidence(predictions: Record<string, any>): number {
    const values = Object.values(predictions)
      .map((p: any) => p.confidence)
      .filter((c: any) => typeof c === 'number');
    
    if (values.length === 0) return 0.5;
    
    return values.reduce((sum, c) => sum + c, 0) / values.length;
  }

  /**
   * Calculate overall confidence from size and return predictions
   */
  private calculateOverallConfidence(
    sizePredictions: Record<string, any>,
    returnRisks: Record<string, any>
  ): number {
    const sizeConf = this.calculateAverageConfidence(sizePredictions);
    const avgRisk = Object.values(returnRisks).reduce(
      (sum: number, risk: any) => sum + (risk.riskScore || 0),
      0
    ) / Object.keys(returnRisks).length || 0;
    
    // Higher confidence = higher size confidence + lower return risk
    return (sizeConf + (1 - avgRisk)) / 2;
  }

  /**
   * Get pending sessions for stylist queue
   */
  async getPendingSessions(stylistId?: string): Promise<ShoppingSession[]> {
    let query = supabase
      .from('shopping_sessions')
      .select('*')
      .in('status', ['shopper_pending', 'size_review', 'final_approval']);

    if (stylistId) {
      query = query.eq('stylist_id', stylistId);
    } else {
      query = query.is('stylist_id', null);
    }

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new ExternalServiceError('Supabase', `Failed to get pending sessions: ${error.message}`, error as Error);
    }

    return (data || []) as ShoppingSession[];
  }
}

export const hitlOrchestrator = new HITLOrchestrator();
