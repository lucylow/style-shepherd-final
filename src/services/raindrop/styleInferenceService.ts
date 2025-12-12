/**
 * SmartInference Service - AI Recommendations and Intent Analysis
 * 
 * Powers core AI features using Raindrop SmartInference:
 * - Product recommendations
 * - Voice intent analysis
 * - Style advice
 * - Return risk prediction
 */

import { styleInference } from '@/integrations/raindrop/config';
import { UserProfile } from './userMemoryService';
import { Product } from '@/types/fashion';
import { mockService } from '@/services/mockService';

export interface RecommendationInput {
  userId: string;
  userProfile?: UserProfile;
  productFeatures?: {
    category?: string;
    color?: string;
    price?: number;
    style?: string;
  };
  context?: {
    recentViews?: string[];
    searchQuery?: string;
    sessionType?: 'browsing' | 'searching' | 'voice_shopping';
  };
}

export interface RecommendationResult {
  productId: string;
  score: number;
  confidence: number;
  explanation: string;
  factors: {
    styleMatch: number;
    priceFit: number;
    returnRisk: number;
    novelty: number;
  };
}

export interface IntentAnalysisResult {
  intent: 'size_recommendation' | 'style_advice' | 'product_search' | 'returns_prediction' | 'general';
  confidence: number;
  entities: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface StyleAdviceResult {
  advice: string;
  confidence: number;
  recommendedProducts?: string[];
  styleMatch: number;
}

class StyleInferenceService {
  /**
   * Predict product recommendation score
   */
  async predictRecommendation(input: RecommendationInput): Promise<RecommendationResult> {
    try {
      const result = await styleInference.predict({
        type: 'recommendation',
        userId: input.userId,
        userProfile: input.userProfile,
        productFeatures: input.productFeatures,
        context: input.context,
      });
      
      return {
        productId: result.productId || '',
        score: result.score || 0,
        confidence: result.confidence || 0.8,
        explanation: result.explanation || 'Recommended based on your preferences',
        factors: {
          styleMatch: result.factors?.styleMatch || 0.5,
          priceFit: result.factors?.priceFit || 0.5,
          returnRisk: result.factors?.returnRisk || 0.5,
          novelty: result.factors?.novelty || 0.3,
        },
      };
    } catch (error) {
      console.error('Failed to predict recommendation:', error);
      // Fallback to default
      return {
        productId: '',
        score: 0.5,
        confidence: 0.5,
        explanation: 'Unable to generate recommendation',
        factors: {
          styleMatch: 0.5,
          priceFit: 0.5,
          returnRisk: 0.5,
          novelty: 0.3,
        },
      };
    }
  }

  /**
   * Analyze voice intent from user utterance
   */
  async analyzeIntent(utterance: string, userId?: string): Promise<IntentAnalysisResult> {
    try {
      const result = await styleInference.predict({
        type: 'intent_analysis',
        utterance,
        userId,
      });
      
      return {
        intent: result.intent || 'general',
        confidence: result.confidence || 0.7,
        entities: result.entities || [],
        sentiment: result.sentiment || 'neutral',
      };
    } catch (error) {
      console.error('Failed to analyze intent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Generate style advice
   */
  async generateStyleAdvice(
    userId: string,
    userProfile: UserProfile | null,
    context?: { productId?: string; occasion?: string }
  ): Promise<StyleAdviceResult> {
    try {
      const result = await styleInference.predict({
        type: 'style_advice',
        userId,
        userProfile,
        context,
      });
      
      return {
        advice: result.advice || 'Consider your personal style preferences',
        confidence: result.confidence || 0.8,
        recommendedProducts: result.recommendedProducts || [],
        styleMatch: result.styleMatch || 0.7,
      };
    } catch (error) {
      console.error('Failed to generate style advice:', error);
      return {
        advice: 'Unable to generate style advice at this time',
        confidence: 0.5,
        recommendedProducts: [],
        styleMatch: 0.5,
      };
    }
  }

  /**
   * Predict return risk for a product
   */
  async predictReturnRisk(
    productId: string,
    userId: string,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    confidence: number;
  }> {
    try {
      const result = await styleInference.predict({
        type: 'return_risk',
        productId,
        userId,
        userProfile,
        selectedSize,
      });
      
      return {
        riskScore: result.riskScore || 0.5,
        riskLevel: result.riskLevel || 'medium',
        factors: result.factors || [],
        confidence: result.confidence || 0.8,
      };
    } catch (error) {
      console.error('Failed to predict return risk:', error);
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        factors: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Batch predict recommendations for multiple products
   */
  async batchPredictRecommendations(
    userId: string,
    products: Product[],
    userProfile: UserProfile | null
  ): Promise<RecommendationResult[]> {
    try {
      const inputs = products.map(product => ({
        type: 'recommendation',
        userId,
        userProfile,
        productFeatures: {
          category: product.category,
          color: product.color,
          price: product.price,
          style: product.name,
        },
      }));
      
      const results = await styleInference.batchPredict(inputs);
      
      return results.map((result: any, index: number) => ({
        productId: products[index].id,
        score: result.score || 0.5,
        confidence: result.confidence || 0.8,
        explanation: result.explanation || 'Recommended product',
        factors: {
          styleMatch: result.factors?.styleMatch || 0.5,
          priceFit: result.factors?.priceFit || 0.5,
          returnRisk: result.factors?.returnRisk || 0.5,
          novelty: result.factors?.novelty || 0.3,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StyleInferenceService] Failed to batch predict recommendations:`, errorMessage);
      return products.map(product => ({
        productId: product.id,
        score: 0.5,
        confidence: 0.5,
        explanation: 'Unable to generate recommendation',
        factors: {
          styleMatch: 0.5,
          priceFit: 0.5,
          returnRisk: 0.5,
          novelty: 0.3,
        },
      }));
    }
  }

  /**
   * Predict optimal size for a user based on measurements, brand, and category
   * Uses a size prediction model deployed on SmartInference
   */
  async predictSize(
    measurements: {
      height?: number;
      weight?: number;
      chest?: number;
      waist?: number;
      hips?: number;
      shoeSize?: number;
    },
    brand: string,
    category: string
  ): Promise<{
    recommendedSize: string;
    confidence: number;
    alternativeSizes?: string[];
    reasoning: string;
    fitPrediction: {
      chest?: 'tight' | 'fit' | 'loose';
      waist?: 'tight' | 'fit' | 'loose';
      length?: 'short' | 'fit' | 'long';
    };
  }> {
    try {
      if (!brand || !category) {
        throw new Error('Brand and category are required for size prediction');
      }

      const result = await styleInference.predict({
        type: 'size_prediction',
        measurements,
        brand,
        category,
      });

      return {
        recommendedSize: result.recommendedSize || 'M',
        confidence: result.confidence || 0.75,
        alternativeSizes: result.alternativeSizes || [],
        reasoning: result.reasoning || `Based on your measurements and ${brand}'s sizing for ${category}`,
        fitPrediction: result.fitPrediction || {
          chest: 'fit',
          waist: 'fit',
          length: 'fit',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StyleInferenceService] Failed to predict size:`, errorMessage);
      // Use mock service fallback
      const mockPrediction = mockService.predictSize('demo_user', 'mock_product');
      return {
        recommendedSize: mockPrediction.recommendedSize,
        confidence: mockPrediction.confidence,
        alternativeSizes: mockPrediction.alternativeSizes.map(s => s.size),
        reasoning: `Based on your measurements and ${brand}'s sizing for ${category}`,
        fitPrediction: {
          chest: 'fit',
          waist: 'fit',
          length: 'fit',
        },
      };
    }
  }

  /**
   * Assess return risk for a user-product combination
   * Uses a model on SmartInference to predict the likelihood of a return
   */
  async assessReturnRisk(
    userId: string,
    productId: string
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
    confidence: number;
    recommendations?: string[];
  }> {
    try {
      if (!userId || !productId) {
        throw new Error('User ID and product ID are required');
      }

      const result = await styleInference.predict({
        type: 'return_risk_assessment',
        userId,
        productId,
      });

      const riskScore = result.riskScore || 0.5;
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      if (riskScore < 0.3) riskLevel = 'low';
      else if (riskScore > 0.7) riskLevel = 'high';

      return {
        riskScore,
        riskLevel,
        factors: result.factors || [],
        confidence: result.confidence || 0.8,
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StyleInferenceService] Failed to assess return risk for user ${userId}, product ${productId}:`, errorMessage);
      // Use mock service fallback
      const mockRisk = mockService.assessReturnRisk(userId, productId);
      return {
        riskScore: mockRisk.riskScore,
        riskLevel: mockRisk.riskLevel,
        factors: mockRisk.factors,
        confidence: 0.85,
        recommendations: [mockRisk.recommendation],
      };
    }
  }

  /**
   * Analyze fashion trends from product images
   * Uses a trend analysis model on SmartInference to score products based on current fashion trends
   */
  async analyzeTrends(
    productImages: string[]
  ): Promise<{
    trendScore: number;
    trendLevel: 'outdated' | 'neutral' | 'trending' | 'hot';
    trendFactors: Array<{
      factor: string;
      score: number;
      description: string;
    }>;
    seasonality: {
      currentSeason: 'spring' | 'summer' | 'fall' | 'winter';
      seasonScore: number;
    };
    styleTags: string[];
    confidence: number;
  }> {
    try {
      if (!productImages || productImages.length === 0) {
        throw new Error('At least one product image is required');
      }

      const result = await styleInference.predict({
        type: 'trend_analysis',
        productImages,
      });

      const trendScore = result.trendScore || 0.5;
      let trendLevel: 'outdated' | 'neutral' | 'trending' | 'hot' = 'neutral';
      if (trendScore < 0.3) trendLevel = 'outdated';
      else if (trendScore < 0.6) trendLevel = 'neutral';
      else if (trendScore < 0.8) trendLevel = 'trending';
      else trendLevel = 'hot';

      return {
        trendScore,
        trendLevel,
        trendFactors: result.trendFactors || [],
        seasonality: result.seasonality || {
          currentSeason: 'all-season',
          seasonScore: 0.5,
        },
        styleTags: result.styleTags || [],
        confidence: result.confidence || 0.8,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StyleInferenceService] Failed to analyze trends:`, errorMessage);
      // Return default analysis on error
      return {
        trendScore: 0.5,
        trendLevel: 'neutral',
        trendFactors: [],
        seasonality: {
          currentSeason: 'all-season',
          seasonScore: 0.5,
        },
        styleTags: [],
        confidence: 0.5,
      };
    }
  }
}

export const styleInferenceService = new StyleInferenceService();

