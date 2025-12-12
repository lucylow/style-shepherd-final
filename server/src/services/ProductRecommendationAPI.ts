/**
 * Product Recommendation API Service
 * Leverages Vultr GPU instances for ML-powered recommendations
 */

import { createHash } from 'crypto';
import env from '../config/env.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { embedOpenAI, cosineSimilarity, ensureProductEmbedding } from '../lib/embeddings.js';
import {
  ExternalServiceError,
  ApiTimeoutError,
  DatabaseError,
  CacheError,
} from '../lib/errors.js';
import { mockAIService } from './MockAIService.js';

const API_TIMEOUT_MS = 10000; // 10 seconds

export interface UserPreferences {
  favoriteColors?: string[];
  preferredBrands?: string[];
  preferredStyles?: string[];
  preferredSizes?: string[];
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
}

export interface RecommendationContext {
  occasion?: string;
  budget?: number;
  sessionType?: 'browsing' | 'searching' | 'voice_shopping';
  recentViews?: string[];
  searchQuery?: string;
}

export interface RecommendationResult {
  productId: string;
  score: number;
  confidence: number;
  reasons: string[];
  returnRisk: number;
  explain?: {
    sim?: number;
    popularity?: number;
    sizeBonus?: number;
    riskPenalty?: number;
    recency?: number;
  };
}

export class ProductRecommendationAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = env.VULTR_API_ENDPOINT || 'http://localhost:8000';
  }

  /**
   * Get personalized product recommendations
   * Uses Vultr GPU for ML inference
   */
  async getRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): Promise<RecommendationResult[]> {
    // Generate cache key with normalized data for better cache hits
    const normalizedPrefs = this.normalizePreferences(userPreferences);
    const normalizedContext = this.normalizeContext(context);
    const cacheKey = `recommendations:${this.hashCacheKey({ userPreferences: normalizedPrefs, context: normalizedContext })}`;
    
    // Check cache first with longer TTL for similar queries
    try {
      const cached = await vultrValkey.get<RecommendationResult[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`✅ Returning cached recommendations (${cached.length} items)`);
        return cached;
      }
    } catch (cacheError) {
      // Cache errors are non-critical, continue to API call
      console.warn('Cache lookup failed, proceeding to API call:', cacheError);
    }

    try {
      // Call Vultr GPU service for ML inference with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          user_prefs: userPreferences,
          context: context,
          use_gpu: true, // Leverage Vultr GPU capabilities
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr ML API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      const results = await response.json() as RecommendationResult[];

      // Cache results with adaptive TTL based on result quality
      // Higher quality results get longer cache time
      const avgScore = results.length > 0 
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
        : 0;
      const cacheTTL = avgScore > 0.7 ? 3600 : 1800; // 1 hour for high-quality, 30 min for others
      
      try {
        await vultrValkey.set(cacheKey, results, cacheTTL);
      } catch (cacheError) {
        console.warn('Failed to cache recommendations:', cacheError);
      }

      return results;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        // Fallback to database-based recommendations first, then mock if that fails
        console.warn('Vultr recommendation API error, falling back to local logic:', error);
        try {
          return await this.getFallbackRecommendations(userPreferences, context);
        } catch (fallbackError) {
          console.warn('Database fallback also failed, using MockAIService:', fallbackError);
          return this.getMockRecommendations(userPreferences, context);
        }
      }
      
      if (error.name === 'AbortError') {
        // On timeout, try database fallback first, then mock
        try {
          return await this.getFallbackRecommendations(userPreferences, context);
        } catch (fallbackError) {
          console.warn('Database fallback failed after timeout, using MockAIService:', fallbackError);
          return this.getMockRecommendations(userPreferences, context);
        }
      }
      
      // Unknown error, try fallback
      console.warn('Unknown error in recommendation API, falling back:', error);
      try {
        return await this.getFallbackRecommendations(userPreferences, context);
      } catch (fallbackError) {
        console.warn('Database fallback failed, using MockAIService:', fallbackError);
        return this.getMockRecommendations(userPreferences, context);
      }
    }
  }

  /**
   * Fallback recommendation logic using PostgreSQL with enhanced scoring
   */
  private async getFallbackRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): Promise<RecommendationResult[]> {
    try {
      // Enhanced query with better scoring algorithm
      const query = `
        SELECT 
          id as "productId",
          name,
          price,
          category,
          brand,
          color,
          COALESCE(style, '') as style,
          rating,
          reviews_count,
          stock,
          (
            -- Color match (30% weight)
            CASE 
              WHEN $1::text[] IS NOT NULL AND color = ANY($1::text[]) THEN 0.3
              WHEN $1::text[] IS NOT NULL AND LOWER(color) = ANY(SELECT LOWER(unnest($1::text[]))) THEN 0.25
              ELSE 0.05
            END +
            -- Brand match (20% weight)
            CASE 
              WHEN $2::text[] IS NOT NULL AND brand = ANY($2::text[]) THEN 0.2
              WHEN $2::text[] IS NOT NULL AND LOWER(brand) = ANY(SELECT LOWER(unnest($2::text[]))) THEN 0.15
              ELSE 0.05
            END +
            -- Rating score (25% weight)
            CASE 
              WHEN rating >= 4.5 THEN 0.25
              WHEN rating >= 4.0 THEN 0.2
              WHEN rating >= 3.5 THEN 0.15
              WHEN rating >= 3.0 THEN 0.1
              ELSE 0.05
            END +
            -- Review count bonus (10% weight) - more reviews = more trusted
            CASE 
              WHEN reviews_count >= 100 THEN 0.1
              WHEN reviews_count >= 50 THEN 0.08
              WHEN reviews_count >= 20 THEN 0.05
              ELSE 0.02
            END +
            -- Price value score (10% weight) - better value = higher score
            CASE 
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric * 0.7 THEN 0.1
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric THEN 0.08
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric * 1.2 THEN 0.05
              ELSE 0.02
            END +
            -- Stock availability (5% weight)
            CASE 
              WHEN stock >= 10 THEN 0.05
              WHEN stock >= 5 THEN 0.03
              WHEN stock > 0 THEN 0.01
              ELSE 0
            END
          ) as score
        FROM catalog
        WHERE 
          stock > 0
          AND ($3::numeric IS NULL OR price <= $3::numeric * 1.2)
        ORDER BY score DESC, rating DESC, reviews_count DESC
        LIMIT 50
      `;

      const results = await vultrPostgres.query<{
        productId: string;
        score: number;
        name?: string;
        price?: number;
        category?: string;
        brand?: string;
        color?: string;
        style?: string;
        rating?: number;
        reviews_count?: number;
      }>(query, [
        userPreferences.favoriteColors || null,
        userPreferences.preferredBrands || null,
        context.budget || null,
      ]);

      // Apply diversity filtering to avoid too many similar items
      const diversified = this.applyDiversityFilter(results, 20);

      return diversified.map((r) => ({
        productId: r.productId,
        score: Math.min(1.0, r.score), // Normalize score
        confidence: this.calculateConfidence(r),
        reasons: this.generateReasons(r, userPreferences),
        returnRisk: this.estimateReturnRisk(r),
      }));
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      // If database fails, use MockAIService as final fallback
      console.error('Fallback recommendations failed, using MockAIService:', error);
      return this.getMockRecommendations(userPreferences, context);
    }
  }

  /**
   * Mock recommendations using MockAIService (final fallback)
   */
  private getMockRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): RecommendationResult[] {
    console.log('Using MockAIService for recommendations');
    const mockRecs = mockAIService.generateMockRecommendations(userPreferences, context);
    
    return mockRecs.map(rec => ({
      productId: rec.productId,
      score: rec.score,
      confidence: rec.confidence,
      reasons: rec.reasons,
      returnRisk: 0.15, // Low return risk for mock products
    }));
  }

  /**
   * Apply diversity filter to recommendations
   */
  private applyDiversityFilter<T extends { productId: string; category?: string; brand?: string; color?: string }>(
    results: T[],
    limit: number
  ): T[] {
    const selected: T[] = [];
    const usedCategories = new Set<string>();
    const usedBrands = new Set<string>();
    const usedColors = new Set<string>();

    for (const result of results) {
      if (selected.length >= limit) break;

      const category = result.category?.toLowerCase() || '';
      const brand = result.brand?.toLowerCase() || '';
      const color = result.color?.toLowerCase() || '';

      // Allow some duplicates but encourage diversity
      const categoryPenalty = usedCategories.has(category) ? 0.1 : 0;
      const brandPenalty = usedBrands.has(brand) ? 0.05 : 0;
      const colorPenalty = usedColors.has(color) ? 0.05 : 0;

      // Skip if too many duplicates already
      if (categoryPenalty + brandPenalty + colorPenalty > 0.15 && selected.length > 5) {
        continue;
      }

      selected.push(result);
      if (category) usedCategories.add(category);
      if (brand) usedBrands.add(brand);
      if (color) usedColors.add(color);
    }

    return selected;
  }

  /**
   * Calculate confidence score based on product attributes
   */
  private calculateConfidence(product: {
    rating?: number;
    reviews_count?: number;
    score?: number;
  }): number {
    let confidence = 0.5; // Base confidence

    // Rating confidence
    if (product.rating) {
      confidence += (product.rating / 5) * 0.2;
    }

    // Review count confidence (more reviews = higher confidence)
    if (product.reviews_count) {
      const reviewConfidence = Math.min(0.2, (product.reviews_count / 100) * 0.2);
      confidence += reviewConfidence;
    }

    // Score confidence
    if (product.score) {
      confidence += product.score * 0.1;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Generate human-readable reasons for recommendation with enhanced explainability
   */
  private generateReasons(
    product: {
      color?: string;
      brand?: string;
      rating?: number;
      price?: number;
      category?: string;
      style?: string;
      score?: number;
    },
    preferences: UserPreferences
  ): string[] {
    const reasons: string[] = [];
    const scoreBreakdown: string[] = [];

    // Color match explanation
    if (product.color && preferences.favoriteColors?.includes(product.color)) {
      reasons.push(`Matches your preferred color: ${product.color}`);
      scoreBreakdown.push('Color preference match (+30%)');
    } else if (product.color) {
      scoreBreakdown.push(`Color: ${product.color} (not in preferences)`);
    }

    // Brand match explanation
    if (product.brand && preferences.preferredBrands?.includes(product.brand)) {
      reasons.push(`From your favorite brand: ${product.brand}`);
      scoreBreakdown.push('Brand preference match (+20%)');
    } else if (product.brand) {
      scoreBreakdown.push(`Brand: ${product.brand}`);
    }

    // Rating explanation with context
    if (product.rating) {
      if (product.rating >= 4.5) {
        reasons.push(`Highly rated (${product.rating.toFixed(1)}/5.0) - Excellent reviews`);
        scoreBreakdown.push(`Rating: ${product.rating.toFixed(1)}/5.0 (+25%)`);
      } else if (product.rating >= 4.0) {
        reasons.push(`Well-rated (${product.rating.toFixed(1)}/5.0) - Good reviews`);
        scoreBreakdown.push(`Rating: ${product.rating.toFixed(1)}/5.0 (+20%)`);
      } else if (product.rating >= 3.5) {
        reasons.push(`Decent rating (${product.rating.toFixed(1)}/5.0)`);
        scoreBreakdown.push(`Rating: ${product.rating.toFixed(1)}/5.0 (+15%)`);
      } else {
        scoreBreakdown.push(`Rating: ${product.rating.toFixed(1)}/5.0 (lower)`);
      }
    }

    // Price value explanation
    if (product.price && preferences.bodyMeasurements) {
      reasons.push('Good value for money');
      scoreBreakdown.push('Price value score (+10%)');
    }

    // Style match explanation
    if (product.style && preferences.preferredStyles) {
      const matchingStyles = preferences.preferredStyles.filter((style: string) =>
        product.style?.toLowerCase().includes(style.toLowerCase()) ||
        style.toLowerCase().includes(product.style?.toLowerCase() || '')
      );
      if (matchingStyles.length > 0) {
        reasons.push(`Matches your style preferences: ${matchingStyles.join(', ')}`);
        scoreBreakdown.push('Style match (+15%)');
      }
    }

    // Overall score explanation
    if (product.score !== undefined) {
      const scorePercent = Math.round(product.score * 100);
      if (scorePercent >= 80) {
        reasons.push(`Strong match (${scorePercent}% compatibility)`);
      } else if (scorePercent >= 60) {
        reasons.push(`Good match (${scorePercent}% compatibility)`);
      }
    }

    // Add detailed breakdown for transparency
    if (scoreBreakdown.length > 0 && reasons.length < 3) {
      reasons.push(`Score breakdown: ${scoreBreakdown.slice(0, 2).join(', ')}`);
    }

    return reasons.length > 0 ? reasons : ['Recommended based on your preferences and our analysis'];
  }

  /**
   * Estimate return risk for a product
   */
  private estimateReturnRisk(product: {
    rating?: number;
    reviews_count?: number;
    score?: number;
  }): number {
    let risk = 0.25; // Base risk

    // Lower rating = higher risk
    if (product.rating) {
      if (product.rating < 3.0) {
        risk += 0.15;
      } else if (product.rating < 3.5) {
        risk += 0.1;
      } else if (product.rating >= 4.5) {
        risk -= 0.1;
      }
    }

    // Fewer reviews = higher uncertainty = slightly higher risk
    if (product.reviews_count && product.reviews_count < 10) {
      risk += 0.05;
    }

    return Math.max(0.1, Math.min(0.6, risk));
  }

  /**
   * Visual similarity search using Vultr GPU
   */
  async findSimilarProducts(imageUrl: string, limit: number = 10): Promise<RecommendationResult[]> {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/visual-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          limit,
          use_gpu: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr Visual Search API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      return await response.json() as RecommendationResult[];
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiTimeoutError('Vultr Visual Search API', API_TIMEOUT_MS, `${this.baseURL}/visual-search`);
      }
      
      // Unknown error, return empty array (graceful degradation)
      console.error('Visual search error:', error);
      
      // Log error details for debugging
      if (error instanceof Error) {
        console.error('Visual search error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      }
      
      return [];
    }
  }

  /**
   * Size prediction using ML model on Vultr GPU
   */
  async predictOptimalSize(
    bodyMeasurements: UserPreferences['bodyMeasurements'],
    productId: string
  ): Promise<{ recommendedSize: string; confidence: number }> {
    if (!bodyMeasurements) {
      return { recommendedSize: 'M', confidence: 0.5 };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/size-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          measurements: bodyMeasurements,
          product_id: productId,
          use_gpu: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr Size Prediction API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      return await response.json() as { recommendedSize: string; confidence: number };
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiTimeoutError('Vultr Size Prediction API', API_TIMEOUT_MS, `${this.baseURL}/size-prediction`);
      }
      
      // For size prediction, return default on error (graceful degradation)
      console.warn('Size prediction error, using default:', error);
      return { recommendedSize: 'M', confidence: 0.5 };
    }
  }

  /**
   * Batch get recommendations for multiple users (optimized for performance)
   * Enhanced with better caching and parallel processing
   */
  async batchGetRecommendations(
    requests: Array<{ userPreferences: UserPreferences; context: RecommendationContext; userId?: string }>
  ): Promise<RecommendationResult[][]> {
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    const CONCURRENCY_LIMIT = 5; // Process 5 batches concurrently
    const results: RecommendationResult[][] = [];

    // Split into batches
    const batches: Array<typeof requests> = [];
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      batches.push(requests.slice(i, i + BATCH_SIZE));
    }

    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
      const concurrentBatches = batches.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        concurrentBatches.map(async (batch) => {
          // Process batch items in parallel
          const batchResults = await Promise.all(
            batch.map((req) => {
              // Check cache first for each request
              const cacheKey = `recommendations:${JSON.stringify({ userPreferences: req.userPreferences, context: req.context })}`;
              return vultrValkey.get<RecommendationResult[]>(cacheKey)
                .then(cached => {
                  if (cached) {
                    return cached;
                  }
                  return this.getRecommendations(req.userPreferences, req.context);
                })
                .catch(() => this.getRecommendations(req.userPreferences, req.context));
            })
          );
          return batchResults;
        })
      );
      results.push(...batchResults.flat());
    }

    return results;
  }

  /**
   * Record user feedback for recommendations (for continuous learning)
   */
  async recordFeedback(
    userId: string,
    productId: string,
    feedback: {
      type: 'view' | 'click' | 'purchase' | 'skip' | 'dismiss';
      recommendationId?: string;
      timestamp?: Date;
    }
  ): Promise<void> {
    try {
      // Store feedback in database for ML model training
      await vultrPostgres.query(
        `INSERT INTO recommendation_feedback 
         (user_id, product_id, feedback_type, recommendation_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          productId,
          feedback.type,
          feedback.recommendationId || null,
          feedback.timestamp || new Date(),
        ]
      );

      // Note: Cache invalidation would be implemented with proper cache key tracking
      // For now, cache will expire naturally based on TTL
    } catch (error: any) {
      // Non-critical operation, log but don't throw
      console.error('Failed to record feedback:', error);
      
      // Log specific error types for monitoring
      if (error instanceof DatabaseError) {
        console.warn('Database error when recording feedback - this is non-critical');
      } else if (error?.code === 'ECONNREFUSED') {
        console.warn('Database connection refused when recording feedback');
      }
      
      // Don't throw - feedback recording is non-critical for user experience
    }
  }

  /**
   * Get personalized recommendations with learning from past interactions
   * Enhanced with real-time learning and explainability
   */
  async getRecommendationsWithLearning(
    userPreferences: UserPreferences,
    context: RecommendationContext,
    userId?: string
  ): Promise<RecommendationResult[]> {
    // Get base recommendations
    const recommendations = await this.getRecommendations(userPreferences, context);

    if (!userId) {
      return recommendations;
    }

    // Enhance with learning from user's past interactions
    try {
      // First check if table exists, if not return base recommendations
      let userInteractions: any[] = [];
      let interactionStats: any = null;
      try {
        // Get detailed interaction data
        const [interactions, stats] = await Promise.all([
          vultrPostgres.query(
            `SELECT product_id, feedback_type, COUNT(*) as interaction_count, MAX(created_at) as last_interaction
             FROM recommendation_feedback
             WHERE user_id = $1
             GROUP BY product_id, feedback_type
             ORDER BY last_interaction DESC`,
            [userId]
          ),
          vultrPostgres.query(
            `SELECT 
               COUNT(CASE WHEN feedback_type = 'purchase' THEN 1 END) as purchases,
               COUNT(CASE WHEN feedback_type = 'click' THEN 1 END) as clicks,
               COUNT(CASE WHEN feedback_type = 'view' THEN 1 END) as views,
               COUNT(CASE WHEN feedback_type = 'skip' THEN 1 END) as skips,
               COUNT(CASE WHEN feedback_type = 'dismiss' THEN 1 END) as dismisses,
               COUNT(*) as total_interactions
             FROM recommendation_feedback
             WHERE user_id = $1`,
            [userId]
          ).catch(() => null)
        ]);

        userInteractions = interactions || [];
        interactionStats = stats?.[0] || null;
        } catch (tableError: any) {
          // Table might not exist yet, that's okay
          if (!tableError.message?.includes('does not exist') && 
              !tableError.message?.includes('relation') &&
              !tableError.message?.includes('table')) {
            // If it's not a "table doesn't exist" error, log it but continue
            console.warn('Error fetching user interactions (non-critical):', tableError);
          } else {
            console.log('recommendation_feedback table not found, using base recommendations');
          }
        }

      // Build interaction maps with weights (recent interactions weighted more)
      const positiveProducts = new Map<string, number>();
      const negativeProducts = new Map<string, number>();

      userInteractions.forEach((i: any) => {
        const productId = i.product_id;
        const weight = this.calculateInteractionWeight(i.last_interaction, i.interaction_count);
        
        if (i.feedback_type === 'purchase' || i.feedback_type === 'click') {
          const currentWeight = positiveProducts.get(productId) || 0;
          positiveProducts.set(productId, currentWeight + weight);
        } else if (i.feedback_type === 'skip' || i.feedback_type === 'dismiss') {
          const currentWeight = negativeProducts.get(productId) || 0;
          negativeProducts.set(productId, currentWeight + weight);
        }
      });

      // Calculate learning strength based on interaction history
      const learningStrength = this.calculateLearningStrength(interactionStats);

      // Apply learning adjustments with explainability
      return recommendations.map((rec) => {
        let adjustedScore = rec.score;
        const learningReasons: string[] = [];
        
        const positiveWeight = positiveProducts.get(rec.productId) || 0;
        const negativeWeight = negativeProducts.get(rec.productId) || 0;

        if (positiveWeight > 0) {
          // Boost based on positive interactions, scaled by learning strength
          const boost = 1 + (positiveWeight * 0.15 * learningStrength);
          adjustedScore *= boost;
          learningReasons.push(`Boosted based on your past positive interactions (${Math.round(positiveWeight * 100)}% confidence)`);
        }
        
        if (negativeWeight > 0) {
          // Reduce based on negative interactions
          const reduction = 1 - (negativeWeight * 0.2 * learningStrength);
          adjustedScore *= Math.max(0.5, reduction); // Don't reduce below 50%
          learningReasons.push(`Adjusted based on your past preferences`);
        }

        // Add learning explanation if we have enough data
        if (interactionStats && interactionStats.total_interactions > 5) {
          const personalizationLevel = Math.min(100, Math.round(learningStrength * 100));
          learningReasons.push(`Personalized using ${interactionStats.total_interactions} past interactions (${personalizationLevel}% confidence)`);
        }

        return {
          ...rec,
          score: Math.min(1.0, adjustedScore),
          confidence: Math.min(0.95, rec.confidence + (learningStrength * 0.1)), // Boost confidence with learning
          reasons: [
            ...rec.reasons,
            ...learningReasons,
          ],
        };
      }).sort((a, b) => b.score - a.score); // Re-sort by adjusted score
    } catch (error: any) {
      // Learning enhancement is non-critical, return base recommendations
      console.error('Failed to apply learning, returning base recommendations:', error);
      
      // Log error details for debugging
      if (error instanceof DatabaseError) {
        console.warn('Database error when applying learning - using base recommendations');
      } else if (error instanceof Error) {
        console.error('Learning application error:', error.message);
      }
      
      return recommendations;
    }
  }

  /**
   * Calculate interaction weight based on recency and frequency
   */
  private calculateInteractionWeight(lastInteraction: string | Date, count: number): number {
    const now = Date.now();
    const interactionTime = typeof lastInteraction === 'string' 
      ? new Date(lastInteraction).getTime() 
      : lastInteraction.getTime();
    
    const daysSince = (now - interactionTime) / (1000 * 60 * 60 * 24);
    
    // Recency decay: more recent = higher weight
    const recencyWeight = Math.max(0.3, 1 - (daysSince / 90)); // Decay over 90 days
    
    // Frequency boost: more interactions = higher confidence
    const frequencyWeight = Math.min(1.0, count / 5); // Cap at 5 interactions
    
    return recencyWeight * frequencyWeight;
  }

  /**
   * Calculate learning strength based on user interaction history
   */
  private calculateLearningStrength(stats: any): number {
    if (!stats || !stats.total_interactions) {
      return 0.3; // Low confidence for new users
    }

    const total = stats.total_interactions;
    const positive = (stats.purchases || 0) + (stats.clicks || 0);
    const negative = (stats.skips || 0) + (stats.dismisses || 0);
    
    // More interactions = higher learning strength
    const volumeStrength = Math.min(1.0, total / 20); // Cap at 20 interactions
    
    // Balanced positive/negative ratio = higher confidence
    const ratioStrength = total > 0 
      ? 1 - Math.abs((positive - negative) / total) // Closer to balanced = better
      : 0.5;
    
    return (volumeStrength * 0.7) + (ratioStrength * 0.3);
  }

  /**
   * Normalize user preferences for better cache hits
   */
  private normalizePreferences(prefs: UserPreferences): UserPreferences {
    return {
      favoriteColors: prefs.favoriteColors?.map(c => c.toLowerCase().trim()).sort(),
      preferredBrands: prefs.preferredBrands?.map(b => b.toLowerCase().trim()).sort(),
      preferredStyles: prefs.preferredStyles?.map(s => s.toLowerCase().trim()).sort(),
      preferredSizes: prefs.preferredSizes?.map(s => s.toUpperCase().trim()).sort(),
      bodyMeasurements: prefs.bodyMeasurements ? {
        height: prefs.bodyMeasurements.height ? Math.round(prefs.bodyMeasurements.height) : undefined,
        weight: prefs.bodyMeasurements.weight ? Math.round(prefs.bodyMeasurements.weight) : undefined,
        chest: prefs.bodyMeasurements.chest ? Math.round(prefs.bodyMeasurements.chest) : undefined,
        waist: prefs.bodyMeasurements.waist ? Math.round(prefs.bodyMeasurements.waist) : undefined,
        hips: prefs.bodyMeasurements.hips ? Math.round(prefs.bodyMeasurements.hips) : undefined,
      } : undefined,
    };
  }

  /**
   * Normalize context for better cache hits
   */
  private normalizeContext(context: RecommendationContext): RecommendationContext {
    return {
      occasion: context.occasion?.toLowerCase().trim(),
      budget: context.budget ? Math.round(context.budget / 10) * 10 : undefined, // Round to nearest $10
      sessionType: context.sessionType,
      recentViews: context.recentViews?.slice(0, 10).sort(), // Limit and sort
      searchQuery: context.searchQuery?.toLowerCase().trim(),
    };
  }

  /**
   * Hash cache key for consistent lookups
   */
  private hashCacheKey(data: any): string {
    const str = JSON.stringify(data);
    return createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Hybrid recommendation system with embeddings + business rules
   * Combines semantic similarity (RAG-style) with collaborative signals and business rules
   */
  async getHybridRecommendations(
    userQuery: string,
    userPreferences: UserPreferences,
    context: RecommendationContext,
    userId?: string
  ): Promise<RecommendationResult[]> {
    const RECOMMEND_TOP_K = Number(process.env.RECOMMEND_TOP_K || 50);
    const RETURN_PENALTY_WEIGHT = Number(process.env.RECOMMEND_RETURN_PENALTY_WEIGHT || 0.7);
    const SIZE_BONUS = Number(process.env.RECOMMEND_SIZE_BONUS || 1.2);
    const RECENCY_BOOST = Number(process.env.RECOMMEND_RECENCY_BOOST || 1.1);

    try {
      // 1. Generate candidates (filter by category, stock, price range)
      const candidates = await this.getCandidateProducts({
        category: context.occasion ? this.mapOccasionToCategory(context.occasion) : undefined,
        budgetMaxCents: context.budget ? Math.round(context.budget * 100) : undefined,
        brandWhitelist: userPreferences.preferredBrands,
      });

      if (candidates.length === 0) {
        return [];
      }

      // 2. Compute embedding for user query
      const [queryEmbedding] = await embedOpenAI([userQuery || context.searchQuery || 'fashion items']);

      // 3. Score each candidate
      const scored: Array<{
        product: any;
        score: number;
        explain: {
          sim: number;
          popularity: number;
          sizeBonus: number;
          riskPenalty: number;
          recency: number;
        };
      }> = [];

      for (const product of candidates) {
        // Get or generate product embedding
        let productEmbedding: number[];
        if (product.embedding && Array.isArray(product.embedding)) {
          productEmbedding = product.embedding;
        } else {
          // Generate embedding and optionally persist
          productEmbedding = await ensureProductEmbedding({
            id: product.id,
            name: product.name,
            description: product.description,
            brand: product.brand,
            category: product.category,
          });
          
          // Persist embedding asynchronously (non-blocking)
          vultrPostgres.query(
            `UPDATE catalog SET embedding = $1 WHERE id = $2`,
            [JSON.stringify(productEmbedding), product.id]
          ).catch(err => console.warn('Failed to persist embedding:', err));
        }

        // Calculate semantic similarity
        const sim = cosineSimilarity(queryEmbedding, productEmbedding);

        // Business rule multipliers
        const sizeBonus = this.calculateSizeMatchBonus(product, userPreferences);
        const riskPenalty = this.calculateReturnRiskPenalty(product, RETURN_PENALTY_WEIGHT);
        const recency = this.calculateRecencyBoost(product, RECENCY_BOOST);
        const popularity = Number(product.popularity || 0.5);

        // Hybrid score: semantic similarity + popularity, then apply business multipliers
        const baseScore = (sim * 0.7) + (popularity * 0.3);
        const finalScore = baseScore * sizeBonus * riskPenalty * recency;

        scored.push({
          product,
          score: finalScore,
          explain: {
            sim: Number(sim.toFixed(4)),
            popularity: Number(popularity.toFixed(4)),
            sizeBonus,
            riskPenalty,
            recency,
          },
        });
      }

      // 4. Diversity post-process: avoid brand repeats
      scored.sort((a, b) => b.score - a.score);
      const final: typeof scored = [];
      const brandSeen = new Set<string>();

      for (const item of scored) {
        const brand = item.product.brand?.toLowerCase() || 'unknown';
        if (!brandSeen.has(brand) || final.length < 5) {
          final.push(item);
          brandSeen.add(brand);
        } else {
          // Deprioritize repeated brand
          item.score *= 0.85;
          final.push(item);
        }
      }

      // 5. Return top N with explainability
      const topResults = final.slice(0, 12).map(item => ({
        productId: item.product.id,
        score: Number(item.score.toFixed(4)),
        confidence: this.calculateConfidence(item.product),
        reasons: this.generateHybridReasons(item.product, item.explain, userPreferences),
        returnRisk: Number((item.product.return_risk || this.estimateReturnRisk(item.product)).toFixed(3)),
        explain: item.explain,
      }));

      // Log impressions for metrics
      if (userId) {
        await this.logRecommendationImpressions(userId, topResults.map(r => r.productId)).catch(
          err => console.warn('Failed to log impressions:', err)
        );
      }

      return topResults;
    } catch (error: any) {
      console.error('Hybrid recommendation error:', error);
      // Fallback to existing recommendation method
      return this.getRecommendations(userPreferences, context);
    }
  }

  /**
   * Get candidate products from database
   */
  private async getCandidateProducts(filters: {
    category?: string;
    budgetMaxCents?: number;
    brandWhitelist?: string[];
  }): Promise<any[]> {
    const RECOMMEND_TOP_K = Number(process.env.RECOMMEND_TOP_K || 50);
    
    let whereClause = 'WHERE stock > 0';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.brandWhitelist && filters.brandWhitelist.length > 0) {
      whereClause += ` AND brand = ANY($${paramIndex})`;
      params.push(filters.brandWhitelist);
      paramIndex++;
    }

    if (filters.budgetMaxCents) {
      whereClause += ` AND price <= $${paramIndex}`;
      params.push(filters.budgetMaxCents / 100); // Convert cents to dollars
      paramIndex++;
    }

    const query = `
      SELECT 
        id, name, description, brand, category, price, 
        sizes, stock, image_url, rating, reviews_count,
        embedding, popularity, return_risk, created_at
      FROM catalog
      ${whereClause}
      ORDER BY popularity DESC, rating DESC
      LIMIT $${paramIndex}
    `;
    params.push(RECOMMEND_TOP_K * 3); // Oversample for diversification

    const results = await vultrPostgres.query(query, params);
    return results.map((r: any) => ({
      ...r,
      embedding: r.embedding ? (typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding) : null,
      sizes: typeof r.sizes === 'string' ? JSON.parse(r.sizes) : (r.sizes || []),
    }));
  }

  /**
   * Calculate size match bonus
   */
  private calculateSizeMatchBonus(product: any, preferences: UserPreferences): number {
    const SIZE_BONUS = Number(process.env.RECOMMEND_SIZE_BONUS || 1.2);
    
    if (!preferences.preferredSizes || preferences.preferredSizes.length === 0) {
      return 1.0;
    }

    if (!product.sizes || product.sizes.length === 0) {
      return 1.0;
    }

    const productSizes = product.sizes.map((s: string) => s.toUpperCase());
    const preferredSizes = preferences.preferredSizes.map(s => s.toUpperCase());

    const hasMatch = preferredSizes.some(size => productSizes.includes(size));
    return hasMatch ? SIZE_BONUS : 1.0;
  }

  /**
   * Calculate return risk penalty
   */
  private calculateReturnRiskPenalty(product: any, weight: number): number {
    const risk = product.return_risk || this.estimateReturnRisk(product);
    return 1 - (weight * risk);
  }

  /**
   * Calculate recency boost
   */
  private calculateRecencyBoost(product: any, boost: number): number {
    if (!product.created_at) {
      return 1.0;
    }

    const ageMs = Date.now() - new Date(product.created_at).getTime();
    const day = 24 * 3600000;

    if (ageMs < 7 * day) {
      return boost; // New in last week
    }
    if (ageMs < 30 * day) {
      return 1.05; // New in last month
    }
    return 1.0;
  }

  /**
   * Generate hybrid recommendation reasons
   */
  private generateHybridReasons(
    product: any,
    explain: { sim: number; popularity: number; sizeBonus: number; riskPenalty: number; recency: number },
    preferences: UserPreferences
  ): string[] {
    const reasons: string[] = [];

    if (explain.sim > 0.7) {
      reasons.push(`Strong semantic match (${Math.round(explain.sim * 100)}% similarity)`);
    } else if (explain.sim > 0.5) {
      reasons.push(`Good semantic match (${Math.round(explain.sim * 100)}% similarity)`);
    }

    if (explain.sizeBonus > 1.0) {
      reasons.push(`Matches your preferred size`);
    }

    if (explain.riskPenalty > 0.8) {
      reasons.push(`Low return risk`);
    }

    if (explain.recency > 1.0) {
      reasons.push(`Newly added item`);
    }

    if (product.rating && product.rating >= 4.0) {
      reasons.push(`Highly rated (${product.rating.toFixed(1)}/5.0)`);
    }

    if (preferences.preferredBrands?.includes(product.brand)) {
      reasons.push(`From your favorite brand: ${product.brand}`);
    }

    if (reasons.length === 0) {
      reasons.push('Recommended based on your preferences');
    }

    return reasons;
  }

  /**
   * Map occasion to category
   */
  private mapOccasionToCategory(occasion: string): string | undefined {
    const mapping: Record<string, string> = {
      'casual': 'casual',
      'formal': 'formal',
      'work': 'business',
      'party': 'party',
      'wedding': 'formal',
      'beach': 'swimwear',
      'sport': 'activewear',
    };
    return mapping[occasion.toLowerCase()];
  }

  /**
   * Log recommendation impressions for metrics
   */
  private async logRecommendationImpressions(userId: string, productIds: string[]): Promise<void> {
    try {
      // Use parameterized query to prevent SQL injection
      const insertPromises = productIds.map((productId, idx) =>
        vultrPostgres.query(
          `INSERT INTO interactions (user_id, product_id, type, value, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [userId, productId, 'recommendation_impression', idx + 1, JSON.stringify({})]
        )
      );

      await Promise.all(insertPromises);
    } catch (error) {
      // Non-critical, log but don't throw
      console.warn('Failed to log recommendation impressions:', error);
    }
  }
}

export const productRecommendationAPI = new ProductRecommendationAPI();

