/**
 * Makeup Analysis Types
 */

export interface SkinAnalysis {
  skinTone: string;
  undertone: 'warm' | 'cool' | 'neutral';
  skinType?: 'oily' | 'dry' | 'combination' | 'normal';
  concerns?: string[];
}

export interface MakeupRecommendation {
  category: string;
  productName: string;
  shade?: string;
  description?: string;
  matchScore?: number;
  imageUrl?: string;
  price?: number;
}

export interface MakeupAnalysisResult {
  skinAnalysis: SkinAnalysis;
  recommendations: MakeupRecommendation[];
  occasion?: string;
  confidence: number;
}

export interface MakeupProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  shade?: string;
  price: number;
  imageUrl?: string;
}

export interface MakeupStep {
  order: number;
  product: MakeupProduct;
  technique: string;
  duration: number;
  tips?: string[];
}

export interface MakeupLook {
  id: string;
  name: string;
  occasion: string;
  skinAnalysis: SkinAnalysis;
  steps: MakeupStep[];
  products: MakeupProduct[];
  totalDuration: number;
  confidence: number;
}

export interface CreateLookParams {
  selfieUrl?: string;
  occasion?: string;
  style?: string;
  preferences?: string[];
}
