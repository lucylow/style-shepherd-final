import { Product, CartItem } from '@/types/fashion';
import { userMemoryService, UserProfile } from './raindrop/userMemoryService';
import { styleInferenceService } from './raindrop/styleInferenceService';
import { orderSQLService } from './raindrop/orderSQLService';
import { getApiBaseUrl } from '@/lib/api-config';

interface ReturnRiskPrediction {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  primary_factors: string[];
  mitigation_strategies: string[];
  confidence: number;
}

interface CartRiskAnalysis {
  cart_risk_score: number;
  item_predictions: Array<ReturnRiskPrediction & { item_id: string }>;
  risk_insights: {
    dominant_risk_factors: Array<[string, number]>;
    risk_distribution: Record<string, number>;
  };
  mitigation_recommendations: Array<{
    item_id: string;
    current_risk: number;
    recommended_actions: Array<{
      action: string;
      reason: string;
      confidence: number;
    }>;
    potential_improvement: number;
  }>;
}

// Types matching the API response
export interface ReturnRiskAssessment {
  returnRisk: number; // 0.0-1.0
  keepProbability: number; // 0.0-1.0
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  reason: string;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  alternatives?: Array<{
    id: string;
    name: string;
    brand: string;
    price: number;
    returnRisk: number;
    keepProbability: number;
    reason: string;
  }>;
}

export interface CartValidationResponse {
  success: boolean;
  assessments: ReturnRiskAssessment[];
  summary: {
    averageRisk: number;
    highRiskItems: number;
    totalPotentialSavings: number;
    recommendations: string[];
  };
}

class ReturnsPredictor {
  private readonly industryAvgReturnRate = 0.25; // 25% fashion industry average
  private readonly API_BASE = getApiBaseUrl();

  async predictReturnRisk(
    product: Product,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): Promise<ReturnRiskPrediction> {
    // Use SmartInference for return risk prediction
    if (userProfile) {
      try {
        const result = await styleInferenceService.predictReturnRisk(
          product.id,
          userProfile.userId,
          userProfile,
          selectedSize
        );
        
        return {
          risk_score: result.riskScore,
          risk_level: result.riskLevel,
          primary_factors: result.factors,
          mitigation_strategies: this.getMitigationStrategies(result.riskLevel, result.factors),
          confidence: result.confidence,
        };
      } catch (error) {
        console.error('SmartInference failed, falling back to local logic:', error);
      }
    }

    // Fallback to local logic
    const features = this.engineerReturnFeatures(product, userProfile, selectedSize);
    const riskScore = this.calculateRiskScore(features);
    const riskFactors = this.analyzeRiskFactors(features, riskScore);

    return {
      risk_score: riskScore,
      risk_level: this.classifyRiskLevel(riskScore),
      primary_factors: riskFactors.primary,
      mitigation_strategies: riskFactors.mitigation,
      confidence: 0.82 + Math.random() * 0.13,
    };
  }

  private getMitigationStrategies(riskLevel: string, factors: string[]): string[] {
    const strategies: string[] = [];
    
    if (riskLevel === 'high') {
      strategies.push('Consider trying our virtual fitting room');
      strategies.push('Review detailed size chart and measurements');
    }
    
    if (factors.some(f => f.toLowerCase().includes('size'))) {
      strategies.push('Check size recommendations based on your profile');
    }
    
    if (factors.some(f => f.toLowerCase().includes('color'))) {
      strategies.push('View similar items in your preferred colors');
    }
    
    return strategies.length > 0 ? strategies : ['This item has good compatibility with your profile'];
  }

  private engineerReturnFeatures(
    product: Product,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // User historical features
    if (userProfile) {
      features.user_return_rate = userProfile.returnHistory?.length > 0 
        ? userProfile.returnHistory.filter(r => r.reason.includes('size')).length / userProfile.returnHistory.length
        : this.industryAvgReturnRate;
      
      features.purchase_history_length = userProfile.orderHistory?.length || 0;
      features.user_experience = Math.min(1, features.purchase_history_length / 20);
    } else {
      features.user_return_rate = this.industryAvgReturnRate;
      features.purchase_history_length = 0;
      features.user_experience = 0;
    }

    // Product features
    features.product_price_normalized = Math.min(1, product.price / 500);
    features.has_reviews = product.reviews && product.reviews.length > 0 ? 1 : 0;
    features.avg_rating = product.rating ? product.rating / 5 : 0.6;

    // Size compatibility
    if (selectedSize && userProfile?.preferences?.preferredSizes) {
      const preferredSizes = userProfile.preferences.preferredSizes;
      features.size_match = preferredSizes.includes(selectedSize) ? 0 : 0.6;
    } else {
      features.size_match = 0.4; // Moderate risk without size info
    }

    // Style compatibility
    if (product.color && userProfile?.preferences?.favoriteColors) {
      features.color_match = userProfile.preferences.favoriteColors.includes(product.color) ? 0 : 0.3;
    } else {
      features.color_match = 0.2;
    }

    return features;
  }

  private calculateRiskScore(features: Record<string, number>): number {
    // Weighted risk calculation
    const weights = {
      user_return_rate: 0.25,
      size_match: 0.30,
      color_match: 0.15,
      user_experience: -0.10, // Negative weight (more experience = lower risk)
      product_price_normalized: 0.10,
      avg_rating: -0.15, // Negative weight
      has_reviews: -0.05,
    };

    let score = 0.15; // Base risk

    Object.entries(weights).forEach(([feature, weight]) => {
      if (features[feature] !== undefined) {
        score += features[feature] * weight;
      }
    });

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  private classifyRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    return 'high';
  }

  private analyzeRiskFactors(
    features: Record<string, number>,
    riskScore: number
  ): { primary: string[]; mitigation: string[] } {
    const primary: string[] = [];
    const mitigation: string[] = [];

    if (features.size_match > 0.4) {
      primary.push('Size mismatch with user preferences');
      mitigation.push('Consider trying our virtual fitting room or checking the detailed size chart');
    }

    if (features.user_return_rate > 0.3) {
      primary.push('Higher than average return history');
      mitigation.push('Review past purchase patterns to identify sizing trends');
    }

    if (features.color_match > 0.2) {
      primary.push('Color outside usual preferences');
      mitigation.push('View similar items in your preferred colors');
    }

    if (features.avg_rating < 0.7) {
      primary.push('Lower product rating');
      mitigation.push('Check recent customer reviews for detailed feedback');
    }

    if (riskScore < 0.3) {
      mitigation.push('This item has excellent compatibility with your profile!');
    }

    return { primary, mitigation };
  }

  async predictBatchReturns(
    cartItems: CartItem[],
    userProfile: UserProfile | null
  ): Promise<CartRiskAnalysis> {
    const itemPredictions = await Promise.all(cartItems.map(async (item) => ({
      item_id: item.product.id,
      ...(await this.predictReturnRisk(item.product, userProfile, item.selectedSize || item.size)),
    })));

    const totalRisk = itemPredictions.reduce((sum, pred) => sum + pred.risk_score, 0) / itemPredictions.length;

    const riskFactorCounts: Record<string, number> = {};
    itemPredictions.forEach(pred => {
      pred.primary_factors.forEach(factor => {
        riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
      });
    });

    const dominantFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) as Array<[string, number]>;

    const riskDistribution = {
      low: itemPredictions.filter(p => p.risk_level === 'low').length,
      medium: itemPredictions.filter(p => p.risk_level === 'medium').length,
      high: itemPredictions.filter(p => p.risk_level === 'high').length,
    };

    const mitigationRecommendations = itemPredictions
      .filter(pred => pred.risk_score > 0.6)
      .map(pred => ({
        item_id: pred.item_id,
        current_risk: pred.risk_score,
        recommended_actions: pred.primary_factors.map(factor => ({
          action: this.getActionForFactor(factor),
          reason: factor,
          confidence: 0.85,
        })),
        potential_improvement: Math.min(0.4, pred.risk_score * 0.5),
      }));

    return {
      cart_risk_score: totalRisk,
      item_predictions: itemPredictions,
      risk_insights: {
        dominant_risk_factors: dominantFactors,
        risk_distribution: riskDistribution,
      },
      mitigation_recommendations: mitigationRecommendations,
    };
  }

  private getActionForFactor(factor: string): string {
    if (factor.toLowerCase().includes('size')) {
      return 'suggest_alternative_size';
    }
    if (factor.toLowerCase().includes('color')) {
      return 'show_color_alternatives';
    }
    if (factor.toLowerCase().includes('rating')) {
      return 'show_reviews';
    }
    return 'provide_detailed_info';
  }

  /**
   * Validate cart using the Returns Predictor API
   * This is the main entry point for cart validation before checkout
   */
  async validateCart(
    cartItems: CartItem[],
    userId: string
  ): Promise<CartValidationResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/agents/returns-predictor/validate-cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cartItems.map(item => ({
            product: {
              id: item.product.id,
              name: item.product.name,
              brand: item.product.brand,
              price: item.product.price,
              category: item.product.category,
              description: item.product.description,
              rating: item.product.rating,
              reviews: item.product.reviews,
              color: item.product.color,
              sizes: item.product.sizes,
            },
            quantity: item.quantity,
            size: item.selectedSize || item.size,
          })),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to validate cart with API, falling back to local prediction:', error);
      
      // Fallback to local prediction
      const userProfile = await userMemoryService.getUserProfile(userId).catch(() => null);
      const localAnalysis = await this.predictBatchReturns(cartItems, userProfile);
      
      // Transform to API response format
      return {
        success: true,
        assessments: localAnalysis.item_predictions.map((pred, idx) => ({
          returnRisk: pred.risk_score,
          keepProbability: 1 - pred.risk_score,
          riskLevel: pred.risk_level,
          confidence: pred.confidence,
          reason: pred.primary_factors[0] || 'Standard return risk assessment',
          factors: pred.primary_factors.map(factor => ({
            name: factor,
            impact: 0.1,
            description: factor,
          })),
        })),
        summary: {
          averageRisk: localAnalysis.cart_risk_score,
          highRiskItems: localAnalysis.risk_insights?.risk_distribution?.high || 0,
          totalPotentialSavings: 0, // Would calculate based on item values
          recommendations: localAnalysis.mitigation_recommendations
            .flatMap(rec => rec.recommended_actions.map(a => a.reason)),
        },
      };
    }
  }

  /**
   * Assess a single product for return risk using the API
   */
  async assessItem(
    product: Product,
    userId: string,
    quantity: number = 1,
    size?: string
  ): Promise<ReturnRiskAssessment> {
    try {
      const response = await fetch(`${this.API_BASE}/agents/returns-predictor/assess-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: {
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            category: product.category,
            description: product.description,
            rating: product.rating,
            reviews: product.reviews,
          },
          quantity,
          size,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.assessment;
    } catch (error) {
      console.error('Failed to assess item with API, falling back to local prediction:', error);
      
      // Fallback to local prediction
      const userProfile = await userMemoryService.getUserProfile(userId).catch(() => null);
      const localPred = await this.predictReturnRisk(product, userProfile, size);
      
      return {
        returnRisk: localPred.risk_score,
        keepProbability: 1 - localPred.risk_score,
        riskLevel: localPred.risk_level,
        confidence: localPred.confidence,
        reason: localPred.primary_factors[0] || 'Standard return risk assessment',
        factors: localPred.primary_factors.map(factor => ({
          name: factor,
          impact: 0.1,
          description: factor,
        })),
      };
    }
  }
}

export const returnsPredictor = new ReturnsPredictor();
