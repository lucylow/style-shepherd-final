/**
 * Returns Predictor Agent - ML-based return risk prediction
 * 
 * Prevents costly returns (24-40% industry average) by scoring cart items pre-purchase
 * using ML on user history, product features, and fabric data.
 * 
 * Core Functionality:
 * - Analyzes cart contents against user return patterns (65% pants/bottoms highest risk)
 * - Predicts 60% return probability with features like "stretchy material" flags
 * - Outputs risk scores, alternative suggestions, and "keep likelihood" percentages
 * - Nudges better purchases before Stripe checkout
 */

import { userMemory, orderSQL } from '../../../lib/raindrop-config.js';
import { vultrValkey } from '../../../lib/vultr-valkey.js';
import type { Product } from '../SearchAgent.js';
import type { 
  CartItem, 
  ReturnRiskAssessment, 
  ReturnHistory,
  UserReturnProfile 
} from './types.js';
import { featureExtractor } from './feature-extractor.js';
import { mlClassifier } from './ml-classifier.js';
import { alternativeFinder } from './alternative-finder.js';

export class ReturnsPredictorAgent {
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly HIGH_RISK_THRESHOLD = 0.40; // 40% return risk
  private readonly MEDIUM_RISK_THRESHOLD = 0.25; // 25% return risk

  /**
   * Assess cart items for return risk
   * Main entry point for cart validation
   */
  async assessCart(
    cartItems: CartItem[],
    userId: string
  ): Promise<ReturnRiskAssessment[]> {
    const assessments: ReturnRiskAssessment[] = [];

    // Get user profile and history
    const userProfile = await featureExtractor.buildUserReturnProfile(userId);
    const userHistory = await featureExtractor.getUserReturnHistory(userId);

    // Assess each cart item
    for (const cartItem of cartItems) {
      const assessment = await this.assessItem(
        cartItem,
        userId,
        userHistory,
        userProfile
      );
      assessments.push(assessment);
    }

    return assessments;
  }

  /**
   * Assess a single cart item for return risk
   */
  private async assessItem(
    cartItem: CartItem,
    userId: string,
    userHistory: ReturnHistory[],
    userProfile: UserReturnProfile | null
  ): Promise<ReturnRiskAssessment> {
    const cacheKey = `return-assessment:${userId}:${cartItem.product.id}:${cartItem.size || 'none'}`;

    try {
      const cached = await vultrValkey.get<ReturnRiskAssessment>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss, continue
    }

    // Extract ML features
    const features = await featureExtractor.extractFeatures(
      cartItem,
      userHistory,
      userProfile
    );

    // Predict return probability using ML classifier
    const prediction = mlClassifier.predict(features);

    // Calculate keep probability (inverse of return risk)
    const returnRisk = prediction.returnProbability;
    const keepProbability = 1 - returnRisk;

    // Determine risk level
    const riskLevel = returnRisk >= this.HIGH_RISK_THRESHOLD ? 'high' :
                     returnRisk >= this.MEDIUM_RISK_THRESHOLD ? 'medium' :
                     'low';

    // Generate risk factors
    const factors = this.generateRiskFactors(features, prediction, userProfile, cartItem);

    // Generate reason
    const reason = this.generateReason(factors, riskLevel, cartItem.product);

    // Find alternatives if high risk
    let alternatives = undefined;
    if (returnRisk >= this.HIGH_RISK_THRESHOLD) {
      alternatives = await alternativeFinder.findAlternatives(
        cartItem.product,
        userId,
        userHistory,
        userProfile
      );
    }

    const assessment: ReturnRiskAssessment = {
      returnRisk: Math.round(returnRisk * 100) / 100,
      keepProbability: Math.round(keepProbability * 100) / 100,
      riskLevel,
      confidence: prediction.confidence,
      reason,
      factors,
      alternatives,
    };

    // Cache assessment
    try {
      await vultrValkey.set(cacheKey, assessment, this.CACHE_TTL);
    } catch (error) {
      // Non-critical
    }

    return assessment;
  }

  /**
   * Generate human-readable risk factors
   */
  private generateRiskFactors(
    features: any,
    prediction: any,
    userProfile: UserReturnProfile | null,
    cartItem: CartItem
  ): Array<{ name: string; impact: number; description: string }> {
    const factors: Array<{ name: string; impact: number; description: string }> = [];

    // Top contributing features
    const topContributions = prediction.featureContributions.slice(0, 5);

    for (const contrib of topContributions) {
      if (Math.abs(contrib.contribution) < 0.05) continue; // Skip minor contributions

      let description = '';
      let impact = contrib.contribution;

      // User category return rate (e.g., pants = 65%)
      if (contrib.feature === 'user_category_return_rate') {
        const category = cartItem.product.category?.toLowerCase() || 'unknown';
        const rate = Math.round(features.user_category_return_rate * 100);
        description = `High return rate for ${category} (${rate}%) - user's highest risk category`;
        impact = features.user_category_return_rate - 0.25; // Relative to baseline
      }
      // Fabric stretch
      else if (contrib.feature === 'fabric_stretch_index' && features.fabric_stretch_index > 0.15) {
        const stretchPercent = Math.round(features.fabric_stretch_index * 20);
        description = `Stretchy material (${stretchPercent}% stretch) reduces return risk`;
        impact = -features.fabric_stretch_index * 0.15; // Negative impact = good
      }
      // Review sentiment
      else if (contrib.feature === 'review_sentiment_score') {
        if (features.review_sentiment_score < -0.3) {
          description = 'Negative reviews mention size/fit issues';
          impact = 0.25;
        } else if (features.review_sentiment_score > 0.3) {
          description = 'Positive reviews suggest good fit';
          impact = -0.15;
        }
      }
      // Size mentions
      else if (contrib.feature === 'review_size_mentions' && features.review_size_mentions > 0) {
        description = `Reviews mention "runs small/large" (${features.review_size_mentions} mentions) - increases risk`;
        impact = features.review_size_mentions * 0.25;
      }
      // Category risk
      else if (contrib.feature === 'category_risk') {
        const category = cartItem.product.category?.toLowerCase() || 'unknown';
        const rate = Math.round(features.category_risk * 100);
        description = `${category} category has ${rate}% base return rate`;
        impact = features.category_risk - 0.25;
      }
      // Brand keep rate
      else if (contrib.feature === 'brand_keep_rate') {
        const keepRate = Math.round(features.brand_keep_rate * 100);
        description = `${cartItem.product.brand} has ${keepRate}% historical keep rate`;
        if (features.brand_keep_rate < 0.75) {
          impact = 0.15;
        } else {
          impact = -0.10;
        }
      }
      // Seasonality
      else if (contrib.feature === 'seasonality_factor') {
        if (features.seasonality_factor > 0.20) {
          description = 'Holiday season - 28.8% higher return rates';
          impact = 0.10;
        }
      }
      // User return history
      else if (contrib.feature === 'user_return_rate' && userProfile) {
        const rate = Math.round(userProfile.returnRate * 100);
        if (userProfile.returnRate > 0.30) {
          description = `User has ${rate}% historical return rate (above average)`;
          impact = userProfile.returnRate - 0.25;
        } else {
          description = `User has ${rate}% historical return rate (below average)`;
          impact = -(0.25 - userProfile.returnRate);
        }
      }

      if (description) {
        factors.push({
          name: contrib.feature,
          impact: Math.round(impact * 100) / 100,
          description,
        });
      }
    }

    return factors;
  }

  /**
   * Generate human-readable reason for the risk assessment
   */
  private generateReason(
    factors: Array<{ name: string; impact: number; description: string }>,
    riskLevel: 'low' | 'medium' | 'high',
    product: Product
  ): string {
    if (factors.length === 0) {
      return 'Standard return risk assessment';
    }

    // Find the most significant factor
    const topFactor = factors[0];
    const category = product.category?.toLowerCase() || 'unknown';

    if (riskLevel === 'high') {
      // High-risk specific messages
      if (topFactor.name.includes('category') || category.includes('pants') || category.includes('bottoms')) {
        return `High return risk for ${category} category - ${topFactor.description}`;
      }
      if (topFactor.name.includes('review') && topFactor.impact > 0) {
        return `Customer reviews indicate fit/size concerns - ${topFactor.description}`;
      }
      return `High return risk detected - ${topFactor.description}`;
    }

    if (riskLevel === 'medium') {
      return `Moderate return risk - ${topFactor.description}`;
    }

    // Low risk
    if (topFactor.impact < 0) {
      return `Low return risk - ${topFactor.description}`;
    }
    return `Low return risk for this product`;
  }

  /**
   * Get aggregate cart risk summary
   */
  async getCartRiskSummary(
    cartItems: CartItem[],
    userId: string
  ): Promise<{
    averageRisk: number;
    highRiskItems: number;
    totalPotentialSavings: number;
    recommendations: string[];
  }> {
    const assessments = await this.assessCart(cartItems, userId);

    const averageRisk = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.returnRisk, 0) / assessments.length
      : 0;

    const highRiskItems = assessments.filter(a => a.riskLevel === 'high').length;

    // Estimate cost savings from preventing returns
    // Average return cost: $25/order processing + product value loss
    const RETURN_PROCESSING_COST = 25;
    const totalPotentialSavings = assessments.reduce((sum, a) => {
      const itemValue = cartItems.find(item => 
        item.product.id === assessments.indexOf(a).toString()
      )?.product.price || 0;
      return sum + (a.returnRisk * (RETURN_PROCESSING_COST + itemValue * 0.3));
    }, 0);

    const recommendations: string[] = [];
    if (highRiskItems > 0) {
      recommendations.push(`⚠️ ${highRiskItems} item(s) have high return risk - consider alternatives`);
    }
    if (averageRisk > 0.30) {
      recommendations.push(`⚠️ Cart has ${Math.round(averageRisk * 100)}% average return risk`);
    }
    if (highRiskItems === 0 && averageRisk < 0.25) {
      recommendations.push(`✅ Cart looks good - low return risk (${Math.round(averageRisk * 100)}%)`);
    }

    return {
      averageRisk: Math.round(averageRisk * 100) / 100,
      highRiskItems,
      totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
      recommendations,
    };
  }
}

export const returnsPredictorAgent = new ReturnsPredictorAgent();

// Export types
export type { 
  CartItem, 
  ReturnRiskAssessment, 
  ReturnHistory,
  UserReturnProfile,
  AlternativeProduct,
  RiskFactor 
} from './types.js';
