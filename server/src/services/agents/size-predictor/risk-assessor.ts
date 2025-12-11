/**
 * Risk Assessor
 * Predicts return risk based on size predictions, fabric properties, and user history
 * Integrates with ReturnsAgent for comprehensive risk analysis
 */

import { orderSQL } from '../../../lib/raindrop-config.js';
import { userMemory } from '../../../lib/raindrop-config.js';

export interface SizeHistory {
  productId: string;
  brand: string;
  category: string;
  sizeOrdered: string;
  sizeKept: string | null; // null if returned
  returned: boolean;
  returnReason?: string;
  date: string;
}

export interface FabricProperties {
  stretch?: number; // 0-1, stretch factor
  elasticity?: 'low' | 'medium' | 'high';
  material?: string; // 'cotton', 'polyester', 'spandex', etc.
  runsSmall?: boolean; // From review NLP
  runsLarge?: boolean;
  trueToSize?: boolean;
}

export interface RiskAssessment {
  riskScore: number; // 0-1, where 1 is highest risk
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  factors: RiskFactor[];
  recommendations: string[];
  sizeAdjustment?: number; // ±1 size adjustment needed
}

export interface RiskFactor {
  factor: string;
  impact: number; // 0-1, contribution to risk
  description: string;
}

/**
 * Assesses return risk for size predictions
 */
export class RiskAssessor {
  private readonly BASE_RISK = 0.25; // Industry average 25% return rate
  private readonly SIZE_ISSUE_WEIGHT = 0.4; // 40% of returns are size-related

  /**
   * Assess return risk for a size prediction
   */
  async assess(
    userId: string,
    brand: string,
    category: string,
    recommendedSize: string,
    fabric?: FabricProperties,
    sizeHistory?: SizeHistory[]
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let riskScore = this.BASE_RISK;

    // Factor 1: User's historical size accuracy
    if (sizeHistory && sizeHistory.length > 0) {
      const sizeAccuracy = this.calculateSizeAccuracy(sizeHistory, brand);
      if (sizeAccuracy < 0.7) {
        const riskBoost = (0.7 - sizeAccuracy) * 0.3;
        riskScore += riskBoost;
        factors.push({
          factor: 'Historical Size Accuracy',
          impact: riskBoost,
          description: `User has ${(sizeAccuracy * 100).toFixed(0)}% size accuracy for ${brand}`,
        });
      } else if (sizeAccuracy > 0.9) {
        const riskReduction = (sizeAccuracy - 0.9) * 0.2;
        riskScore = Math.max(0.05, riskScore - riskReduction);
        factors.push({
          factor: 'Historical Size Accuracy',
          impact: -riskReduction,
          description: `User has excellent ${(sizeAccuracy * 100).toFixed(0)}% size accuracy for ${brand}`,
        });
      }
    }

    // Factor 2: Fabric stretch/elasticity
    if (fabric) {
      const fabricAdjustment = this.assessFabricRisk(fabric);
      if (fabricAdjustment.riskChange !== 0) {
        riskScore += fabricAdjustment.riskChange;
        factors.push({
          factor: 'Fabric Properties',
          impact: fabricAdjustment.riskChange,
          description: fabricAdjustment.description,
        });
      }
    }

    // Factor 3: Brand-specific return patterns
    const brandRisk = this.getBrandReturnRisk(brand, category);
    if (brandRisk > 0) {
      riskScore += brandRisk;
      factors.push({
        factor: 'Brand Return Rate',
        impact: brandRisk,
        description: `${brand} has higher than average return rate for ${category}`,
      });
    }

    // Factor 4: Size confidence (from SVM prediction)
    // Lower confidence = higher risk
    // This will be passed in from the main agent

    // Factor 5: User preference clustering (prefers loose/tight)
    const userPreference = await this.getUserFitPreference(userId);
    if (userPreference) {
      const preferenceRisk = this.assessFitPreferenceRisk(userPreference, recommendedSize, category);
      if (preferenceRisk !== 0) {
        riskScore += preferenceRisk;
        factors.push({
          factor: 'User Fit Preference',
          impact: preferenceRisk,
          description: `User prefers ${userPreference} fit, may need size adjustment`,
        });
      }
    }

    // Factor 6: Review NLP flags ("runs small", "runs large")
    if (fabric?.runsSmall) {
      riskScore += 0.15;
      factors.push({
        factor: 'Review Analysis',
        impact: 0.15,
        description: 'Reviews indicate this item runs small - consider sizing up',
      });
    } else if (fabric?.runsLarge) {
      riskScore += 0.10;
      factors.push({
        factor: 'Review Analysis',
        impact: 0.10,
        description: 'Reviews indicate this item runs large - consider sizing down',
      });
    }

    // Clamp risk score
    riskScore = Math.min(0.95, Math.max(0.05, riskScore));

    // Determine risk level
    const riskLevel: 'low' | 'medium' | 'high' = 
      riskScore < 0.3 ? 'low' : 
      riskScore < 0.6 ? 'medium' : 
      'high';

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, factors, fabric, recommendedSize);

    // Calculate size adjustment if needed
    const sizeAdjustment = this.calculateSizeAdjustment(fabric, factors);

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      confidence: 0.85, // Model confidence
      factors,
      recommendations,
      sizeAdjustment,
    };
  }

  /**
   * Calculate user's size accuracy for a brand
   */
  private calculateSizeAccuracy(history: SizeHistory[], brand: string): number {
    const brandHistory = history.filter(h => h.brand === brand);
    if (brandHistory.length === 0) return 0.7; // Default if no history

    const kept = brandHistory.filter(h => !h.returned && h.sizeKept === h.sizeOrdered).length;
    return kept / brandHistory.length;
  }

  /**
   * Assess fabric risk
   */
  private assessFabricRisk(fabric: FabricProperties): { riskChange: number; description: string } {
    // High stretch = lower risk (more forgiving)
    if (fabric.elasticity === 'high' || (fabric.stretch && fabric.stretch > 0.3)) {
      return {
        riskChange: -0.10,
        description: 'High stretch fabric - more forgiving fit',
      };
    }

    // Low stretch = higher risk (less forgiving)
    if (fabric.elasticity === 'low' || (fabric.stretch && fabric.stretch < 0.1)) {
      return {
        riskChange: 0.12,
        description: 'Low stretch fabric - requires precise sizing',
      };
    }

    return { riskChange: 0, description: 'Standard fabric properties' };
  }

  /**
   * Get brand-specific return risk
   */
  private getBrandReturnRisk(brand: string, category: string): number {
    // Brand return rates from sponsor data
    const brandRisks: Record<string, number> = {
      'Zara': 0.08,
      'H&M': 0.10,
      'ASOS': 0.15,
      'Forever 21': 0.12,
      'Uniqlo': 0.06,
      'Everlane': 0.05,
      'Aritzia': 0.07,
    };

    // Category-specific adjustments
    const categoryRisks: Record<string, number> = {
      'dress': 0.05, // Dresses have higher return rate
      'jeans': 0.08, // Jeans are tricky
      'shoes': 0.10, // Shoes have high return rate
    };

    const brandRisk = brandRisks[brand] || 0;
    const categoryRisk = categoryRisks[category] || 0;

    return brandRisk + categoryRisk;
  }

  /**
   * Get user's fit preference (loose/tight/standard)
   */
  private async getUserFitPreference(userId: string): Promise<'loose' | 'tight' | 'standard' | null> {
    try {
      const profile = await userMemory.get(userId);
      if (profile?.preferences?.fitPreference) {
        return profile.preferences.fitPreference as 'loose' | 'tight' | 'standard';
      }
    } catch (error) {
      // Ignore
    }

    // Infer from return history
    try {
      if (orderSQL && orderSQL.query) {
        const returns = await orderSQL.query(
          `SELECT reason FROM returns WHERE user_id = $1 AND reason LIKE '%too%'`,
          [userId]
        );

        const tooTight = returns.filter((r: any) => 
          r.reason?.toLowerCase().includes('tight') || r.reason?.toLowerCase().includes('small')
        ).length;
        const tooLoose = returns.filter((r: any) => 
          r.reason?.toLowerCase().includes('loose') || r.reason?.toLowerCase().includes('large')
        ).length;

        if (tooTight > tooLoose * 2) return 'loose';
        if (tooLoose > tooTight * 2) return 'tight';
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }

  /**
   * Assess fit preference risk
   */
  private assessFitPreferenceRisk(
    preference: 'loose' | 'tight' | 'standard',
    recommendedSize: string,
    category: string
  ): number {
    // If user prefers loose but we recommend standard size, risk is low
    // If user prefers tight but we recommend standard size, might need adjustment
    // This is simplified - in production would analyze size history more carefully
    return 0; // Neutral for now
  }

  /**
   * Generate recommendations based on risk
   */
  private generateRecommendations(
    riskLevel: 'low' | 'medium' | 'high',
    factors: RiskFactor[],
    fabric?: FabricProperties,
    recommendedSize?: string
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
      recommendations.push('⚠️ High return risk - verify size before purchase');
      if (fabric?.runsSmall) {
        recommendations.push('Consider sizing up - reviews indicate this runs small');
      }
      if (fabric?.runsLarge) {
        recommendations.push('Consider sizing down - reviews indicate this runs large');
      }
    } else if (riskLevel === 'medium') {
      recommendations.push('Review size recommendations and product measurements');
    } else {
      recommendations.push('✅ Low return risk - good fit likelihood');
    }

    // Add fabric-specific recommendations
    if (fabric?.elasticity === 'low') {
      recommendations.push('Low stretch fabric - ensure accurate measurements');
    }

    return recommendations;
  }

  /**
   * Calculate size adjustment needed
   */
  private calculateSizeAdjustment(
    fabric?: FabricProperties,
    factors?: RiskFactor[]
  ): number {
    let adjustment = 0;

    if (fabric?.runsSmall) {
      adjustment += 1; // Size up
    }
    if (fabric?.runsLarge) {
      adjustment -= 1; // Size down
    }

    // Check if any factors suggest size adjustment
    if (factors) {
      const sizeFactor = factors.find(f => 
        f.description.includes('size up') || f.description.includes('size down')
      );
      if (sizeFactor) {
        if (sizeFactor.description.includes('size up')) adjustment += 1;
        if (sizeFactor.description.includes('size down')) adjustment -= 1;
      }
    }

    return Math.max(-1, Math.min(1, adjustment)); // Clamp to ±1
  }

  /**
   * Get user's size history from database
   */
  async getUserSizeHistory(userId: string): Promise<SizeHistory[]> {
    try {
      if (orderSQL && orderSQL.query) {
        const orders = await orderSQL.query(
          `SELECT * FROM orders WHERE user_id = $1`,
          [userId]
        );
        const returns = await orderSQL.query(
          `SELECT * FROM returns WHERE user_id = $1`,
          [userId]
        );

        const returnMap = new Map(returns.map((r: any) => [r.product_id, r]));

        const history: SizeHistory[] = [];
        for (const order of orders) {
          const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
          for (const item of items) {
            const returnData = returnMap.get(item.productId || item.id);
            history.push({
              productId: item.productId || item.id,
              brand: item.brand || 'Unknown',
              category: item.category || 'unknown',
              sizeOrdered: item.size || 'M',
              sizeKept: returnData ? null : item.size,
              returned: !!returnData,
              returnReason: returnData?.reason,
              date: order.created_at || new Date().toISOString(),
            });
          }
        }

        return history;
      }
    } catch (error) {
      console.warn('Failed to get user size history:', error);
    }

    return [];
  }
}

export const riskAssessor = new RiskAssessor();

