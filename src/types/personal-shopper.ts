/**
 * Personal Shopper Agent Types
 * Frontend types for outfit curation
 */

export interface BodyMeasurements {
  height?: number; // cm
  weight?: number; // kg
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  shoeSize?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  brand: string;
  category: string;
  color?: string;
  sizes?: string[];
  imageUrl?: string;
  rating?: number;
  merchantId?: string;
  merchantName?: string;
  inStock?: boolean;
  url?: string;
}

export interface OutfitBundleProduct {
  product: Product;
  recommendedSize?: string;
  confidence: number;
  reasoning: string;
}

export interface OutfitBundle {
  id: string;
  name: string;
  occasion: string;
  products: OutfitBundleProduct[];
  totalCost: number;
  confidence: number; // Overall outfit match score
  reasoning: string; // Why this outfit was chosen
  stripeCheckoutUrl?: string; // Generated checkout link
  estimatedReturnRisk?: number; // 0-1
}

export interface OutfitQuery {
  style?: string; // e.g., "business casual", "summer casual"
  budget: number;
  occasion: string; // e.g., "wedding", "work", "date", "beach"
  measurements?: BodyMeasurements;
  userId?: string;
  preferredColors?: string[];
  excludeCategories?: string[];
}

export interface PersonalShopperResponse {
  outfits: OutfitBundle[];
  count: number;
  query: OutfitQuery;
}
