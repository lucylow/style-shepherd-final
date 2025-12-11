/**
 * Returns Predictor Agent
 * Flags high-return-risk items pre-purchase using ML on past data patterns
 * Focuses on fit issues, material preferences, and user behavior patterns
 */

import { userMemory, orderSQL } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import { vultrPostgres } from '../../lib/vultr-postgres.js';
import { ExternalServiceError } from '../../lib/errors.js';

export interface CartItem {
  productId: string;
  brand: string;
  category: string;
  price: number;
  size?: string;
  color?: string;
  rating?: number;
}

export interface UserProfile {
  userId: string;
  returnHistory?: Array<{
    productId: string;
    reason: string;
    category: string;
    brand: string;
  }>;
  preferences?: {
    materials?: string[];
    fit?: 'loose' | 'regular' | 'tight';
    colors?: string[];
  };
  returnRate?: number;
}

export interface ReturnRiskFactor {
  factor: string;
  impact: number; // 0-1, contribution to risk
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReturnRiskPrediction {
  riskScore: number; // 0-1, where 1 is highest risk
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1, model confidence
  factors: ReturnRiskFactor[];
  alternatives?: Array<{
    productId: string;
    reason: string;
    riskReduction: number;
  }>;
  mitigationStrategies: string[];
  estimatedReturnCost?: number;
  co2Impact?: number; // CO2 saved if return prevented
}

export interface ReturnPredictionParams {
  userId: string;
  items: CartItem[];
  userProfile?: UserProfile;
}

export interface ReturnPredictionResult {
  predictions: Array<{
    item: CartItem;
    prediction: ReturnRiskPrediction;
  }>;
  overallRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    primaryConcerns: string[];
  };
  recommendations: string[];
}

export class ReturnsPredictorAgent {
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly BASE_RETURN_RATE = 0.25; // Industry average 25%
  private readonly HIGH_RISK_THRESHOLD = 0.6;
  private readonly MEDIUM_RISK_THRESHOLD = 0.3;

  /**
   * Predict return risk for cart items
   */
  async predictRisk(params: ReturnPredictionParams): Promise<ReturnPredictionResult> {
    const cacheKey = `return-risk:${params.userId}:${JSON.stringify(params.items.map(i => i.productId))}`;
    
    try {
      const cached = await vultrValkey.get<ReturnPredictionResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    try {
      // Get or use provided user profile
      const userProfile = params.userProfile || await this.getUserProfile(params.userId);

      // Get historical return data for similar products
      const historicalData = await this.getHistoricalReturnData(params.items);

      // Predict risk for each item
      const predictions = await Promise.all(
        params.items.map(async (item) => {
          const prediction = await this.predictItemRisk(item, userProfile, historicalData);
          return { item, prediction };
        })
      );

      // Calculate overall risk
      const overallRisk = this.calculateOverallRisk(predictions);

      // Generate recommendations
      const recommendations = this.generateRecommendations(predictions, overallRisk);

      const result: ReturnPredictionResult = {
        predictions,
        overallRisk,
        recommendations,
      };

      // Cache result
      await vultrValkey.set(cacheKey, result, this.CACHE_TTL).catch(() => {});

      return result;
    } catch (error) {
      throw new ExternalServiceError(
        'ReturnsPredictorAgent',
        `Failed to predict return risk: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error)),
        { userId: params.userId }
      );
    }
  }

  /**
   * Get user profile with return history
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const profile = await userMemory.get(userId);
      
      // Get return history from database
      const returnHistory = await this.getUserReturnHistory(userId);
      
      // Calculate return rate
      const totalOrders = await this.getUserOrderCount(userId);
      const returnRate = totalOrders > 0 ? (returnHistory?.length || 0) / totalOrders : 0;

      return {
        userId,
        returnHistory,
        preferences: profile?.preferences || {},
        returnRate,
      };
    } catch (error) {
      return {
        userId,
        returnHistory: [],
        preferences: {},
        returnRate: this.BASE_RETURN_RATE,
      };
    }
  }

  /**
   * Get user's return history from database
   */
  private async getUserReturnHistory(userId: string): Promise<UserProfile['returnHistory']> {
    try {
      const query = `
        SELECT 
          product_id,
          return_reason,
          category,
          brand
        FROM orders
        WHERE user_id = $1 AND returned = true
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const result = await vultrPostgres.query(query, [userId]);
      return (result || []).map((row: any) => ({
        productId: row.product_id,
        reason: row.return_reason || 'unknown',
        category: row.category || 'unknown',
        brand: row.brand || 'unknown',
      }));
    } catch (error) {
      console.warn('Failed to get user return history:', error);
      return [];
    }
  }

  /**
   * Get user's total order count
   */
  private async getUserOrderCount(userId: string): Promise<number> {
    try {
      const query = `SELECT COUNT(*) as count FROM orders WHERE user_id = $1`;
      const result = await vultrPostgres.query<{ count: string }>(query, [userId]);
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get historical return data for similar products
   */
  private async getHistoricalReturnData(items: CartItem[]): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const item of items) {
      try {
        const query = `
          SELECT 
            COUNT(*) as total_orders,
            SUM(CASE WHEN returned = true THEN 1 ELSE 0 END) as total_returns,
            AVG(CASE WHEN returned = true THEN 1.0 ELSE 0.0 END) as return_rate
          FROM orders
          WHERE brand = $1 AND category = $2
        `;

        const result = await vultrPostgres.query<{ total_orders: string; total_returns: string; return_rate: string }>(query, [item.brand, item.category]);
        const row = result[0];

        if (row) {
          data[item.productId] = {
            totalOrders: parseInt(row.total_orders || '0', 10),
            totalReturns: parseInt(row.total_returns || '0', 10),
            returnRate: parseFloat(row.return_rate || '0'),
          };
        }
      } catch (error) {
        console.warn(`Failed to get historical data for ${item.productId}:`, error);
      }
    }

    return data;
  }

  /**
   * Predict return risk for a single item
   */
  private async predictItemRisk(
    item: CartItem,
    userProfile: UserProfile,
    historicalData: Record<string, any>
  ): Promise<ReturnRiskPrediction> {
    let riskScore = this.BASE_RETURN_RATE;
    const factors: ReturnRiskFactor[] = [];

    // Factor 1: User's historical return rate
    if (userProfile.returnRate && userProfile.returnRate > this.BASE_RETURN_RATE) {
      const userRiskBoost = (userProfile.returnRate - this.BASE_RETURN_RATE) * 0.3;
      riskScore += userRiskBoost;
      factors.push({
        factor: 'User Return History',
        impact: userRiskBoost,
        description: `User has ${(userProfile.returnRate * 100).toFixed(1)}% return rate (above average)`,
        severity: userProfile.returnRate > 0.4 ? 'high' : 'medium',
      });
    }

    // Factor 2: Size uncertainty
    if (!item.size) {
      riskScore += 0.25;
      factors.push({
        factor: 'Size Uncertainty',
        impact: 0.25,
        description: 'No size selected - size issues are primary return driver',
        severity: 'high',
      });
    } else {
      // Check if user has returned this size before
      const sizeReturns = userProfile.returnHistory?.filter(
        (r) => r.brand === item.brand && r.reason.toLowerCase().includes('size')
      ).length || 0;
      
      if (sizeReturns > 0) {
        riskScore += 0.15;
        factors.push({
          factor: 'Size History',
          impact: 0.15,
          description: `User has returned ${sizeReturns} item(s) from ${item.brand} due to size issues`,
          severity: 'medium',
        });
      }
    }

    // Factor 3: Historical return rate for brand/category
    const historical = historicalData[item.productId];
    if (historical && historical.returnRate > this.BASE_RETURN_RATE) {
      const brandRiskBoost = (historical.returnRate - this.BASE_RETURN_RATE) * 0.2;
      riskScore += brandRiskBoost;
      factors.push({
        factor: 'Brand/Category Return Rate',
        impact: brandRiskBoost,
        description: `${item.brand} ${item.category} has ${(historical.returnRate * 100).toFixed(1)}% return rate`,
        severity: historical.returnRate > 0.4 ? 'high' : 'medium',
      });
    }

    // Factor 4: Product rating
    if (item.rating !== undefined) {
      if (item.rating < 3.5) {
        riskScore += 0.15;
        factors.push({
          factor: 'Low Product Rating',
          impact: 0.15,
          description: `Product has low rating (${item.rating.toFixed(1)}/5)`,
          severity: 'medium',
        });
      } else if (item.rating > 4.5) {
        riskScore -= 0.1;
        factors.push({
          factor: 'High Product Rating',
          impact: -0.1,
          description: `Product has excellent rating (${item.rating.toFixed(1)}/5)`,
          severity: 'low',
        });
      }
    }

    // Factor 5: Category match with return history
    const categoryReturns = userProfile.returnHistory?.filter(
      (r) => r.category === item.category
    ).length || 0;
    
    if (categoryReturns > 2) {
      riskScore += 0.1;
      factors.push({
        factor: 'Category Return Pattern',
        impact: 0.1,
        description: `User has returned ${categoryReturns} item(s) in ${item.category} category`,
        severity: 'medium',
      });
    }

    // Factor 6: Brand match with return history
    const brandReturns = userProfile.returnHistory?.filter(
      (r) => r.brand === item.brand
    ).length || 0;
    
    if (brandReturns > 1) {
      riskScore += 0.12;
      factors.push({
        factor: 'Brand Return Pattern',
        impact: 0.12,
        description: `User has returned ${brandReturns} item(s) from ${item.brand}`,
        severity: 'medium',
      });
    }

    // Normalize risk score
    riskScore = Math.max(0, Math.min(1, riskScore));

    // Determine risk level
    const riskLevel = riskScore >= this.HIGH_RISK_THRESHOLD
      ? 'high'
      : riskScore >= this.MEDIUM_RISK_THRESHOLD
      ? 'medium'
      : 'low';

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(userProfile, historical);

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(factors, item, riskLevel);

    // Estimate return cost
    const estimatedReturnCost = this.estimateReturnCost(item.price);

    // Calculate CO2 impact
    const co2Impact = this.calculateCO2Impact(item.category);

    return {
      riskScore,
      riskLevel,
      confidence,
      factors: factors.sort((a, b) => b.impact - a.impact),
      mitigationStrategies,
      estimatedReturnCost,
      co2Impact,
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(userProfile: UserProfile, historical: any): number {
    let confidence = 0.5; // Base confidence

    // More data = higher confidence
    if (userProfile.returnHistory && userProfile.returnHistory.length > 5) {
      confidence += 0.2;
    }

    if (historical && historical.totalOrders > 10) {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(
    factors: ReturnRiskFactor[],
    item: CartItem,
    riskLevel: string
  ): string[] {
    const strategies: string[] = [];

    if (factors.some((f) => f.factor === 'Size Uncertainty')) {
      strategies.push('Verify size using our size predictor before purchase');
    }

    if (factors.some((f) => f.factor === 'Size History')) {
      strategies.push('Consider trying a different size based on your fit history');
    }

    if (riskLevel === 'high') {
      strategies.push('Read product reviews carefully before purchasing');
      strategies.push('Consider purchasing with free returns option');
    }

    if (factors.some((f) => f.factor === 'Brand/Category Return Rate')) {
      strategies.push('Check size guide for this brand - sizing may vary');
    }

    if (factors.some((f) => f.factor === 'Low Product Rating')) {
      strategies.push('Review customer feedback and photos before purchasing');
    }

    if (strategies.length === 0) {
      strategies.push('Item looks like a good fit based on your history');
    }

    return strategies;
  }

  /**
   * Estimate return cost
   */
  private estimateReturnCost(price: number): number {
    // Return handling cost: $5-10 + shipping
    return 7.50 + (price * 0.1); // 10% of item value for restocking
  }

  /**
   * Calculate CO2 impact of return
   */
  private calculateCO2Impact(category: string): number {
    // Average CO2 for return shipping: ~2-5 kg CO2
    // Varies by distance and shipping method
    return 3.5; // kg CO2
  }

  /**
   * Calculate overall risk for cart
   */
  private calculateOverallRisk(
    predictions: Array<{ item: CartItem; prediction: ReturnRiskPrediction }>
  ): ReturnPredictionResult['overallRisk'] {
    if (predictions.length === 0) {
      return {
        score: 0,
        level: 'low',
        primaryConcerns: [],
      };
    }

    // Weighted average by price
    const totalPrice = predictions.reduce((sum, p) => sum + p.item.price, 0);
    const weightedRisk = predictions.reduce(
      (sum, p) => sum + (p.prediction.riskScore * p.item.price),
      0
    ) / totalPrice;

    const riskLevel = weightedRisk >= this.HIGH_RISK_THRESHOLD
      ? 'high'
      : weightedRisk >= this.MEDIUM_RISK_THRESHOLD
      ? 'medium'
      : 'low';

    // Get primary concerns from high-impact factors
    const primaryConcerns = predictions
      .flatMap((p) => p.prediction.factors)
      .filter((f) => f.severity === 'high' || f.impact > 0.15)
      .map((f) => f.factor)
      .filter((f, i, arr) => arr.indexOf(f) === i)
      .slice(0, 3);

    return {
      score: weightedRisk,
      level: riskLevel,
      primaryConcerns,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    predictions: Array<{ item: CartItem; prediction: ReturnRiskPrediction }>,
    overallRisk: ReturnPredictionResult['overallRisk']
  ): string[] {
    const recommendations: string[] = [];

    if (overallRisk.level === 'high') {
      recommendations.push('Consider reviewing size recommendations for all items');
      recommendations.push('High return risk detected - verify fit preferences before checkout');
    }

    const highRiskItems = predictions.filter((p) => p.prediction.riskLevel === 'high');
    if (highRiskItems.length > 0) {
      recommendations.push(`${highRiskItems.length} item(s) have high return risk - review carefully`);
    }

    const sizeIssues = predictions.filter((p) =>
      p.prediction.factors.some((f) => f.factor.includes('Size'))
    );
    if (sizeIssues.length > 0) {
      recommendations.push('Use our size predictor to verify fit for uncertain items');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cart looks good! Low return risk across all items.');
    }

    return recommendations;
  }
}

// Singleton instance
export const returnsPredictorAgent = new ReturnsPredictorAgent();

