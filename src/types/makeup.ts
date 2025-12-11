/**
 * Makeup Artist Agent Types
 */

export interface SkinAnalysis {
  skinTone: {
    fitzpatrickScale: number;
    rgb: { r: number; g: number; b: number };
    hsv: { h: number; s: number; v: number };
    label: string;
  };
  undertone: 'warm' | 'cool' | 'neutral';
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong';
  features: {
    eyeShape: 'almond' | 'round' | 'hooded' | 'monolid' | 'downturned' | 'upturned';
    lipFullness: number;
    faceOvality: number;
    cheekboneProminence: number;
  };
  confidence: number;
}

export interface MakeupStep {
  stepNumber: number;
  category: 'base' | 'eyes' | 'lips' | 'cheeks' | 'brows' | 'finishing';
  name: string;
  description: string;
  productType: string;
  shadeRecommendation: string;
  applicationTips: string[];
  estimatedTime: number;
  videoTimestamp?: number;
  tutorialUrl?: string;
}

export interface MakeupRoutine {
  occasion: string;
  style: string;
  steps: MakeupStep[];
  totalTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface MakeupProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  productType: string;
  shade: string;
  price: number;
  imageUrl?: string;
  description?: string;
  arPreviewUrl?: string;
  tutorialUrl?: string;
  inStock: boolean;
  rating?: number;
  reviewsCount?: number;
}

export interface ProductBundle {
  bundleId: string;
  name: string;
  products: MakeupProduct[];
  totalPrice: number;
  discountedPrice?: number;
  discount?: number;
  stripePriceId?: string;
}

export interface ProductRecommendations {
  products: MakeupProduct[];
  bundles: ProductBundle[];
  recommendedForStep: Record<number, string[]>;
}

export interface MakeupLook {
  lookId: string;
  occasion: string;
  routine: MakeupRoutine;
  analysis: SkinAnalysis;
  products: ProductRecommendations;
  createdAt: string;
  userId?: string;
}

export interface CreateLookParams {
  selfieUrl: string;
  occasion: string;
  preferences?: string[];
  userId?: string;
}
