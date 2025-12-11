/**
 * Alternative Finder - Finds lower-risk product alternatives
 * Suggests products with similar attributes but lower return probability
 */

import { userMemory } from '../../../lib/raindrop-config.js';
import { vultrValkey } from '../../../lib/vultr-valkey.js';
import type { Product } from '../SearchAgent.js';
import type { AlternativeProduct } from './types.js';
import { featureExtractor } from './feature-extractor.js';
import { mlClassifier } from './ml-classifier.js';

export class AlternativeFinder {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly MAX_ALTERNATIVES = 3;

  /**
   * Find alternative products with lower return risk
   */
  async findAlternatives(
    product: Product,
    userId: string,
    userHistory: any[],
    userProfile: any
  ): Promise<AlternativeProduct[]> {
    const cacheKey = `alternatives:${product.id}:${userId}`;

    try {
      const cached = await vultrValkey.get<AlternativeProduct[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss, continue
    }

    // In production, this would query a product database
    // For now, we'll generate synthetic alternatives based on product attributes
    const alternatives = await this.generateAlternatives(product, userId, userHistory, userProfile);

    // Cache results
    try {
      await vultrValkey.set(cacheKey, alternatives, this.CACHE_TTL);
    } catch (error) {
      // Non-critical
    }

    return alternatives;
  }

  /**
   * Generate alternative products (simplified - would query product DB in production)
   */
  private async generateAlternatives(
    product: Product,
    userId: string,
    userHistory: any[],
    userProfile: any
  ): Promise<AlternativeProduct[]> {
    const alternatives: AlternativeProduct[] = [];

    // Strategy 1: Same brand, similar style, different size/material
    const alt1 = await this.createAlternative(
      product,
      {
        name: `${product.name} (Stretch Version)`,
        fabricModification: 'stretch',
        priceAdjustment: 0.95, // 5% cheaper
      },
      userId,
      userHistory,
      userProfile
    );
    if (alt1 && alt1.returnRisk < 0.40) {
      alternatives.push(alt1);
    }

    // Strategy 2: Different brand, similar style, lower risk category variant
    if (product.category?.toLowerCase().includes('pants') || 
        product.category?.toLowerCase().includes('bottoms')) {
      const alt2 = await this.createAlternative(
        product,
        {
          name: `${product.name.replace(/Jeans|Pants/i, 'Chinos')} (Lower Risk)`,
          categoryModification: 'trousers',
          priceAdjustment: 0.90,
          brandModification: 'alternative',
        },
        userId,
        userHistory,
        userProfile
      );
      if (alt2 && alt2.returnRisk < 0.35) {
        alternatives.push(alt2);
      }
    }

    // Strategy 3: Same category, higher-rated alternative
    const alt3 = await this.createAlternative(
      product,
      {
        name: `Premium ${product.name}`,
        ratingBoost: 0.5, // Higher rating
        priceAdjustment: 1.05, // 5% more expensive but better quality
      },
      userId,
      userHistory,
      userProfile
    );
    if (alt3 && alt3.returnRisk < 0.30) {
      alternatives.push(alt3);
    }

    // Sort by return risk (lowest first) and keep probability (highest first)
    alternatives.sort((a, b) => {
      if (Math.abs(a.returnRisk - b.returnRisk) < 0.05) {
        return b.keepProbability - a.keepProbability;
      }
      return a.returnRisk - b.returnRisk;
    });

    return alternatives.slice(0, this.MAX_ALTERNATIVES);
  }

  /**
   * Create a synthetic alternative product with modified attributes
   */
  private async createAlternative(
    baseProduct: Product,
    modifications: {
      name: string;
      fabricModification?: 'stretch' | 'premium';
      categoryModification?: string;
      priceAdjustment?: number;
      brandModification?: 'alternative' | 'premium';
      ratingBoost?: number;
    },
    userId: string,
    userHistory: any[],
    userProfile: any
  ): Promise<AlternativeProduct | null> {
    // Create modified product
    const altProduct: Product = {
      ...baseProduct,
      id: `${baseProduct.id}-alt-${Date.now()}`,
      name: modifications.name,
      price: modifications.priceAdjustment 
        ? baseProduct.price * modifications.priceAdjustment 
        : baseProduct.price,
      rating: modifications.ratingBoost 
        ? Math.min(5.0, (baseProduct.rating || 4.0) + modifications.ratingBoost)
        : baseProduct.rating,
    };

    // Apply fabric modifications
    if (modifications.fabricModification === 'stretch') {
      altProduct.description = `${baseProduct.description || ''} 2% stretch for comfort`.trim();
    }

    // Apply category modifications
    if (modifications.categoryModification) {
      altProduct.category = modifications.categoryModification;
    }

    // Apply brand modifications
    if (modifications.brandModification === 'premium') {
      altProduct.brand = `Premium ${altProduct.brand}`;
    } else if (modifications.brandModification === 'alternative') {
      // Use a brand known for lower returns
      altProduct.brand = 'Reliable Fit';
    }

    // Calculate return risk for alternative
    const features = await featureExtractor.extractFeatures(
      { product: altProduct, quantity: 1 },
      userHistory,
      userProfile
    );

    const prediction = mlClassifier.predict(features);
    const returnRisk = prediction.returnProbability;
    const keepProbability = 1 - returnRisk;

    // Only suggest if significantly better
    if (returnRisk >= 0.60) {
      return null; // Still too high risk
    }

    return {
      id: altProduct.id,
      name: altProduct.name,
      brand: altProduct.brand,
      price: altProduct.price,
      returnRisk: Math.round(returnRisk * 100) / 100,
      keepProbability: Math.round(keepProbability * 100) / 100,
      reason: this.generateAlternativeReason(altProduct, returnRisk, modifications),
    };
  }

  /**
   * Generate reason text for why this alternative is better
   */
  private generateAlternativeReason(
    product: Product,
    returnRisk: number,
    modifications: any
  ): string {
    const riskPercent = Math.round(returnRisk * 100);
    const keepPercent = Math.round((1 - returnRisk) * 100);

    if (modifications.fabricModification === 'stretch') {
      return `Stretchy material reduces fit issues - ${keepPercent}% keep rate (vs ${riskPercent}% return risk)`;
    }

    if (modifications.categoryModification) {
      return `Lower-risk category variant with ${keepPercent}% keep rate`;
    }

    if (modifications.ratingBoost) {
      return `Higher-rated alternative with ${keepPercent}% keep rate - better reviews`;
    }

    return `Lower return risk alternative - ${keepPercent}% keep rate`;
  }
}

export const alternativeFinder = new AlternativeFinder();
