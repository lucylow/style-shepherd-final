/**
 * Size Prediction Service
 * 
 * Service for calling the size-prediction Supabase Edge Function
 * with support for cross-brand normalization and vanity sizing.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserMeasurement {
  height_cm?: number;
  weight_kg?: number;
  bust_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  chest_cm?: number;
  inseam_cm?: number;
  body_type?: string; // hourglass, pear, apple, rectangle, inverted_triangle, athletic
}

export interface ProductInfo {
  brand: string;
  category: string; // top, bottom, dress, jacket, shoes
  product_name?: string;
  size_chart?: Record<string, any>;
}

export interface SizePrediction {
  predicted_sizes: {
    primary: string;
    confidence: number;
    alternatives: string[];
  };
  normalized_measurements: UserMeasurement;
  brand_adjustments_applied: {
    brand: string;
    vanity_sizing_factor: number;
    size_mapping: Record<string, string>;
    measurement_adjustments: {
      bust?: number;
      waist?: number;
      hips?: number;
    };
    adjustment_note?: string;
  };
  fit_recommendation: {
    recommended_fit: "true_to_size" | "size_up" | "size_down";
    sizing_consistency: number;
    return_risk: number;
  };
  explanation: string;
  cross_brand_equivalents?: Record<string, string>;
  category: string;
}

export interface SizePredictionResponse {
  success: boolean;
  predictions: SizePrediction[];
  processing_time_ms: number;
  data_sources_used: string[];
  error?: string;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Predict sizes for multiple products across brands
 */
export async function predictSizes(
  measurements: UserMeasurement,
  products: ProductInfo | ProductInfo[],
  userId?: string
): Promise<SizePredictionResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('size-prediction', {
      body: {
        measurements,
        products: Array.isArray(products) ? products : [products],
        user_id: userId
      }
    });

    if (error) {
      throw new Error(error.message || 'Size prediction failed');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Size prediction failed');
    }

    return data as SizePredictionResponse;
  } catch (error) {
    console.error('Size prediction service error:', error);
    throw error instanceof Error ? error : new Error('Size prediction failed');
  }
}

/**
 * Predict size for a single product
 */
export async function predictSize(
  measurements: UserMeasurement,
  product: ProductInfo,
  userId?: string
): Promise<SizePrediction> {
  const response = await predictSizes(measurements, product, userId);
  
  if (response.predictions.length === 0) {
    throw new Error('No predictions returned');
  }

  return response.predictions[0];
}

/**
 * Batch predict sizes for multiple products
 */
export async function batchPredictSizes(
  measurements: UserMeasurement,
  products: ProductInfo[],
  userId?: string
): Promise<SizePrediction[]> {
  const response = await predictSizes(measurements, products, userId);
  return response.predictions;
}

