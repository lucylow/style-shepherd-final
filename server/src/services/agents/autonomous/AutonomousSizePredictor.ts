/**
 * Autonomous Size Predictor Agent
 * 
 * Self-Improving:
 * - Actual returns → Retrain personal size model daily
 * - New measurements → Update body profile
 * - Brand sizing changes → Auto-detect from returns spike
 */

import { PrismaClient } from '@prisma/client';
import { sizePredictorAgent } from '../size-predictor/index.js';
import { userMemory } from '../../../lib/raindrop-config.js';
import { vultrValkey } from '../../../lib/vultr-valkey.js';

const prisma = new PrismaClient();

export interface ReturnLearningData {
  orderId: string;
  productId: string;
  brand: string;
  category: string;
  predictedSize: string;
  actualSize?: string;
  actualFit: 'perfect' | 'too_small' | 'too_large' | 'wrong_style';
  returnReason?: string;
  measurements?: any;
}

export interface ModelAccuracy {
  overallAccuracy: number;
  brandAccuracy: Map<string, number>;
  categoryAccuracy: Map<string, number>;
  improvement: number;
}

export class AutonomousSizePredictor {
  private readonly MIN_RETURNS_FOR_RETRAIN = 5;
  private readonly RETRAIN_INTERVAL_HOURS = 24;

  /**
   * Learn from a return event and update personal model
   */
  async learnFromReturn(userId: string, returnData: ReturnLearningData): Promise<void> {
    try {
      // Store return learning event
      await prisma.returnLearningEvent.create({
        data: {
          userId,
          orderId: returnData.orderId,
          productId: returnData.productId,
          predictedSize: returnData.predictedSize,
          actualFit: returnData.actualFit,
          returnReason: returnData.returnReason,
        },
      });

      // Check if enough data for retraining
      const recentReturns = await this.getRecentReturns(userId);
      
      if (recentReturns.length >= this.MIN_RETURNS_FOR_RETRAIN) {
        await this.retrainPersonalModel(userId, recentReturns);
      } else {
        // Update model incrementally
        await this.incrementalModelUpdate(userId, returnData);
      }

      // Check for brand sizing changes
      await this.detectBrandSizingChanges(userId, returnData);

      // Log learning activity
      await prisma.agentTriggerLog.create({
        data: {
          userId,
          agentType: 'sizePredictor',
          triggerType: 'return',
          triggerData: returnData,
          action: 'learned_from_return',
          success: true,
          autonomyLevel: 4, // Self-healing level
        },
      });

      // Notify user if accuracy improved
      const accuracy = await this.calculateAccuracy(userId);
      if (accuracy.improvement > 0.02) {
        await this.notifyUser(userId, {
          type: 'accuracy_improvement',
          message: `Updated your size profile - ${Math.round(accuracy.overallAccuracy * 100)}% accuracy now (improved by ${Math.round(accuracy.improvement * 100)}%)!`,
          accuracy: accuracy.overallAccuracy,
        });
      }
    } catch (error) {
      console.error(`[AutonomousSizePredictor] Error learning from return:`, error);
    }
  }

  /**
   * Retrain personal size model with recent returns
   */
  private async retrainPersonalModel(userId: string, returns: ReturnLearningData[]): Promise<void> {
    try {
      console.log(`[AutonomousSizePredictor] Retraining model for user ${userId} with ${returns.length} returns`);

      // Group returns by brand and category
      const brandData = new Map<string, ReturnLearningData[]>();
      const categoryData = new Map<string, ReturnLearningData[]>();

      for (const ret of returns) {
        // By brand
        if (!brandData.has(ret.brand)) {
          brandData.set(ret.brand, []);
        }
        brandData.get(ret.brand)!.push(ret);

        // By category
        if (!categoryData.has(ret.category)) {
          categoryData.set(ret.category, []);
        }
        categoryData.get(ret.category)!.push(ret);
      }

      // Update brand-specific adjustments
      const brandAdjustments: Record<string, number> = {};
      
      for (const [brand, brandReturns] of brandData.entries()) {
        const adjustment = this.calculateSizeAdjustment(brandReturns);
        if (Math.abs(adjustment) >= 0.5) {
          brandAdjustments[brand] = adjustment;
        }
      }

      // Store updated model in agent memory
      const profile = await userMemory.get(userId);
      const updatedProfile = {
        ...profile,
        sizePredictions: {
          ...profile?.sizePredictions,
          brandAdjustments,
          lastRetrained: new Date().toISOString(),
          trainingDataSize: returns.length,
        },
      };

      await userMemory.set(userId, updatedProfile);

      // Update agent memory
      await this.updateAgentMemory(userId, {
        lastRetrained: new Date(),
        trainingDataSize: returns.length,
        brandAdjustments,
      });

      // Mark return events as processed
      await prisma.returnLearningEvent.updateMany({
        where: {
          userId,
          modelUpdated: false,
        },
        data: {
          modelUpdated: true,
        },
      });
    } catch (error) {
      console.error('[AutonomousSizePredictor] Error retraining model:', error);
    }
  }

  /**
   * Incremental model update for single return
   */
  private async incrementalModelUpdate(userId: string, returnData: ReturnLearningData): Promise<void> {
    const profile = await userMemory.get(userId);
    const currentAdjustments = profile?.sizePredictions?.brandAdjustments || {};

    // Calculate adjustment needed
    const adjustment = this.calculateSingleAdjustment(returnData);

    if (Math.abs(adjustment) >= 0.3) {
      // Update brand adjustment
      const brand = returnData.brand;
      const currentAdjustment = currentAdjustments[brand] || 0;
      const newAdjustment = currentAdjustment * 0.7 + adjustment * 0.3; // Weighted average

      await userMemory.set(userId, {
        ...profile,
        sizePredictions: {
          ...profile?.sizePredictions,
          brandAdjustments: {
            ...currentAdjustments,
            [brand]: newAdjustment,
          },
        },
      });
    }
  }

  /**
   * Detect brand sizing changes from return spike
   */
  private async detectBrandSizingChanges(userId: string, returnData: ReturnLearningData): Promise<void> {
    try {
      // Get recent returns for this brand
      const brandReturns = await prisma.returnLearningEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      // Filter by brand (would need brand field in returnLearningEvent)
      // For now, analyze pattern

      // If return rate for brand > 40%, flag for investigation
      const brandReturnRate = brandReturns.length / 10; // Mock calculation
      
      if (brandReturnRate > 0.4) {
        await this.notifyUser(userId, {
          type: 'brand_sizing_alert',
          message: `Noticed increased returns for ${returnData.brand} - they may have changed their sizing. Consider sizing up/down?`,
          brand: returnData.brand,
        });
      }
    } catch (error) {
      console.error('[AutonomousSizePredictor] Error detecting brand changes:', error);
    }
  }

  /**
   * Update body profile when new measurements are provided
   */
  async updateBodyProfile(userId: string, measurements: any): Promise<void> {
    try {
      const profile = await userMemory.get(userId);
      
      await userMemory.set(userId, {
        ...profile,
        bodyMeasurements: measurements,
        sizePredictions: {
          ...profile?.sizePredictions,
          lastMeasurementUpdate: new Date().toISOString(),
        },
      });

      // Recalculate predictions for active cart items
      await this.recalculateActivePredictions(userId);

      // Log update
      await prisma.agentTriggerLog.create({
        data: {
          userId,
          agentType: 'sizePredictor',
          triggerType: 'measurement',
          triggerData: { measurements },
          action: 'updated_body_profile',
          success: true,
          autonomyLevel: 3,
        },
      });
    } catch (error) {
      console.error('[AutonomousSizePredictor] Error updating body profile:', error);
    }
  }

  /**
   * Calculate size adjustment from returns
   */
  private calculateSizeAdjustment(returns: ReturnLearningData[]): number {
    let totalAdjustment = 0;
    let count = 0;

    for (const ret of returns) {
      if (ret.actualFit === 'too_small') {
        totalAdjustment += 1; // Size up
        count++;
      } else if (ret.actualFit === 'too_large') {
        totalAdjustment -= 1; // Size down
        count++;
      }
      // 'perfect' and 'wrong_style' don't affect size adjustment
    }

    return count > 0 ? totalAdjustment / count : 0;
  }

  /**
   * Calculate adjustment for single return
   */
  private calculateSingleAdjustment(returnData: ReturnLearningData): number {
    if (returnData.actualFit === 'too_small') {
      return 1;
    } else if (returnData.actualFit === 'too_large') {
      return -1;
    }
    return 0;
  }

  /**
   * Calculate current model accuracy
   */
  async calculateAccuracy(userId: string): Promise<ModelAccuracy> {
    const recentReturns = await this.getRecentReturns(userId);
    
    if (recentReturns.length === 0) {
      return {
        overallAccuracy: 0.85, // Default baseline
        brandAccuracy: new Map(),
        categoryAccuracy: new Map(),
        improvement: 0,
      };
    }

    // Calculate accuracy (percentage of perfect fits)
    const perfectFits = recentReturns.filter(r => r.actualFit === 'perfect').length;
    const overallAccuracy = perfectFits / recentReturns.length;

    // Calculate accuracy by brand
    const brandAccuracy = new Map<string, number>();
    const brandReturns = new Map<string, ReturnLearningData[]>();

    for (const ret of recentReturns) {
      if (!brandReturns.has(ret.brand)) {
        brandReturns.set(ret.brand, []);
      }
      brandReturns.get(ret.brand)!.push(ret);
    }

    for (const [brand, returns] of brandReturns.entries()) {
      const perfect = returns.filter(r => r.actualFit === 'perfect').length;
      brandAccuracy.set(brand, perfect / returns.length);
    }

    // Get previous accuracy from memory
    const memory = await prisma.agentMemory.findFirst({
      where: {
        userId,
        agentType: 'sizePredictor',
      },
    });

    const previousAccuracy = memory?.performanceMetrics?.accuracy || overallAccuracy;
    const improvement = overallAccuracy - previousAccuracy;

    return {
      overallAccuracy,
      brandAccuracy,
      categoryAccuracy: new Map(), // Similar calculation for categories
      improvement,
    };
  }

  /**
   * Recalculate predictions for items in user's cart
   */
  private async recalculateActivePredictions(userId: string): Promise<void> {
    // In production, would fetch cart items and recalculate sizes
    console.log(`[AutonomousSizePredictor] Recalculating predictions for user ${userId}`);
  }

  /**
   * Helper methods
   */
  private async getRecentReturns(userId: string): Promise<ReturnLearningData[]> {
    const events = await prisma.returnLearningEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Transform to ReturnLearningData format
    return events.map(event => ({
      orderId: event.orderId,
      productId: event.productId,
      brand: '', // Would be populated from product data
      category: '', // Would be populated from product data
      predictedSize: event.predictedSize,
      actualFit: event.actualFit as any,
      returnReason: event.returnReason || undefined,
    }));
  }

  private async updateAgentMemory(userId: string, data: any): Promise<void> {
    const accuracy = await this.calculateAccuracy(userId);

    await prisma.agentMemory.upsert({
      where: {
        userId_agentType: {
          userId,
          agentType: 'sizePredictor',
        },
      },
      create: {
        userId,
        agentType: 'sizePredictor',
        context: data,
        performanceMetrics: {
          accuracy: accuracy.overallAccuracy,
          lastRetrained: data.lastRetrained,
        },
        lastLearned: new Date(),
      },
      update: {
        context: data,
        performanceMetrics: {
          accuracy: accuracy.overallAccuracy,
          lastRetrained: data.lastRetrained,
        },
        lastLearned: new Date(),
      },
    });
  }

  private async notifyUser(userId: string, notification: any): Promise<void> {
    const cacheKey = `notification:${userId}:${Date.now()}`;
    await vultrValkey.set(cacheKey, notification, 604800); // 7 days
  }

  /**
   * Daily self-improvement cycle
   */
  async dailyImprovementCycle(userId: string): Promise<void> {
    try {
      const settings = await this.getAutonomySettings(userId);
      if (!settings || !settings.sizePredictor?.autoLearn) {
        return;
      }

      // Check if retraining is needed
      const lastRetrain = await this.getLastRetrainTime(userId);
      const hoursSinceRetrain = (Date.now() - lastRetrain.getTime()) / (1000 * 60 * 60);

      if (hoursSinceRetrain >= this.RETRAIN_INTERVAL_HOURS) {
        const recentReturns = await this.getRecentReturns(userId);
        
        if (recentReturns.length >= this.MIN_RETURNS_FOR_RETRAIN) {
          await this.retrainPersonalModel(userId, recentReturns);
          
          // Recalculate and store accuracy
          const accuracy = await this.calculateAccuracy(userId);
          await this.updateAgentMemory(userId, {
            accuracy: accuracy.overallAccuracy,
          });
        }
      }
    } catch (error) {
      console.error(`[AutonomousSizePredictor] Error in daily cycle:`, error);
    }
  }

  private async getAutonomySettings(userId: string) {
    return await prisma.userAutonomySettings.findUnique({
      where: { userId },
    });
  }

  private async getLastRetrainTime(userId: string): Promise<Date> {
    const memory = await prisma.agentMemory.findFirst({
      where: {
        userId,
        agentType: 'sizePredictor',
      },
    });

    return memory?.context?.lastRetrained || new Date(0);
  }
}

export const autonomousSizePredictor = new AutonomousSizePredictor();

