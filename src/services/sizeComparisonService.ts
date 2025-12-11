/**
 * Size Comparison Service
 * Handles size comparison across multiple brands with variance analysis
 */

import { supabase } from '@/integrations/supabase/client';

export interface BodyMeasurement {
  height: number; // cm
  weight?: number; // kg
  bust?: number; // cm
  chest?: number; // cm
  waist: number; // cm
  hips: number; // cm
  shoulders?: number; // cm
  neck?: number; // cm
}

export interface MeasurementMatch {
  match: boolean;
  variance: number;
}

export interface SizeComparisonResult {
  productId?: string;
  brand: string;
  recommendedSize: string;
  confidence: number; // 0-1
  measurementsMatch: {
    bust?: MeasurementMatch;
    chest?: MeasurementMatch;
    waist: MeasurementMatch;
    hips: MeasurementMatch;
  };
  sizeRange: string[];
  crossBrandEquivalents?: Record<string, string[]>;
  riskFactors: string[];
  visualizationData?: {
    chestCircumference: number[];
    waistCircumference: number[];
  };
}

export interface SizeComparisonResponse {
  success: boolean;
  data?: {
    comparisons: SizeComparisonResult[];
    summary: {
      bestOverallSize: string;
      consistencyScore: number;
      recommendations: string[];
    };
  };
  error?: string;
  modelVersion?: string;
  timestamp?: string;
}

export interface SizeComparisonRequest {
  bodyMeasurements: BodyMeasurement;
  products?: Array<{
    productId?: string;
    brand: string;
    category?: string;
  }>;
  brands?: string[];
  category?: string;
  preferredFit?: 'tight' | 'normal' | 'loose';
}

class SizeComparisonService {
  /**
   * Compare sizes across brands
   */
  async compareSizes(request: SizeComparisonRequest): Promise<SizeComparisonResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('size-comparison', {
        body: request,
      });

      if (error) {
        console.error('Size comparison error:', error);
        return {
          success: false,
          error: error.message || 'Failed to compare sizes',
        };
      }

      // Handle response format
      if (data && typeof data === 'object') {
        if ('success' in data && !data.success) {
          return {
            success: false,
            error: (data as any).error || 'Size comparison failed',
          };
        }

        // Check if data has the expected structure
        if ('data' in data || 'comparisons' in data) {
          return {
            success: true,
            data: 'data' in data ? data.data : data,
            modelVersion: (data as any).modelVersion,
            timestamp: (data as any).timestamp,
          };
        }
      }

      return {
        success: false,
        error: 'Invalid response format',
      };
    } catch (error) {
      console.error('Size comparison service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available brands for comparison
   */
  getAvailableBrands(): string[] {
    return [
      'Zara',
      'H&M',
      'Uniqlo',
      'Nike',
      'Adidas',
      'ASOS',
      'Everlane',
      'Aritzia',
    ];
  }
}

export const sizeComparisonService = new SizeComparisonService();
