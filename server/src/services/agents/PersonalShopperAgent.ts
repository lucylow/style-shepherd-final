/**
 * Personal Shopper Agent
 * Analyzes user preferences, budget, and style profile to recommend complete outfits
 * Integrates with sponsor mock data and Stripe history
 */

import { userMemory, orderSQL, styleInference } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import { vultrPostgres } from '../../lib/vultr-postgres.js';
import { ExternalServiceError } from '../../lib/errors.js';
import type { Product } from './SearchAgent.js';
import { searchAgent } from './SearchAgent.js';
import { trendService } from '../TrendService.js';

export interface UserProfile {
  userId: string;
  style?: string;
  preferences?: {
    colors?: string[];
    brands?: string[];
    styles?: string[];
    sizes?: string[];
  };
  budget?: number;
  pastPurchases?: string[];
  styleEvolution?: Array<{
    version: number;
    date: string;
    style: string;
    accuracy: number;
    preferences: any;
  }>;
}

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
  product: Product;
  recommendedSize?: string;
  role: 'top' | 'bottom' | 'dress' | 'shoes' | 'accessories' | 'outerwear';
  essential: boolean; // Core item vs optional
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

export class PersonalShopperAgent {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly DEFAULT_OUTFIT_COUNT = 3;
  private readonly MIN_OUTFIT_CONFIDENCE = 0.6;

  /**
   * Recommend complete outfits based on user profile and budget
   */
  async recommendOutfits(params: OutfitRecommendationParams): Promise<OutfitRecommendationResult> {
    const cacheKey = `outfits:${params.userId}:${params.budget}:${params.occasion || 'general'}`;
    
    try {
      const cached = await vultrValkey.get<OutfitRecommendationResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    try {
      // Get user profile
      const userProfile = await this.getUserProfile(params.userId);

      // Merge provided preferences with user profile
      const preferences = {
        ...userProfile.preferences,
        ...params.preferences,
      };

      // Determine style context
      const styleContext = params.style || userProfile.style || 'casual';

      // Search for products matching preferences
      const products = await this.fetchProductsForOutfits({
        preferences,
        budget: params.budget,
        occasion: params.occasion,
        style: styleContext,
        excludeIds: params.excludeProductIds || [],
      });

      // Generate outfit bundles using ML scoring
      const outfits = await this.generateOutfitBundles({
        products,
        userProfile,
        budget: params.budget,
        occasion: params.occasion,
        style: styleContext,
      });

      // Rank outfits by confidence and style match
      const rankedOutfits = this.rankOutfits(outfits, userProfile);

      // Filter by minimum confidence
      const filteredOutfits = rankedOutfits.filter(
        (outfit) => outfit.confidence >= this.MIN_OUTFIT_CONFIDENCE
      ).slice(0, this.DEFAULT_OUTFIT_COUNT);

      // Calculate metrics
      const averageConfidence = filteredOutfits.length > 0
        ? filteredOutfits.reduce((sum, o) => sum + o.confidence, 0) / filteredOutfits.length
        : 0;

      const budgetUtilization = filteredOutfits.length > 0
        ? filteredOutfits.reduce((sum, o) => sum + o.totalPrice, 0) / filteredOutfits.length / params.budget
        : 0;

      const result: OutfitRecommendationResult = {
        outfits: filteredOutfits,
        totalOutfits: filteredOutfits.length,
        averageConfidence,
        budgetUtilization: Math.min(budgetUtilization, 1.0),
        reasoning: this.generateReasoning(filteredOutfits, userProfile, params),
      };

      // Cache result
      await vultrValkey.set(cacheKey, result, this.CACHE_TTL).catch(() => {});

      return result;
    } catch (error) {
      throw new ExternalServiceError(
        'PersonalShopperAgent',
        `Failed to recommend outfits: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error(String(error)),
        { userId: params.userId }
      );
    }
  }

  /**
   * Get user profile from Raindrop SmartMemory
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const profile = await userMemory.get(userId);
      return {
        userId,
        style: profile?.style || 'casual',
        preferences: profile?.preferences || {},
        budget: profile?.budget,
        pastPurchases: profile?.pastPurchases || [],
        styleEvolution: profile?.styleEvolution || [],
      };
    } catch (error) {
      // Return default profile if not found
      return {
        userId,
        style: 'casual',
        preferences: {},
        pastPurchases: [],
        styleEvolution: [],
      };
    }
  }

  /**
   * Fetch products that could be part of outfits
   */
  private async fetchProductsForOutfits(params: {
    preferences: any;
    budget: number;
    occasion?: string;
    style?: string;
    excludeIds: string[];
  }): Promise<Product[]> {
    const categories = this.getCategoriesForOccasion(params.occasion, params.style);
    const allProducts: Product[] = [];

    // Search for products in each category
    for (const category of categories) {
      try {
        const searchResult = await searchAgent.search({
          query: category,
          preferences: {
            colors: params.preferences.colors,
            brands: params.preferences.brands,
            styles: params.preferences.styles,
            maxPrice: params.budget * 0.6, // Individual items shouldn't exceed 60% of budget
          },
          limit: 20,
        }, undefined);

        // Filter out excluded products
        const filtered = searchResult.products.filter(
          (p) => !params.excludeIds.includes(p.id) && p.price <= params.budget * 0.6
        );

        allProducts.push(...filtered);
      } catch (error) {
        console.warn(`Failed to search for ${category}:`, error);
      }
    }

    return allProducts;
  }

  /**
   * Generate outfit bundles from products
   */
  private async generateOutfitBundles(params: {
    products: Product[];
    userProfile: UserProfile;
    budget: number;
    occasion?: string;
    style?: string;
  }): Promise<OutfitBundle[]> {
    const outfits: OutfitBundle[] = [];

    // Group products by category/role
    const productsByRole = this.groupProductsByRole(params.products);

    // Generate multiple outfit combinations
    const combinations = this.generateCombinations(productsByRole, params.budget);

    for (const combination of combinations) {
      const outfit = await this.createOutfitBundle({
        items: combination,
        userProfile: params.userProfile,
        budget: params.budget,
        occasion: params.occasion,
        style: params.style,
      });

      if (outfit) {
        outfits.push(outfit);
      }
    }

    return outfits;
  }

  /**
   * Group products by their role in an outfit
   */
  private groupProductsByRole(products: Product[]): Record<string, Product[]> {
    const grouped: Record<string, Product[]> = {
      top: [],
      bottom: [],
      dress: [],
      shoes: [],
      accessories: [],
      outerwear: [],
    };

    for (const product of products) {
      const category = product.category.toLowerCase();
      
      if (category.includes('dress')) {
        grouped.dress.push(product);
      } else if (category.includes('top') || category.includes('shirt') || category.includes('blouse')) {
        grouped.top.push(product);
      } else if (category.includes('bottom') || category.includes('pant') || category.includes('skirt')) {
        grouped.bottom.push(product);
      } else if (category.includes('shoe') || category.includes('boot')) {
        grouped.shoes.push(product);
      } else if (category.includes('jacket') || category.includes('coat') || category.includes('blazer')) {
        grouped.outerwear.push(product);
      } else {
        grouped.accessories.push(product);
      }
    }

    return grouped;
  }

  /**
   * Generate valid product combinations for outfits
   */
  private generateCombinations(
    productsByRole: Record<string, Product[]>,
    budget: number
  ): Array<Array<{ product: Product; role: string }>> {
    const combinations: Array<Array<{ product: Product; role: string }>> = [];

    // Strategy 1: Dress + Shoes + Accessories
    for (const dress of productsByRole.dress.slice(0, 5)) {
      for (const shoes of productsByRole.shoes.slice(0, 3)) {
        const total = dress.price + shoes.price;
        if (total <= budget) {
          const accessories = this.selectAccessories(
            productsByRole.accessories,
            budget - total,
            2
          );
          combinations.push([
            { product: dress, role: 'dress' },
            { product: shoes, role: 'shoes' },
            ...accessories.map((a) => ({ product: a, role: 'accessories' })),
          ]);
        }
      }
    }

    // Strategy 2: Top + Bottom + Shoes + Optional Outerwear
    for (const top of productsByRole.top.slice(0, 5)) {
      for (const bottom of productsByRole.bottom.slice(0, 5)) {
        for (const shoes of productsByRole.shoes.slice(0, 3)) {
          const baseTotal = top.price + bottom.price + shoes.price;
          if (baseTotal <= budget) {
            const remaining = budget - baseTotal;
            const outerwear = productsByRole.outerwear
              .filter((o) => o.price <= remaining)
              .slice(0, 1);
            
            const accessories = this.selectAccessories(
              productsByRole.accessories,
              remaining - (outerwear[0]?.price || 0),
              1
            );

            combinations.push([
              { product: top, role: 'top' },
              { product: bottom, role: 'bottom' },
              { product: shoes, role: 'shoes' },
              ...outerwear.map((o) => ({ product: o, role: 'outerwear' })),
              ...accessories.map((a) => ({ product: a, role: 'accessories' })),
            ]);
          }
        }
      }
    }

    return combinations.slice(0, 20); // Limit combinations
  }

  /**
   * Select accessories within budget
   */
  private selectAccessories(accessories: Product[], budget: number, maxCount: number): Product[] {
    return accessories
      .filter((a) => a.price <= budget)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, maxCount);
  }

  /**
   * Create an outfit bundle with scoring
   */
  private async createOutfitBundle(params: {
    items: Array<{ product: Product; role: string }>;
    userProfile: UserProfile;
    budget: number;
    occasion?: string;
    style?: string;
  }): Promise<OutfitBundle | null> {
    const totalPrice = params.items.reduce((sum, item) => sum + item.product.price, 0);

    if (totalPrice > params.budget) {
      return null;
    }

    // Calculate style match using cosine similarity
    const styleMatch = await this.calculateStyleMatch(params.items, params.userProfile);

    // Get trend data for trend-aware scoring
    const keywords = this.extractKeywordsFromItems(params.items, params.userProfile);
    let trendBoost = 0;
    try {
      const isAvailable = await trendService.isAvailable();
      if (isAvailable && keywords.length > 0) {
        const trendData = await trendService.getCombined(keywords, 8);
        trendBoost = this.calculateTrendBoost(params.items, trendData);
      }
    } catch (error) {
      // Trend service unavailable - continue without trend boost
      console.warn('[PersonalShopperAgent] Trend service unavailable, continuing without trend boost:', error);
    }

    // Calculate confidence based on multiple factors (now includes trend boost)
    const confidence = this.calculateOutfitConfidence({
      items: params.items,
      styleMatch,
      budgetUtilization: totalPrice / params.budget,
      occasion: params.occasion,
      trendBoost,
    });

    if (confidence < this.MIN_OUTFIT_CONFIDENCE) {
      return null;
    }

    const outfitItems: OutfitItem[] = params.items.map((item) => ({
      productId: item.product.id,
      product: item.product,
      role: item.role as OutfitItem['role'],
      essential: ['top', 'bottom', 'dress'].includes(item.role),
    }));

    return {
      id: `outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateOutfitName(outfitItems, params.occasion),
      occasion: params.occasion,
      items: outfitItems,
      totalPrice,
      confidence,
      reasoning: this.generateOutfitReasoning(outfitItems, styleMatch, params.userProfile),
      styleMatch,
    };
  }

  /**
   * Extract keywords from items and user profile for trend lookup
   */
  private extractKeywordsFromItems(
    items: Array<{ product: Product; role: string }>,
    userProfile: UserProfile
  ): string[] {
    const keywords: string[] = [];
    
    // Extract from product categories and tags
    for (const item of items) {
      if (item.product.category) {
        const cat = item.product.category.toLowerCase();
        keywords.push(cat);
      }
      const productWithTags = item.product as Product & { tags?: string[] };
      if (productWithTags.tags && Array.isArray(productWithTags.tags)) {
        keywords.push(...productWithTags.tags.map((t: string) => t.toLowerCase()));
      }
    }

    // Add user preferences
    if (userProfile.preferences?.styles) {
      keywords.push(...userProfile.preferences.styles.map(s => s.toLowerCase()));
    }

    // Deduplicate and limit
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Calculate trend boost score for items based on trend data
   */
  private calculateTrendBoost(
    items: Array<{ product: Product; role: string }>,
    trendData: any
  ): number {
    if (!trendData || !trendData.clusters) {
      return 0;
    }

    let totalBoost = 0;
    let count = 0;

    for (const item of items) {
      const productWithTags = item.product as Product & { tags?: string[] };
      const category = item.product.category?.toLowerCase() || productWithTags.tags?.[0]?.toLowerCase() || '';
      
      // Check clusters for matching category
      const clusterMatch = trendData.clusters.find((c: any) => 
        c.category?.toLowerCase() === category || 
        category.includes(c.category?.toLowerCase() || '')
      );
      
      if (clusterMatch) {
        totalBoost += clusterMatch.combined_score || 0;
        count++;
      } else {
        // Check extra_trends
        const trendMatch = trendData.extra_trends?.find((t: any) => 
          t.category?.toLowerCase() === category ||
          category.includes(t.category?.toLowerCase() || '')
        );
        
        if (trendMatch) {
          totalBoost += trendMatch.trend_score || 0;
          count++;
        }
      }
    }

    return count > 0 ? totalBoost / count : 0;
  }

  /**
   * Calculate style match using cosine similarity
   */
  private async calculateStyleMatch(
    items: Array<{ product: Product; role: string }>,
    userProfile: UserProfile
  ): Promise<number> {
    if (!userProfile.preferences || Object.keys(userProfile.preferences).length === 0) {
      return 0.7; // Default match if no preferences
    }

    let totalMatch = 0;
    let count = 0;

    for (const item of items) {
      let itemMatch = 0.5; // Base match

      // Color match
      if (userProfile.preferences.colors && item.product.color) {
        const colorMatch = userProfile.preferences.colors.some(
          (prefColor) => item.product.color?.toLowerCase().includes(prefColor.toLowerCase())
        );
        if (colorMatch) itemMatch += 0.2;
      }

      // Brand match
      if (userProfile.preferences.brands && item.product.brand) {
        const brandMatch = userProfile.preferences.brands.some(
          (prefBrand) => item.product.brand.toLowerCase().includes(prefBrand.toLowerCase())
        );
        if (brandMatch) itemMatch += 0.2;
      }

      // Style match (from category)
      if (userProfile.preferences.styles && item.product.category) {
        const styleMatch = userProfile.preferences.styles.some((prefStyle) =>
          item.product.category.toLowerCase().includes(prefStyle.toLowerCase())
        );
        if (styleMatch) itemMatch += 0.1;
      }

      totalMatch += Math.min(itemMatch, 1.0);
      count++;
    }

    return count > 0 ? totalMatch / count : 0.7;
  }

  /**
   * Calculate outfit confidence score
   */
  private calculateOutfitConfidence(params: {
    items: Array<{ product: Product; role: string }>;
    styleMatch: number;
    budgetUtilization: number;
    occasion?: string;
    trendBoost?: number;
  }): number {
    let confidence = 0.5; // Base confidence

    // Style match contributes 40% (reduced from original to make room for trend)
    confidence += params.styleMatch * 0.35;

    // Trend boost contributes 10% (new)
    if (params.trendBoost !== undefined) {
      confidence += params.trendBoost * 0.10;
    }

    // Budget utilization (optimal is 70-90%)
    const budgetScore = params.budgetUtilization >= 0.7 && params.budgetUtilization <= 0.9
      ? 0.2
      : params.budgetUtilization >= 0.5 && params.budgetUtilization < 0.95
      ? 0.1
      : 0;
    confidence += budgetScore;

    // Product ratings contribute 20%
    const avgRating = params.items.reduce((sum, item) => sum + (item.product.rating || 3.5), 0) / params.items.length;
    confidence += (avgRating / 5) * 0.2;

    // Completeness (has essential items) contributes 15% (reduced from 20%)
    const hasTopOrDress = params.items.some((i) => ['top', 'dress'].includes(i.role));
    const hasBottomOrDress = params.items.some((i) => ['bottom', 'dress'].includes(i.role));
    const hasShoes = params.items.some((i) => i.role === 'shoes');
    const completeness = (hasTopOrDress ? 0.33 : 0) + (hasBottomOrDress ? 0.33 : 0) + (hasShoes ? 0.34 : 0);
    confidence += completeness * 0.15;

    return Math.min(confidence, 1.0);
  }

  /**
   * Rank outfits by confidence and style match
   */
  private rankOutfits(outfits: OutfitBundle[], userProfile: UserProfile): OutfitBundle[] {
    return outfits.sort((a, b) => {
      // Primary: confidence
      if (Math.abs(a.confidence - b.confidence) > 0.05) {
        return b.confidence - a.confidence;
      }
      // Secondary: style match
      return b.styleMatch - a.styleMatch;
    });
  }

  /**
   * Generate outfit name
   */
  private generateOutfitName(items: OutfitItem[], occasion?: string): string {
    const mainItem = items.find((i) => i.role === 'dress') || items.find((i) => i.role === 'top');
    const baseName = mainItem?.product.name || 'Complete Outfit';
    
    if (occasion) {
      return `${occasion.charAt(0).toUpperCase() + occasion.slice(1)} ${baseName}`;
    }
    return baseName;
  }

  /**
   * Generate reasoning for outfit recommendation
   */
  private generateOutfitReasoning(
    items: OutfitItem[],
    styleMatch: number,
    userProfile: UserProfile
  ): string {
    const reasons: string[] = [];

    if (styleMatch > 0.8) {
      reasons.push('Perfectly matches your style preferences');
    } else if (styleMatch > 0.6) {
      reasons.push('Well-aligned with your style');
    }

    const colors = items
      .map((i) => i.product.color)
      .filter((c): c is string => !!c)
      .filter((c, i, arr) => arr.indexOf(c) === i);
    
    if (colors.length > 0) {
      reasons.push(`Features ${colors.join(', ')} colors`);
    }

    const brands = items
      .map((i) => i.product.brand)
      .filter((b, i, arr) => arr.indexOf(b) === i);
    
    if (brands.length > 0 && brands.length <= 3) {
      reasons.push(`Includes pieces from ${brands.join(', ')}`);
    }

    return reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'Curated based on your preferences and budget.';
  }

  /**
   * Generate overall reasoning for recommendations
   */
  private generateReasoning(
    outfits: OutfitBundle[],
    userProfile: UserProfile,
    params: OutfitRecommendationParams
  ): string {
    if (outfits.length === 0) {
      return 'Unable to generate outfit recommendations with the current constraints.';
    }

    const style = params.style || userProfile.style || 'casual';
    const occasion = params.occasion ? ` for ${params.occasion}` : '';

    return `Curated ${outfits.length} complete outfit${outfits.length > 1 ? 's' : ''} in ${style} style${occasion}, optimized for your budget of $${params.budget} and style preferences.`;
  }

  /**
   * Get product categories based on occasion and style
   */
  private getCategoriesForOccasion(occasion?: string, style?: string): string[] {
    const baseCategories = ['dress', 'top', 'bottom', 'shoes'];

    if (occasion) {
      const occasionMap: Record<string, string[]> = {
        wedding: ['dress', 'formal shoes', 'accessories'],
        beach: ['swimwear', 'cover-up', 'sandals'],
        business: ['blazer', 'dress shirt', 'dress pants', 'dress shoes'],
        casual: ['t-shirt', 'jeans', 'sneakers'],
        party: ['dress', 'heels', 'accessories'],
      };

      return occasionMap[occasion.toLowerCase()] || baseCategories;
    }

    return baseCategories;
  }
}

// Singleton instance
export const personalShopperAgent = new PersonalShopperAgent();
