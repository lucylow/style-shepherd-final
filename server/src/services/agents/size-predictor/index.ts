/**
 * Size Predictor AI Agent
 * Main orchestrator for size prediction across 500+ brands
 * Integrates SVM models, measurement normalization, and risk assessment
 */

import { measurementNormalizer, BodyMeasurements, NormalizedFeatures } from './measurement-normalizer.js';
import { svmModel, SizePrediction } from './svm-model.js';
import { riskAssessor, SizeHistory, FabricProperties, RiskAssessment } from './risk-assessor.js';
import { userMemory } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import type { Product } from '../SearchAgent.js';

export interface SizePredictionResult {
  recommendedSize: string;
  confidence: number; // 0-1, SVM probability
  alternatives: string[];
  riskScore: number; // 0-1, return risk
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  sizeAdjustment?: number; // ±1 size adjustment
  warnings: string[];
  trueToSize?: boolean;
  brandTranslation?: {
    from: string;
    to: string;
    originalSize: string;
    translatedSize: string;
  };
}

export interface SizePredictionRequest {
  userId: string;
  products: Product[];
  measurements?: BodyMeasurements;
  sizeHistory?: SizeHistory[];
}

export interface SizePredictionResponse {
  predictions: Array<{
    productId: string;
    productName: string;
    brand: string;
    category: string;
    prediction: SizePredictionResult;
  }>;
  overallConfidence: number;
  timestamp: string;
}

/**
 * Size Predictor Agent
 * Processes user inputs to output brand-normalized size recommendations
 */
export class SizePredictorAgent {
  private readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Predict sizes for multiple products
   */
  async predictSizes(request: SizePredictionRequest): Promise<SizePredictionResponse> {
    const { userId, products, measurements, sizeHistory } = request;

    // Get user measurements if not provided
    const userMeasurements = measurements || await this.getUserMeasurements(userId);
    
    // Get size history if not provided
    const userSizeHistory = sizeHistory || await riskAssessor.getUserSizeHistory(userId);

    // Normalize measurements
    const normalizedFeatures = measurementNormalizer.normalize(userMeasurements);

    // Predict for each product
    const predictions = await Promise.all(
      products.map(async (product) => {
        const prediction = await this.predictForProduct(
          userId,
          product,
          normalizedFeatures,
          userSizeHistory
        );
        return {
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          category: product.category,
          prediction,
        };
      })
    );

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(predictions);

    return {
      predictions,
      overallConfidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Predict size for a single product
   */
  async predictForProduct(
    userId: string,
    product: Product,
    normalizedFeatures: NormalizedFeatures,
    sizeHistory: SizeHistory[]
  ): Promise<SizePredictionResult> {
    const cacheKey = `size-prediction:${userId}:${product.id}:${product.brand}`;
    
    try {
      const cached = await vultrValkey.get<SizePredictionResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    // Get brand-specific size prediction
    const sizePrediction = svmModel.predict(
      product.brand,
      product.category,
      normalizedFeatures
    );

    // Get fabric properties if available
    const fabric = this.extractFabricProperties(product);

    // Assess return risk
    const riskAssessment = await riskAssessor.assess(
      userId,
      product.brand,
      product.category,
      sizePrediction.recommendedSize,
      fabric,
      sizeHistory
    );

    // Apply size adjustment if needed
    let finalSize = sizePrediction.recommendedSize;
    if (riskAssessment.sizeAdjustment) {
      finalSize = this.adjustSize(finalSize, riskAssessment.sizeAdjustment);
    }

    // Get brand translation if needed
    const brandMapping = measurementNormalizer.getBrandMapping(product.brand);
    const brandTranslation = this.getBrandTranslation(
      finalSize,
      product.brand,
      brandMapping.sizeSystem
    );

    // Generate warnings
    const warnings = this.generateWarnings(
      sizePrediction,
      riskAssessment,
      fabric,
      brandMapping
    );

    const result: SizePredictionResult = {
      recommendedSize: finalSize,
      confidence: sizePrediction.confidence,
      alternatives: sizePrediction.alternatives,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
      riskFactors: riskAssessment.factors.map(f => f.description),
      sizeAdjustment: riskAssessment.sizeAdjustment,
      warnings,
      trueToSize: brandMapping.trueToSize,
      brandTranslation,
    };

    // Cache result
    try {
      await vultrValkey.set(cacheKey, result, this.CACHE_TTL);
    } catch (error) {
      // Non-critical
    }

    return result;
  }

  /**
   * Get user measurements from profile
   */
  private async getUserMeasurements(userId: string): Promise<BodyMeasurements> {
    try {
      const profile = await userMemory.get(userId);
      if (profile?.bodyMeasurements) {
        return profile.bodyMeasurements as BodyMeasurements;
      }
    } catch (error) {
      console.warn('Failed to get user measurements:', error);
    }

    // Return default measurements (will trigger low confidence)
    return {
      height: 170,
      weight: 65,
    };
  }

  /**
   * Extract fabric properties from product
   */
  private extractFabricProperties(product: Product): FabricProperties | undefined {
    // Extract from product description or metadata
    const description = (product.description || '').toLowerCase();
    const fabric: FabricProperties = {};

    // Check for stretch/elasticity keywords
    if (description.includes('stretch') || description.includes('spandex') || description.includes('elastane')) {
      fabric.elasticity = 'high';
      fabric.stretch = 0.3;
    } else if (description.includes('rigid') || description.includes('non-stretch')) {
      fabric.elasticity = 'low';
      fabric.stretch = 0.05;
    } else {
      fabric.elasticity = 'medium';
      fabric.stretch = 0.15;
    }

    // Extract material
    const materials = ['cotton', 'polyester', 'linen', 'silk', 'wool', 'denim'];
    for (const material of materials) {
      if (description.includes(material)) {
        fabric.material = material;
        break;
      }
    }

    // Check for "runs small/large" from reviews (would come from NLP analysis)
    // For now, use brand defaults
    const brandMapping = measurementNormalizer.getBrandMapping(product.brand);
    if (brandMapping.runsSmall) {
      fabric.runsSmall = true;
    } else if (brandMapping.runsLarge) {
      fabric.runsLarge = true;
    } else {
      fabric.trueToSize = true;
    }

    return fabric;
  }

  /**
   * Get brand translation info
   */
  private getBrandTranslation(
    size: string,
    brand: string,
    sizeSystem: string
  ): SizePredictionResult['brandTranslation'] {
    // If size system is standard (US), no translation needed
    if (sizeSystem === 'US') {
      return undefined;
    }

    return {
      from: 'US',
      to: sizeSystem,
      originalSize: size,
      translatedSize: size, // Would use actual translation in production
    };
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    sizePrediction: SizePrediction,
    riskAssessment: RiskAssessment,
    fabric: FabricProperties | undefined,
    brandMapping: any
  ): string[] {
    const warnings: string[] = [];

    // Low confidence warning
    if (sizePrediction.confidence < 0.85) {
      warnings.push('Size confidence is moderate - verify measurements');
    }

    // High risk warning
    if (riskAssessment.riskLevel === 'high') {
      warnings.push('⚠️ High return risk detected');
    }

    // Brand-specific warnings
    if (brandMapping.runsSmall) {
      warnings.push('This brand typically runs small - consider sizing up');
    } else if (brandMapping.runsLarge) {
      warnings.push('This brand typically runs large - consider sizing down');
    }

    // Fabric warnings
    if (fabric?.elasticity === 'low') {
      warnings.push('Low stretch fabric - ensure accurate measurements');
    }

    // Size adjustment warning
    if (riskAssessment.sizeAdjustment) {
      if (riskAssessment.sizeAdjustment > 0) {
        warnings.push('Consider sizing up based on risk analysis');
      } else {
        warnings.push('Consider sizing down based on risk analysis');
      }
    }

    return warnings;
  }

  /**
   * Adjust size by offset
   */
  private adjustSize(size: string, offset: number): string {
    if (offset === 0) return size;

    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const index = sizes.indexOf(size);
    if (index === -1) return size;

    const newIndex = Math.max(0, Math.min(sizes.length - 1, index + offset));
    return sizes[newIndex];
  }

  /**
   * Calculate overall confidence across predictions
   */
  private calculateOverallConfidence(
    predictions: Array<{ prediction: SizePredictionResult }>
  ): number {
    if (predictions.length === 0) return 0;

    const totalConfidence = predictions.reduce(
      (sum, p) => sum + p.prediction.confidence,
      0
    );
    return totalConfidence / predictions.length;
  }
}

export const sizePredictorAgent = new SizePredictorAgent();
