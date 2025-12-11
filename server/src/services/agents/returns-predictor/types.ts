/**
 * Returns Predictor Agent - Type Definitions
 * Types for ML-based return risk prediction
 */

import type { Product } from '../SearchAgent.js';

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
}

export interface ReturnHistory {
  orderId: string;
  productId: string;
  returned: boolean;
  reason?: string;
  category?: string;
  size?: string;
  brand?: string;
  returnDate?: Date;
}

export interface ReturnRiskAssessment {
  returnRisk: number; // 0.0-1.0 probability
  keepProbability: number; // 0.0-1.0 likelihood to keep
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0.0-1.0 model confidence
  reason: string;
  factors: RiskFactor[];
  alternatives?: AlternativeProduct[];
}

export interface RiskFactor {
  name: string;
  impact: number; // -1.0 to 1.0 (negative = reduces risk, positive = increases risk)
  description: string;
}

export interface AlternativeProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  returnRisk: number;
  keepProbability: number;
  reason: string;
}

export interface MLFeatures {
  // User features
  user_return_rate: number;
  user_category_return_rate: number; // Specific to category (e.g., pants/bottoms)
  user_size_consistency: number;
  user_location_risk: number;
  
  // Product features
  fabric_stretch_index: number; // 0-1, stretch percentage normalized
  review_sentiment_score: number; // -1 to 1, negative reviews = negative score
  review_size_mentions: number; // Count of "runs small/large" mentions
  category_risk: number; // Base risk for category (bottoms = 0.65)
  brand_keep_rate: number; // Historical keep rate for brand
  
  // Context features
  seasonality_factor: number; // Holiday spikes = higher risk
  promotion_type: number; // Sale items have different return patterns
  basket_diversity: number; // Single item vs. bundle
  
  // Fabric/material features
  material_elasticity: number; // Stretch percentage
  material_quality_score: number;
}

export interface UserReturnProfile {
  userId: string;
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  categoryReturnRates: Record<string, number>; // category -> return rate
  sizeBrackets: Record<string, number>; // size -> frequency
  commonReasons: string[];
  location?: string;
}
