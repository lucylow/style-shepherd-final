/**
 * Product Recommender - Sponsor Catalog Matching
 * Matches makeup products from sponsor catalog to user needs based on skin analysis and routine
 */

import type { SkinAnalysis } from './skin-analyzer.js';
import type { MakeupRoutine, MakeupStep } from './routine-builder.js';

export interface MakeupProduct {
  id: string;
  name: string;
  brand: string;
  category: string; // 'foundation' | 'concealer' | 'eyeshadow' | 'lipstick' | etc.
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
  discount?: number; // percentage
  stripePriceId?: string;
}

export interface ProductRecommendations {
  products: MakeupProduct[];
  bundles: ProductBundle[];
  recommendedForStep: Record<number, string[]>; // stepNumber -> productIds
}

export class ProductRecommender {
  /**
   * Match products to routine steps
   */
  async matchProducts(
    routine: MakeupRoutine,
    analysis: SkinAnalysis,
    step: MakeupStep
  ): Promise<MakeupProduct[]> {
    // In production, this would:
    // 1. Query sponsor catalog from data/products.json or database
    // 2. Filter by category and productType
    // 3. Match shades based on skin analysis
    // 4. Rank by relevance using cosine similarity
    // 5. Return top matches

    const catalog = await this.loadCatalog();
    const matches = this.findMatches(catalog, step, analysis);

    return matches.slice(0, 5); // Return top 5 matches
  }

  /**
   * Get all product recommendations for a routine
   */
  async getRecommendations(
    routine: MakeupRoutine,
    analysis: SkinAnalysis
  ): Promise<ProductRecommendations> {
    const allProducts: MakeupProduct[] = [];
    const recommendedForStep: Record<number, string[]> = {};

    // Match products for each step
    for (const step of routine.steps) {
      const products = await this.matchProducts(routine, analysis, step);
      allProducts.push(...products);
      recommendedForStep[step.stepNumber] = products.map(p => p.id);
    }

    // Create bundles
    const bundles = this.createBundles(allProducts, routine);

    return {
      products: this.deduplicateProducts(allProducts),
      bundles,
      recommendedForStep,
    };
  }

  /**
   * Load product catalog (from sponsor data or database)
   */
  private async loadCatalog(): Promise<MakeupProduct[]> {
    // In production, load from:
    // - data/products.json
    // - Supabase catalog table
    // - Sponsor API

    // Mock catalog with sponsor products
    return [
      // Foundations
      {
        id: 'foundation_001',
        name: 'Perfect Match Foundation',
        brand: 'Style Shepherd Beauty',
        category: 'foundation',
        productType: 'Foundation',
        shade: 'NC25',
        price: 42.00,
        imageUrl: '/mock/products/foundation-nc25.jpg',
        description: 'Long-wearing foundation with natural finish',
        arPreviewUrl: '/ar/foundation-preview',
        tutorialUrl: '/tutorials/foundation-application',
        inStock: true,
        rating: 4.7,
        reviewsCount: 1243,
      },
      {
        id: 'foundation_002',
        name: 'Perfect Match Foundation',
        brand: 'Style Shepherd Beauty',
        category: 'foundation',
        productType: 'Foundation',
        shade: 'NC30',
        price: 42.00,
        imageUrl: '/mock/products/foundation-nc30.jpg',
        inStock: true,
        rating: 4.7,
        reviewsCount: 1243,
      },
      {
        id: 'foundation_003',
        name: 'Perfect Match Foundation',
        brand: 'Style Shepherd Beauty',
        category: 'foundation',
        productType: 'Foundation',
        shade: 'NW25',
        price: 42.00,
        imageUrl: '/mock/products/foundation-nw25.jpg',
        inStock: true,
        rating: 4.7,
        reviewsCount: 1243,
      },
      // Concealers
      {
        id: 'concealer_001',
        name: 'Radiant Concealer',
        brand: 'Style Shepherd Beauty',
        category: 'concealer',
        productType: 'Concealer',
        shade: 'NC25 + 1',
        price: 28.00,
        imageUrl: '/mock/products/concealer.jpg',
        inStock: true,
        rating: 4.5,
        reviewsCount: 892,
      },
      // Eyeshadow Palettes
      {
        id: 'palette_warm_001',
        name: 'Warm Glam Palette',
        brand: 'Style Shepherd Beauty',
        category: 'eyeshadow',
        productType: 'Eyeshadow Palette',
        shade: 'Warm Glam',
        price: 58.00,
        imageUrl: '/mock/products/warm-glam-palette.jpg',
        arPreviewUrl: '/ar/eyeshadow-preview',
        tutorialUrl: '/tutorials/glam-eye-look',
        inStock: true,
        rating: 4.8,
        reviewsCount: 2156,
      },
      {
        id: 'palette_cool_001',
        name: 'Cool Glam Palette',
        brand: 'Style Shepherd Beauty',
        category: 'eyeshadow',
        productType: 'Eyeshadow Palette',
        shade: 'Cool Glam',
        price: 58.00,
        imageUrl: '/mock/products/cool-glam-palette.jpg',
        inStock: true,
        rating: 4.8,
        reviewsCount: 2156,
      },
      {
        id: 'palette_neutral_001',
        name: 'Neutral Smoky Palette',
        brand: 'Style Shepherd Beauty',
        category: 'eyeshadow',
        productType: 'Eyeshadow Palette',
        shade: 'Neutral Smoky',
        price: 58.00,
        imageUrl: '/mock/products/neutral-smoky-palette.jpg',
        inStock: true,
        rating: 4.9,
        reviewsCount: 3421,
      },
      // Lipsticks
      {
        id: 'lipstick_red_001',
        name: 'Classic Red Lipstick',
        brand: 'Style Shepherd Beauty',
        category: 'lipstick',
        productType: 'Lipstick',
        shade: 'Classic Red',
        price: 32.00,
        imageUrl: '/mock/products/red-lipstick.jpg',
        arPreviewUrl: '/ar/lipstick-preview',
        tutorialUrl: '/tutorials/perfect-red-lips',
        inStock: true,
        rating: 4.6,
        reviewsCount: 1876,
      },
      {
        id: 'lipstick_nude_001',
        name: 'Nude Lipstick',
        brand: 'Style Shepherd Beauty',
        category: 'lipstick',
        productType: 'Lipstick',
        shade: 'Nude Peach',
        price: 32.00,
        imageUrl: '/mock/products/nude-lipstick.jpg',
        inStock: true,
        rating: 4.5,
        reviewsCount: 1234,
      },
      {
        id: 'lipstick_berry_001',
        name: 'Berry Lipstick',
        brand: 'Style Shepherd Beauty',
        category: 'lipstick',
        productType: 'Lipstick',
        shade: 'Berry',
        price: 32.00,
        imageUrl: '/mock/products/berry-lipstick.jpg',
        inStock: true,
        rating: 4.7,
        reviewsCount: 1567,
      },
      // Blush
      {
        id: 'blush_peach_001',
        name: 'Peachy Pink Blush',
        brand: 'Style Shepherd Beauty',
        category: 'blush',
        productType: 'Blush',
        shade: 'Peachy Pink',
        price: 26.00,
        imageUrl: '/mock/products/peach-blush.jpg',
        inStock: true,
        rating: 4.4,
        reviewsCount: 987,
      },
      {
        id: 'blush_rose_001',
        name: 'Soft Rose Blush',
        brand: 'Style Shepherd Beauty',
        category: 'blush',
        productType: 'Blush',
        shade: 'Soft Rose',
        price: 26.00,
        imageUrl: '/mock/products/rose-blush.jpg',
        inStock: true,
        rating: 4.4,
        reviewsCount: 987,
      },
      // Mascara
      {
        id: 'mascara_001',
        name: 'Volume Mascara',
        brand: 'Style Shepherd Beauty',
        category: 'mascara',
        productType: 'Mascara',
        shade: 'Black',
        price: 24.00,
        imageUrl: '/mock/products/mascara.jpg',
        inStock: true,
        rating: 4.6,
        reviewsCount: 2341,
      },
      // Eyeliner
      {
        id: 'eyeliner_001',
        name: 'Precision Eyeliner',
        brand: 'Style Shepherd Beauty',
        category: 'eyeliner',
        productType: 'Eyeliner',
        shade: 'Black',
        price: 22.00,
        imageUrl: '/mock/products/eyeliner.jpg',
        inStock: true,
        rating: 4.5,
        reviewsCount: 1456,
      },
      // Highlighter
      {
        id: 'highlighter_champagne_001',
        name: 'Champagne Highlighter',
        brand: 'Style Shepherd Beauty',
        category: 'highlighter',
        productType: 'Highlighter',
        shade: 'Champagne',
        price: 30.00,
        imageUrl: '/mock/products/highlighter.jpg',
        inStock: true,
        rating: 4.7,
        reviewsCount: 1123,
      },
      // Primer
      {
        id: 'primer_001',
        name: 'Hydrating Face Primer',
        brand: 'Style Shepherd Beauty',
        category: 'primer',
        productType: 'Face Primer',
        shade: 'Universal',
        price: 34.00,
        imageUrl: '/mock/products/primer.jpg',
        inStock: true,
        rating: 4.5,
        reviewsCount: 876,
      },
      // Setting Spray
      {
        id: 'setting_spray_001',
        name: 'Long-Wear Setting Spray',
        brand: 'Style Shepherd Beauty',
        category: 'setting',
        productType: 'Setting Spray',
        shade: 'Universal',
        price: 28.00,
        imageUrl: '/mock/products/setting-spray.jpg',
        inStock: true,
        rating: 4.6,
        reviewsCount: 1654,
      },
    ];
  }

  /**
   * Find matching products for a step
   */
  private findMatches(
    catalog: MakeupProduct[],
    step: MakeupStep,
    analysis: SkinAnalysis
  ): MakeupProduct[] {
    // Filter by product type
    let matches = catalog.filter(
      product => product.productType === step.productType
    );

    // Match shades for color products
    if (this.isColorProduct(step.productType)) {
      matches = this.matchShades(matches, step.shadeRecommendation, analysis);
    }

    // Sort by relevance (rating, reviews, stock status)
    matches.sort((a, b) => {
      // Prioritize in-stock items
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;

      // Then by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) return ratingB - ratingA;

      // Then by review count
      return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    return matches;
  }

  /**
   * Check if product type requires shade matching
   */
  private isColorProduct(productType: string): boolean {
    const colorProducts = [
      'Foundation',
      'Concealer',
      'Lipstick',
      'Blush',
      'Highlighter',
      'Eyeshadow Palette',
    ];
    return colorProducts.includes(productType);
  }

  /**
   * Match shades based on recommendation and analysis
   */
  private matchShades(
    products: MakeupProduct[],
    shadeRecommendation: string,
    analysis: SkinAnalysis
  ): MakeupProduct[] {
    // Simple matching - in production, use more sophisticated algorithm
    const recommendationLower = shadeRecommendation.toLowerCase();

    return products.filter(product => {
      const productShade = product.shade.toLowerCase();

      // Exact match
      if (productShade.includes(recommendationLower) || recommendationLower.includes(productShade)) {
        return true;
      }

      // Partial match for shade systems (NC25 matches NC20, NC30)
      if (recommendationLower.includes('nc') || recommendationLower.includes('nw') || recommendationLower.includes('n')) {
        const recNumber = parseInt(recommendationLower.match(/\d+/)?.[0] || '0');
        const prodNumber = parseInt(productShade.match(/\d+/)?.[0] || '0');
        
        // Match within 2 shades
        if (Math.abs(recNumber - prodNumber) <= 2) {
          return true;
        }
      }

      // Color name matching
      const colorKeywords = ['red', 'pink', 'peach', 'nude', 'berry', 'rose', 'coral', 'warm', 'cool', 'neutral'];
      for (const keyword of colorKeywords) {
        if (recommendationLower.includes(keyword) && productShade.includes(keyword)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Create product bundles
   */
  private createBundles(
    products: MakeupProduct[],
    routine: MakeupRoutine
  ): ProductBundle[] {
    const bundles: ProductBundle[] = [];

    // Full Look Bundle (all essential products)
    const essentialProducts = this.getEssentialProducts(products);
    if (essentialProducts.length >= 5) {
      const totalPrice = essentialProducts.reduce((sum, p) => sum + p.price, 0);
      bundles.push({
        bundleId: 'bundle_full_look',
        name: `Complete ${routine.style} Look Bundle`,
        products: essentialProducts,
        totalPrice,
        discountedPrice: totalPrice * 0.85, // 15% discount
        discount: 15,
      });
    }

    // Eye Look Bundle
    const eyeProducts = products.filter(p =>
      ['eyeshadow', 'eyeliner', 'mascara'].includes(p.category)
    );
    if (eyeProducts.length >= 2) {
      const totalPrice = eyeProducts.reduce((sum, p) => sum + p.price, 0);
      bundles.push({
        bundleId: 'bundle_eye_look',
        name: 'Complete Eye Look Bundle',
        products: eyeProducts,
        totalPrice,
        discountedPrice: totalPrice * 0.9, // 10% discount
        discount: 10,
      });
    }

    // Base Bundle (foundation, concealer, primer)
    const baseProducts = products.filter(p =>
      ['foundation', 'concealer', 'primer'].includes(p.category)
    );
    if (baseProducts.length >= 2) {
      const totalPrice = baseProducts.reduce((sum, p) => sum + p.price, 0);
      bundles.push({
        bundleId: 'bundle_base',
        name: 'Flawless Base Bundle',
        products: baseProducts,
        totalPrice,
        discountedPrice: totalPrice * 0.88, // 12% discount
        discount: 12,
      });
    }

    return bundles;
  }

  /**
   * Get essential products for a complete look
   */
  private getEssentialProducts(products: MakeupProduct[]): MakeupProduct[] {
    const essential: MakeupProduct[] = [];
    const categories = ['primer', 'foundation', 'concealer', 'eyeshadow', 'mascara', 'blush', 'lipstick'];

    for (const category of categories) {
      const product = products.find(p => p.category === category);
      if (product) {
        essential.push(product);
      }
    }

    return essential;
  }

  /**
   * Deduplicate products by ID
   */
  private deduplicateProducts(products: MakeupProduct[]): MakeupProduct[] {
    const seen = new Set<string>();
    return products.filter(product => {
      if (seen.has(product.id)) {
        return false;
      }
      seen.add(product.id);
      return true;
    });
  }
}
