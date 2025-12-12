/**
 * Personal Shopper Types
 */

export interface BodyMeasurements {
  height?: number;
  weight?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
}

export interface OutfitQuery {
  style?: string;
  budget?: number;
  occasion?: string;
  preferredColors?: string[];
  excludedColors?: string[];
  measurements?: BodyMeasurements;
}

export interface OutfitItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl?: string;
  size?: string;
  color?: string;
}

export interface OutfitBundle {
  id: string;
  name: string;
  occasion: string;
  items: OutfitItem[];
  totalPrice: number;
  matchScore: number;
  stylingTips?: string[];
}

export interface PersonalShopperRequest {
  userId?: string;
  query: string;
  occasion?: string;
  budget?: { min?: number; max?: number; };
  preferences?: { colors?: string[]; styles?: string[]; brands?: string[]; };
  measurements?: BodyMeasurements;
}

export interface ShoppingRecommendation {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl?: string;
  category: string;
  matchScore: number;
  reason?: string;
  sizes?: string[];
  recommendedSize?: string;
}

export interface PersonalShopperResponse {
  recommendations: ShoppingRecommendation[];
  stylingAdvice?: string;
  outfitSuggestions?: Array<{ name: string; items: string[]; occasion: string; }>;
  confidence: number;
}
