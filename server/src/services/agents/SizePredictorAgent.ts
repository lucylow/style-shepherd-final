/**
 * Size Predictor Agent
 * Predicts optimal sizing across brands using body measurements and historical returns data
 * Leverages ML models trained on brand-specific sizing patterns
 */

import { userMemory, orderSQL } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import { vultrPostgres } from '../../lib/vultr-postgres.js';
import { ExternalServiceError } from '../../lib/errors.js';

export interface BodyMeasurements {
  height?: number; // in inches
  weight?: number; // in pounds
  chest?: number; // in inches
  waist?: number; // in inches
  hips?: number; // in inches
  inseam?: number; // in inches
  shoeSize?: number; // US size
}

export interface SizePrediction {
  recommendedSize: string;
  confidence: number; // 0-1
  alternativeSizes?: Array<{
    size: string;
    confidence: number;
    reasoning: string;
  }>;
  reasoning: string;
  brandVariance?: number; // How much this brand deviates from standard
  fitNotes?: string[];
}

export interface SizePredictionParams {
  userId: string;
  productId?: string;
  brand: string;
  category: string;
  measurements: BodyMeasurements;
  preferredSize?: string; // User's usual size in other brands
}

export interface SizePredictionResult {
  prediction: SizePrediction;
  userHistory?: {
    successfulSizes: Record<string, string>; // brand -> size
    returnHistory: Array<{
      brand: string;
      size: string;
      reason: string;
    }>;
  };
  brandInfo?: {
    sizingVariance: number;
    fitNotes: string[];
  };
}

export class SizePredictorAgent {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly BRAND_VARIANCE_DB: Record<string, number> = {
    // Variance factor: positive = runs larger, negative = runs smaller
    'zara': -0.5, // Runs small
    'h&m': -0.3,
    'forever21': -0.4,
    'nike': 0.0, // True to size
    'adidas': 0.0,
    'lululemon': 0.2, // Runs slightly large
    'everlane': 0.0,
    'aritzia': -0.2,
    'reformation': -0.3,
    'freepeople': 0.1,
  };

  /**
   * Predict size for a product based on measurements
   */
  async predictSize(params: SizePredictionParams): Promise<SizePredictionResult> {
    const cacheKey = `size:${params.userId}:${params.brand}:${params.category}:${JSON.stringify(params.measurements)}`;
    
    try {
      const cached = await vultrValkey.get<SizePredictionResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    try {
      // Get user's size history
      const userHistory = await this.getUserSizeHistory(params.userId);

      // Load or use brand-specific model
      const brandModel = this.loadBrandModel(params.brand, params.category);

      // Predict size using model
      const prediction = await brandModel.predict(params.measurements, {
        userHistory,
        preferredSize: params.preferredSize,
      });

      // Get brand info
      const brandInfo = this.getBrandInfo(params.brand);

      const result: SizePredictionResult = {
        prediction,
        userHistory,
        brandInfo,
      };

      // Cache result
      await vultrValkey.set(cacheKey, result, this.CACHE_TTL).catch(() => {});

      return result;
    } catch (error) {
      throw new ExternalServiceError(
        'SizePredictorAgent',
        `Failed to predict size: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error)),
        { userId: params.userId, brand: params.brand }
      );
    }
  }

  /**
   * Get user's size history from database
   */
  private async getUserSizeHistory(userId: string): Promise<SizePredictionResult['userHistory']> {
    try {
      // Query order history for successful purchases
      const query = `
        SELECT 
          brand,
          size,
          returned,
          return_reason
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const result = await vultrPostgres.query(query, [userId]);
      const rows = result.rows || [];

      const successfulSizes: Record<string, string> = {};
      const returnHistory: Array<{ brand: string; size: string; reason: string }> = [];

      for (const row of rows) {
        if (!row.returned && row.size) {
          if (!successfulSizes[row.brand] || Math.random() > 0.3) {
            // Prefer more recent sizes
            successfulSizes[row.brand] = row.size;
          }
        } else if (row.returned && row.return_reason) {
          returnHistory.push({
            brand: row.brand,
            size: row.size,
            reason: row.return_reason,
          });
        }
      }

      return {
        successfulSizes,
        returnHistory: returnHistory.slice(0, 20),
      };
    } catch (error) {
      console.warn('Failed to get user size history:', error);
      return {
        successfulSizes: {},
        returnHistory: [],
      };
    }
  }

  /**
   * Load brand-specific size prediction model
   * In production, this would load a pre-trained ML model
   */
  private loadBrandModel(brand: string, category: string) {
    return {
      predict: async (
        measurements: BodyMeasurements,
        context: { userHistory?: any; preferredSize?: string }
      ): Promise<SizePrediction> => {
        // This is a simplified prediction algorithm
        // In production, this would use a trained ML model (e.g., logistic regression, neural network)

        const brandVariance = this.BRAND_VARIANCE_DB[brand.toLowerCase()] || 0;
        const baseSize = this.calculateBaseSize(measurements, category);

        // Adjust for brand variance
        let recommendedSize = this.adjustSizeForBrand(baseSize, brandVariance, category);

        // Adjust based on user history if available
        if (context.userHistory?.successfulSizes[brand]) {
          const historicalSize = context.userHistory.successfulSizes[brand];
          // Blend historical preference with calculated size
          recommendedSize = this.blendSizes(recommendedSize, historicalSize, 0.7);
        } else if (context.preferredSize) {
          // Use preferred size as anchor, adjust for brand
          recommendedSize = this.adjustSizeForBrand(context.preferredSize, brandVariance, category);
        }

        // Calculate confidence based on measurement completeness
        const confidence = this.calculateConfidence(measurements, category);

        // Generate alternative sizes
        const alternatives = this.generateAlternatives(recommendedSize, category, confidence);

        // Generate reasoning
        const reasoning = this.generateReasoning(
          recommendedSize,
          measurements,
          brand,
          brandVariance,
          context.userHistory
        );

        return {
          recommendedSize,
          confidence,
          alternativeSizes: alternatives,
          reasoning,
          brandVariance,
          fitNotes: this.getFitNotes(brand, category),
        };
      },
    };
  }

  /**
   * Calculate base size from measurements
   */
  private calculateBaseSize(measurements: BodyMeasurements, category: string): string {
    // Simplified size calculation - in production, this would use ML model
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('top') || categoryLower.includes('shirt') || categoryLower.includes('blouse')) {
      if (measurements.chest) {
        if (measurements.chest < 34) return 'XS';
        if (measurements.chest < 36) return 'S';
        if (measurements.chest < 40) return 'M';
        if (measurements.chest < 44) return 'L';
        if (measurements.chest < 48) return 'XL';
        return 'XXL';
      }
      // Fallback to weight/height if chest not available
      if (measurements.weight && measurements.height) {
        const bmi = (measurements.weight / (measurements.height * measurements.height)) * 703;
        if (bmi < 18.5) return 'XS';
        if (bmi < 22) return 'S';
        if (bmi < 26) return 'M';
        if (bmi < 30) return 'L';
        return 'XL';
      }
    }

    if (categoryLower.includes('bottom') || categoryLower.includes('pant') || categoryLower.includes('jean')) {
      if (measurements.waist) {
        if (measurements.waist < 28) return 'XS';
        if (measurements.waist < 30) return 'S';
        if (measurements.waist < 34) return 'M';
        if (measurements.waist < 38) return 'L';
        if (measurements.waist < 42) return 'XL';
        return 'XXL';
      }
    }

    if (categoryLower.includes('shoe')) {
      if (measurements.shoeSize) {
        return measurements.shoeSize.toString();
      }
    }

    // Default to medium
    return 'M';
  }

  /**
   * Adjust size for brand variance
   */
  private adjustSizeForBrand(baseSize: string, variance: number, category: string): string {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const currentIndex = sizeOrder.indexOf(baseSize);

    if (currentIndex === -1) {
      return baseSize; // Return as-is if not in standard sizes
    }

    // Adjust based on variance
    // Positive variance = runs large (go down a size)
    // Negative variance = runs small (go up a size)
    const adjustment = Math.round(variance);
    const newIndex = Math.max(0, Math.min(sizeOrder.length - 1, currentIndex - adjustment));

    return sizeOrder[newIndex];
  }

  /**
   * Blend two sizes (weighted average)
   */
  private blendSizes(size1: string, size2: string, weight: number): string {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const index1 = sizeOrder.indexOf(size1);
    const index2 = sizeOrder.indexOf(size2);

    if (index1 === -1 || index2 === -1) {
      return size1; // Return first if either is invalid
    }

    const blendedIndex = Math.round(index1 * weight + index2 * (1 - weight));
    return sizeOrder[Math.max(0, Math.min(sizeOrder.length - 1, blendedIndex))];
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(measurements: BodyMeasurements, category: string): number {
    let confidence = 0.5; // Base confidence

    const categoryLower = category.toLowerCase();

    // Increase confidence based on relevant measurements
    if (categoryLower.includes('top') || categoryLower.includes('shirt')) {
      if (measurements.chest) confidence += 0.3;
      if (measurements.height && measurements.weight) confidence += 0.1;
    } else if (categoryLower.includes('bottom') || categoryLower.includes('pant')) {
      if (measurements.waist) confidence += 0.3;
      if (measurements.hips) confidence += 0.1;
      if (measurements.inseam) confidence += 0.1;
    } else if (categoryLower.includes('shoe')) {
      if (measurements.shoeSize) confidence += 0.4;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * Generate alternative sizes
   */
  private generateAlternatives(
    recommendedSize: string,
    category: string,
    confidence: number
  ): Array<{ size: string; confidence: number; reasoning: string }> {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const currentIndex = sizeOrder.indexOf(recommendedSize);

    if (currentIndex === -1) {
      return [];
    }

    const alternatives: Array<{ size: string; confidence: number; reasoning: string }> = [];

    // Add one size up
    if (currentIndex < sizeOrder.length - 1) {
      alternatives.push({
        size: sizeOrder[currentIndex + 1],
        confidence: Math.max(0, confidence - 0.2),
        reasoning: 'If you prefer a looser fit',
      });
    }

    // Add one size down
    if (currentIndex > 0) {
      alternatives.push({
        size: sizeOrder[currentIndex - 1],
        confidence: Math.max(0, confidence - 0.2),
        reasoning: 'If you prefer a tighter fit',
      });
    }

    return alternatives;
  }

  /**
   * Generate reasoning for size recommendation
   */
  private generateReasoning(
    size: string,
    measurements: BodyMeasurements,
    brand: string,
    brandVariance: number,
    userHistory?: any
  ): string {
    const reasons: string[] = [];

    if (measurements.chest) {
      reasons.push(`Based on chest measurement (${measurements.chest}")`);
    }
    if (measurements.waist) {
      reasons.push(`Based on waist measurement (${measurements.waist}")`);
    }

    if (brandVariance !== 0) {
      const varianceDesc = brandVariance > 0 ? 'runs large' : 'runs small';
      reasons.push(`${brand} typically ${varianceDesc}`);
    }

    if (userHistory?.successfulSizes[brand]) {
      reasons.push(`Your previous successful size in ${brand} was ${userHistory.successfulSizes[brand]}`);
    }

    return reasons.length > 0
      ? reasons.join(', ') + '.'
      : `Recommended size ${size} based on standard sizing.`;
  }

  /**
   * Get fit notes for brand/category
   */
  private getFitNotes(brand: string, category: string): string[] {
    const notes: string[] = [];

    const brandLower = brand.toLowerCase();
    if (this.BRAND_VARIANCE_DB[brandLower] < -0.3) {
      notes.push('This brand tends to run small - consider sizing up');
    } else if (this.BRAND_VARIANCE_DB[brandLower] > 0.2) {
      notes.push('This brand tends to run large - consider sizing down');
    }

    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('dress')) {
      notes.push('Dresses may fit differently based on style - check product description');
    }

    return notes;
  }

  /**
   * Get brand information
   */
  private getBrandInfo(brand: string): SizePredictionResult['brandInfo'] {
    const variance = this.BRAND_VARIANCE_DB[brand.toLowerCase()] || 0;

    return {
      sizingVariance: variance,
      fitNotes: this.getFitNotes(brand, 'general'),
    };
  }
}

// Singleton instance
export const sizePredictorAgent = new SizePredictorAgent();
