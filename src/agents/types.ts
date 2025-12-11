/**
 * Frontend Types for Specialized Agents
 * Type definitions for the four new specialized agents
 */

// Personal Shopper Agent Types
export interface OutfitBundle {
  id: string;
  name: string;
  occasion?: string;
  items: OutfitItem[];
  totalPrice: number;
  confidence: number;
  reasoning: string;
  styleMatch: number;
  returnRisk?: number;
}

export interface OutfitItem {
  productId: string;
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    imageUrl?: string;
    category: string;
  };
  recommendedSize?: string;
  role: 'top' | 'bottom' | 'dress' | 'shoes' | 'accessories' | 'outerwear';
  essential: boolean;
}

export interface OutfitRecommendationParams {
  userId: string;
  budget: number;
  occasion?: string;
  style?: string;
  preferences?: {
    colors?: string[];
    brands?: string[];
    styles?: string[];
  };
  excludeProductIds?: string[];
}

export interface OutfitRecommendationResult {
  outfits: OutfitBundle[];
  totalOutfits: number;
  averageConfidence: number;
  budgetUtilization: number;
  reasoning: string;
}

// Makeup Artist Agent Types
export interface SkinToneAnalysis {
  undertone: 'warm' | 'cool' | 'neutral';
  depth: 'light' | 'medium' | 'tan' | 'deep';
  confidence: number;
  foundationShade?: string;
  recommendedColors: {
    lipstick: string[];
    eyeshadow: string[];
    blush: string[];
  };
}

export interface MakeupProduct {
  id: string;
  name: string;
  brand: string;
  category: 'foundation' | 'lipstick' | 'eyeshadow' | 'blush' | 'mascara' | 'concealer' | 'primer';
  shade?: string;
  color?: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  url?: string;
}

export interface MakeupStep {
  stepNumber: number;
  product: MakeupProduct;
  application: string;
  tips?: string;
  duration?: number;
}

export interface MakeupLook {
  id: string;
  name: string;
  occasion: string;
  steps: MakeupStep[];
  totalDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  confidence: number;
  reasoning: string;
  totalPrice: number;
}

export interface MakeupRecommendationParams {
  userId: string;
  selfieUrl?: string;
  occasion: string;
  skinTone?: {
    undertone?: 'warm' | 'cool' | 'neutral';
    depth?: 'light' | 'medium' | 'tan' | 'deep';
  };
  preferences?: {
    intensity?: 'natural' | 'moderate' | 'bold';
    colors?: string[];
    brands?: string[];
  };
  budget?: number;
}

export interface MakeupRecommendationResult {
  looks: MakeupLook[];
  skinAnalysis?: SkinToneAnalysis;
  totalLooks: number;
  averageConfidence: number;
  reasoning: string;
}

// Size Predictor Agent Types
export interface BodyMeasurements {
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  shoeSize?: number;
}

export interface SizePrediction {
  recommendedSize: string;
  confidence: number;
  alternativeSizes?: Array<{
    size: string;
    confidence: number;
    reasoning: string;
  }>;
  reasoning: string;
  brandVariance?: number;
  fitNotes?: string[];
}

export interface SizePredictionParams {
  userId: string;
  productId?: string;
  brand: string;
  category: string;
  measurements: BodyMeasurements;
  preferredSize?: string;
}

export interface SizePredictionResult {
  prediction: SizePrediction;
  userHistory?: {
    successfulSizes: Record<string, string>;
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

// Returns Predictor Agent Types
export interface ReturnsCartItem {
  productId: string;
  brand: string;
  category: string;
  price: number;
  size?: string;
  color?: string;
  rating?: number;
}

export interface ReturnRiskFactor {
  factor: string;
  impact: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReturnRiskPrediction {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  factors: ReturnRiskFactor[];
  alternatives?: Array<{
    productId: string;
    reason: string;
    riskReduction: number;
  }>;
  mitigationStrategies: string[];
  estimatedReturnCost?: number;
  co2Impact?: number;
}

export interface ReturnPredictionParams {
  userId: string;
  items: ReturnsCartItem[];
}

export interface ReturnPredictionResult {
  predictions: Array<{
    item: ReturnsCartItem;
    prediction: ReturnRiskPrediction;
  }>;
  overallRisk: {
    score: number;
    level: 'low' | 'medium' | 'high';
    primaryConcerns: string[];
  };
  recommendations: string[];
}

// Orchestrator Types
export type AgentType = 'personal-shopper' | 'makeup-artist' | 'size-predictor' | 'returns-predictor';

export interface UserQuery {
  userId: string;
  intent: string;
  context?: {
    budget?: number;
    occasion?: string;
    style?: string;
    measurements?: BodyMeasurements;
    items?: ReturnsCartItem[];
    selfieUrl?: string;
    skinTone?: {
      undertone?: 'warm' | 'cool' | 'neutral';
      depth?: 'light' | 'medium' | 'tan' | 'deep';
    };
    preferences?: any;
  };
}

export interface AgentResponse {
  agentType: AgentType;
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    confidence?: number;
  };
}

export interface OrchestratedResponse {
  query: UserQuery;
  responses: AgentResponse[];
  primaryResponse?: AgentResponse;
  metadata: {
    totalProcessingTime: number;
    agentsUsed: AgentType[];
    overallConfidence?: number;
  };
}
