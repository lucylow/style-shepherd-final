/**
 * Feature Extractor - Extracts ML features from cart items and user history
 * Transforms raw data into features for XGBoost classifier
 */

import { userMemory, orderSQL } from '../../../lib/raindrop-config.js';
import { vultrValkey } from '../../../lib/vultr-valkey.js';
import type { Product } from '../SearchAgent.js';
import type { CartItem, ReturnHistory, MLFeatures, UserReturnProfile } from './types.js';

export class FeatureExtractor {
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly BASE_CATEGORY_RISKS: Record<string, number> = {
    'pants': 0.65,
    'bottoms': 0.65,
    'jeans': 0.60,
    'trousers': 0.62,
    'tops': 0.35,
    'shirts': 0.30,
    'dresses': 0.45,
    'shoes': 0.55,
    'accessories': 0.20,
  };

  /**
   * Extract ML features for a cart item
   */
  async extractFeatures(
    cartItem: CartItem,
    userHistory: ReturnHistory[],
    userProfile: UserReturnProfile | null
  ): Promise<MLFeatures> {
    const product = cartItem.product;
    const category = product.category?.toLowerCase() || 'unknown';

    // User features
    const userFeatures = await this.extractUserFeatures(userProfile, category, cartItem.size);

    // Product features
    const productFeatures = await this.extractProductFeatures(product);

    // Context features
    const contextFeatures = await this.extractContextFeatures(cartItem, userHistory);

    return {
      ...userFeatures,
      ...productFeatures,
      ...contextFeatures,
    };
  }

  /**
   * Extract user-related features
   */
  private async extractUserFeatures(
    userProfile: UserReturnProfile | null,
    category: string,
    selectedSize?: string
  ) {
    const baseReturnRate = userProfile?.returnRate || 0.25; // Industry average
    const categoryReturnRate = userProfile?.categoryReturnRates[category] || this.BASE_CATEGORY_RISKS[category] || 0.35;
    
    // Size consistency: how often user buys same size for this category
    let sizeConsistency = 0.5; // Default moderate consistency
    if (userProfile && selectedSize) {
      const sizeFrequency = userProfile.sizeBrackets[selectedSize] || 0;
      const totalOrders = userProfile.totalOrders || 1;
      sizeConsistency = Math.min(1.0, sizeFrequency / Math.max(5, totalOrders * 0.3));
    }

    // Location risk (simplified - in production would use real location data)
    const locationRisk = 0.15; // Base risk

    return {
      user_return_rate: baseReturnRate,
      user_category_return_rate: categoryReturnRate,
      user_size_consistency: sizeConsistency,
      user_location_risk: locationRisk,
    };
  }

  /**
   * Extract product-related features
   */
  private async extractProductFeatures(product: Product) {
    const category = product.category?.toLowerCase() || 'unknown';
    const categoryRisk = this.BASE_CATEGORY_RISKS[category] || 0.35;

    // Extract fabric stretch from description/attributes
    const fabricStretch = this.extractFabricStretch(product);
    const materialElasticity = fabricStretch.stretchIndex;
    const materialQualityScore = this.estimateMaterialQuality(product, fabricStretch);

    // Analyze reviews for sentiment and size mentions
    const reviewAnalysis = this.analyzeReviews(product);

    // Brand keep rate (would come from historical data in production)
    const brandKeepRate = await this.getBrandKeepRate(product.brand);

    return {
      fabric_stretch_index: fabricStretch.stretchIndex,
      review_sentiment_score: reviewAnalysis.sentiment,
      review_size_mentions: reviewAnalysis.sizeMentions,
      category_risk: categoryRisk,
      brand_keep_rate: brandKeepRate,
      material_elasticity: materialElasticity,
      material_quality_score: materialQualityScore,
    };
  }

  /**
   * Extract fabric stretch information from product
   */
  private extractFabricStretch(product: Product): { stretchIndex: number; material: string } {
    const description = (product.description || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const combined = `${description} ${name}`;

    // Stretchy materials
    const stretchyKeywords = ['stretch', 'elastic', 'spandex', 'elastane', 'lycra', 'flex'];
    const hasStretch = stretchyKeywords.some(kw => combined.includes(kw));

    // Extract percentage if mentioned (e.g., "2% stretch", "20% spandex")
    const stretchMatch = combined.match(/(\d+)%\s*(?:stretch|spandex|elastane|lycra)/i);
    let stretchPercent = 0;
    if (stretchMatch) {
      stretchPercent = parseInt(stretchMatch[1], 10);
    } else if (hasStretch) {
      stretchPercent = 5; // Default stretch if mentioned but no percentage
    }

    // Normalize to 0-1 (20%+ stretch = very stretchy = low return risk)
    const stretchIndex = Math.min(1.0, stretchPercent / 20);

    // Material type
    const materials = ['cotton', 'linen', 'silk', 'denim', 'wool', 'polyester', 'nylon', 'jersey', 'leather'];
    const foundMaterial = materials.find(m => combined.includes(m)) || 'unknown';

    return { stretchIndex, material: foundMaterial };
  }

  /**
   * Estimate material quality score
   */
  private estimateMaterialQuality(product: Product, fabricStretch: { stretchIndex: number; material: string }): number {
    let score = 0.5; // Base quality

    // Stretchy materials reduce return risk (better fit)
    if (fabricStretch.stretchIndex > 0.15) {
      score += 0.15;
    }

    // Premium materials
    const premiumMaterials = ['silk', 'wool', 'leather'];
    if (premiumMaterials.includes(fabricStretch.material)) {
      score += 0.1;
    }

    // Product rating influences quality perception
    if (product.rating) {
      score += (product.rating - 3.0) / 10; // 4.0+ rating = +0.1, 5.0 = +0.2
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Analyze product reviews for sentiment and size-related mentions
   */
  private analyzeReviews(product: Product): { sentiment: number; sizeMentions: number } {
    // If reviews exist in product data
    if (product.reviews && Array.isArray(product.reviews)) {
      let totalSentiment = 0;
      let sizeMentions = 0;

      for (const review of product.reviews) {
        const comment = (review.comment || '').toLowerCase();
        
        // Sentiment from rating
        const rating = review.rating || 3.0;
        totalSentiment += (rating - 3.0) / 2; // Normalize: 5.0 = +1.0, 1.0 = -1.0

        // Size mentions (increases risk)
        const sizeKeywords = ['too small', 'too large', 'runs small', 'runs large', 'size', 'fit'];
        if (sizeKeywords.some(kw => comment.includes(kw))) {
          sizeMentions++;
        }
      }

      const avgSentiment = product.reviews.length > 0 
        ? totalSentiment / product.reviews.length 
        : 0;
      
      return {
        sentiment: Math.max(-1.0, Math.min(1.0, avgSentiment)),
        sizeMentions,
      };
    }

    // Fallback: use overall rating if available
    if (product.rating) {
      return {
        sentiment: (product.rating - 3.0) / 2,
        sizeMentions: 0,
      };
    }

    return { sentiment: 0, sizeMentions: 0 };
  }

  /**
   * Get brand keep rate from historical data (cached)
   */
  private async getBrandKeepRate(brand: string): Promise<number> {
    const cacheKey = `brand-keep-rate:${brand}`;
    
    try {
      const cached = await vultrValkey.get<number>(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (error) {
      // Cache miss, continue
    }

    // Query database for brand return data
    try {
      if (orderSQL && orderSQL.query) {
        const orders = await orderSQL.query(
          `SELECT o.items::jsonb as items, r.product_id 
           FROM orders o
           LEFT JOIN returns r ON o.order_id = r.order_id
           WHERE o.items::jsonb @> $1::jsonb`,
          [JSON.stringify([{ brand }])]
        );

        if (orders.length > 0) {
          const returns = orders.filter((o: any) => o.product_id);
          const keepRate = 1 - (returns.length / orders.length);
          
          // Cache result
          try {
            await vultrValkey.set(cacheKey, keepRate, this.CACHE_TTL);
          } catch (error) {
            // Non-critical
          }
          
          return Math.max(0.5, Math.min(1.0, keepRate));
        }
      }
    } catch (error) {
      console.warn('Failed to get brand keep rate:', error);
    }

    // Default keep rate (would be brand-specific in production)
    const defaultKeepRates: Record<string, number> = {
      'Zara': 0.75,
      'H&M': 0.70,
      'Nike': 0.85,
      'Adidas': 0.82,
    };

    return defaultKeepRates[brand] || 0.75; // Default 75% keep rate
  }

  /**
   * Extract context features (seasonality, promotions, basket diversity)
   */
  private async extractContextFeatures(
    cartItem: CartItem,
    userHistory: ReturnHistory[]
  ) {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // Seasonality: Holiday periods (Nov-Dec) have higher return rates
    let seasonalityFactor = 0.15; // Base risk
    if (month === 11 || month === 12) {
      seasonalityFactor = 0.288; // 28.8% spike during holidays
    }

    // Promotion type (sale items have different return patterns)
    const isOnSale = cartItem.product.originalPrice && 
                     cartItem.product.price < cartItem.product.originalPrice;
    const promotionType = isOnSale ? 0.8 : 1.0; // Sale items = 0.8

    // Basket diversity (single item vs bundle - simplified for cart item)
    const basketDiversity = 0.5; // Would calculate from full cart

    return {
      seasonality_factor: seasonalityFactor,
      promotion_type: promotionType,
      basket_diversity: basketDiversity,
    };
  }

  /**
   * Build user return profile from history
   */
  async buildUserReturnProfile(userId: string): Promise<UserReturnProfile | null> {
    const cacheKey = `user-return-profile:${userId}`;
    
    try {
      const cached = await vultrValkey.get<UserReturnProfile>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss, continue
    }

    try {
      // Get orders and returns from database
      if (orderSQL && orderSQL.query) {
        const orders = await orderSQL.query(
          `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [userId]
        );

        const returns = await orderSQL.query(
          `SELECT * FROM returns WHERE user_id = $1`,
          [userId]
        );

        // Calculate category return rates
        const categoryReturnRates: Record<string, { total: number; returned: number }> = {};
        const sizeBrackets: Record<string, number> = {};
        const commonReasons: string[] = [];

        for (const order of orders) {
          const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
          for (const item of items) {
            const category = (item.category || 'unknown').toLowerCase();
            if (!categoryReturnRates[category]) {
              categoryReturnRates[category] = { total: 0, returned: 0 };
            }
            categoryReturnRates[category].total++;

            if (item.size) {
              sizeBrackets[item.size] = (sizeBrackets[item.size] || 0) + 1;
            }
          }
        }

        for (const ret of returns) {
          const category = (ret.category || 'unknown').toLowerCase();
          if (categoryReturnRates[category]) {
            categoryReturnRates[category].returned++;
          }
          if (ret.reason) {
            commonReasons.push(ret.reason);
          }
        }

        // Convert to return rates
        const categoryRates: Record<string, number> = {};
        for (const [category, data] of Object.entries(categoryReturnRates)) {
          categoryRates[category] = data.total > 0 ? data.returned / data.total : 0;
        }

        const profile: UserReturnProfile = {
          userId,
          totalOrders: orders.length,
          totalReturns: returns.length,
          returnRate: orders.length > 0 ? returns.length / orders.length : 0,
          categoryReturnRates: categoryRates,
          sizeBrackets,
          commonReasons,
        };

        // Cache profile
        try {
          await vultrValkey.set(cacheKey, profile, this.CACHE_TTL);
        } catch (error) {
          // Non-critical
        }

        return profile;
      }
    } catch (error) {
      console.warn('Failed to build user return profile:', error);
    }

    return null;
  }

  /**
   * Get user return history
   */
  async getUserReturnHistory(userId: string): Promise<ReturnHistory[]> {
    try {
      if (orderSQL && orderSQL.query) {
        const orders = await orderSQL.query(
          `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
          [userId]
        );

        const returns = await orderSQL.query(
          `SELECT * FROM returns WHERE user_id = $1`,
          [userId]
        );

        const returnSet = new Set(returns.map((r: any) => r.product_id));

        const history: ReturnHistory[] = [];
        for (const order of orders) {
          const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
          for (const item of items) {
            history.push({
              orderId: order.order_id,
              productId: item.product_id || item.id,
              returned: returnSet.has(item.product_id || item.id),
              category: item.category,
              size: item.size,
              brand: item.brand,
              returnDate: order.created_at ? new Date(order.created_at) : undefined,
            });
          }
        }

        return history;
      }
    } catch (error) {
      console.warn('Failed to get user return history:', error);
    }

    return [];
  }
}

export const featureExtractor = new FeatureExtractor();
