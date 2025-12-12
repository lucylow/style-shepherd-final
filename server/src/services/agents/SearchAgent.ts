/**
 * Search Agent - Agent-to-Site Pattern
 * Interacts directly with merchant APIs/websites to find products
 */

import { userMemory, orderSQL, styleInference } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import { ExternalServiceError } from '../../lib/errors.js';

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

export interface SearchParams {
  query: string;
  preferences?: {
    colors?: string[];
    brands?: string[];
    styles?: string[];
    sizes?: string[];
    maxPrice?: number;
    minPrice?: number;
  };
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  totalFound: number;
  searchTime: number;
  merchants: string[];
  trendContext?: {
    isTrendQuery: boolean;
    trendKeywords: string[];
    season?: string;
    trendingStyles?: string[];
    trendingColors?: string[];
  };
}

export class SearchAgent {
  private readonly DEFAULT_LIMIT = 20;
  private readonly CACHE_TTL = 300; // 5 minutes

  // Fashion trend keywords for SEO optimization
  private readonly TREND_KEYWORDS = [
    'trending', 'trend', 'trends', 'fashion trend', 'style trend',
    'hot', 'popular', 'viral', 'must-have', 'in style', 'on trend',
    'seasonal', 'spring', 'summer', 'fall', 'winter', 'autumn',
    'new arrival', 'latest', 'current', 'now', 'this season',
    'oversized', 'minimalist', 'vintage', 'retro', 'classic',
    'sustainable', 'eco-friendly', 'organic', 'ethical fashion',
    'athleisure', 'streetwear', 'bohemian', 'chic', 'elegant',
    'casual', 'formal', 'business', 'party', 'wedding',
    'linen', 'denim', 'silk', 'cotton', 'wool', 'cashmere',
    'pastel', 'neutral', 'bold', 'bright', 'muted',
    'corset', 'blazer', 'cargo', 'cargo pants', 'cargo shorts',
    'y2k', '90s', '80s', '70s', 'grunge', 'preppy',
  ];

  private readonly SEASONAL_KEYWORDS: Record<string, string[]> = {
    spring: ['spring', 'floral', 'pastel', 'light', 'fresh', 'renewal'],
    summer: ['summer', 'beach', 'vacation', 'lightweight', 'breathable', 'sundress'],
    fall: ['fall', 'autumn', 'cozy', 'layered', 'warm', 'pumpkin', 'rust'],
    winter: ['winter', 'warm', 'cozy', 'layered', 'wool', 'cashmere', 'boots'],
  };

  /**
   * Search for products across multiple merchants (Agent-to-Site)
   */
  async search(params: SearchParams, userId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    const limit = params.limit || this.DEFAULT_LIMIT;

    // Check cache first
    const cacheKey = `search:${JSON.stringify(params)}`;
    try {
      const cached = await vultrValkey.get<SearchResult>(cacheKey);
      if (cached) {
        console.log('✅ Returning cached search results');
        return cached;
      }
    } catch (error) {
      // Cache miss is fine, continue
    }

    try {
      // Get user preferences if available
      let userPreferences: any = null;
      if (userId) {
        try {
          userPreferences = await userMemory.get(userId);
        } catch (error) {
          console.warn('Failed to get user preferences:', error);
        }
      }

      // Merge user preferences with search params
      const enhancedParams = this.enhanceSearchParams(params, userPreferences);

      // Simulate multi-merchant search (in production, this would call actual merchant APIs)
      const products = await this.searchMultipleMerchants(enhancedParams, limit);

      // Rank products using SmartInference if available
      let rankedProducts = products;
      if (styleInference && userId) {
        try {
          rankedProducts = await this.rankWithAI(products, userId, enhancedParams);
        } catch (error) {
          console.warn('AI ranking failed, using default ranking:', error);
        }
      }

      // Limit results
      const finalProducts = rankedProducts.slice(0, limit);

      // Analyze query for trend context (SEO optimization)
      const trendContext = this.analyzeTrendContext(enhancedParams.query);

      const result: SearchResult = {
        products: finalProducts,
        totalFound: products.length,
        searchTime: Date.now() - startTime,
        merchants: [...new Set(finalProducts.map(p => p.merchantName || 'Unknown'))],
        trendContext,
      };

      // Cache results
      try {
        await vultrValkey.set(cacheKey, result, this.CACHE_TTL);
      } catch (error) {
        // Cache failure is non-critical
        console.warn('Failed to cache search results:', error);
      }

      return result;
    } catch (error) {
      throw new ExternalServiceError(
        'SearchAgent',
        `Product search failed: ${error instanceof Error ? error.message : String(error)}`,
        error as Error,
        { params, userId }
      );
    }
  }

  /**
   * Search across multiple merchants (simulated - in production, call real APIs)
   */
  private async searchMultipleMerchants(params: SearchParams, limit: number): Promise<Product[]> {
    // In production, this would:
    // 1. Call merchant APIs in parallel (e.g., Shopify, WooCommerce, custom APIs)
    // 2. Aggregate results
    // 3. Deduplicate products

    // For now, simulate with mock data
    const mockProducts: Product[] = [
      {
        id: 'prod_1',
        name: `${params.query} - Premium Edition`,
        description: `High-quality ${params.query} with premium materials`,
        price: 89.99,
        brand: 'StyleCo',
        category: params.query.toLowerCase(),
        color: params.preferences?.colors?.[0] || 'Black',
        sizes: ['S', 'M', 'L', 'XL'],
        imageUrl: 'https://via.placeholder.com/300',
        rating: 4.5,
        merchantId: 'merchant_1',
        merchantName: 'StyleCo Store',
        inStock: true,
      },
      {
        id: 'prod_2',
        name: `${params.query} - Classic Style`,
        description: `Classic ${params.query} for everyday wear`,
        price: 59.99,
        brand: 'FashionHub',
        category: params.query.toLowerCase(),
        color: params.preferences?.colors?.[0] || 'Navy',
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrl: 'https://via.placeholder.com/300',
        rating: 4.2,
        merchantId: 'merchant_2',
        merchantName: 'FashionHub',
        inStock: true,
      },
      {
        id: 'prod_3',
        name: `${params.query} - Designer Collection`,
        description: `Designer ${params.query} with unique styling`,
        price: 129.99,
        brand: 'DesignerBrand',
        category: params.query.toLowerCase(),
        color: params.preferences?.colors?.[0] || 'Gray',
        sizes: ['M', 'L', 'XL', 'XXL'],
        imageUrl: 'https://via.placeholder.com/300',
        rating: 4.8,
        merchantId: 'merchant_3',
        merchantName: 'DesignerBrand Boutique',
        inStock: true,
      },
    ];

    // Filter by preferences
    let filtered = mockProducts;
    if (params.preferences) {
      if (params.preferences.maxPrice) {
        filtered = filtered.filter(p => p.price <= params.preferences!.maxPrice!);
      }
      if (params.preferences.minPrice) {
        filtered = filtered.filter(p => p.price >= params.preferences!.minPrice!);
      }
      if (params.preferences.brands && params.preferences.brands.length > 0) {
        filtered = filtered.filter(p => 
          params.preferences!.brands!.some(b => 
            p.brand.toLowerCase().includes(b.toLowerCase())
          )
        );
      }
      if (params.preferences.colors && params.preferences.colors.length > 0) {
        filtered = filtered.filter(p => 
          params.preferences!.colors!.some(c => 
            p.color?.toLowerCase().includes(c.toLowerCase())
          )
        );
      }
    }

    return filtered.slice(0, limit);
  }

  /**
   * Enhance search params with user preferences
   */
  private enhanceSearchParams(params: SearchParams, userProfile: any): SearchParams {
    if (!userProfile) return params;

    const enhanced: SearchParams = { ...params };
    enhanced.preferences = {
      ...params.preferences,
      colors: params.preferences?.colors || userProfile.preferences?.favoriteColors,
      brands: params.preferences?.brands || userProfile.preferences?.preferredBrands,
      styles: params.preferences?.styles || userProfile.preferences?.preferredStyles,
      sizes: params.preferences?.sizes || userProfile.sizePreferences 
        ? Object.values(userProfile.sizePreferences) 
        : undefined,
    };

    return enhanced;
  }

  /**
   * Rank products using SmartInference
   */
  private async rankWithAI(
    products: Product[],
    userId: string,
    params: SearchParams
  ): Promise<Product[]> {
    if (!styleInference || !styleInference.predict) {
      return products;
    }

    try {
      // Use SmartInference to score products
      const scores = await Promise.all(
        products.map(async (product) => {
          try {
            const prediction = await styleInference.predict({
              userId,
              product: {
                id: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                color: product.color,
                price: product.price,
              },
              context: {
                query: params.query,
                preferences: params.preferences,
              },
            });

            return {
              product,
              score: prediction.score || 0.5,
            };
          } catch (error) {
            console.warn(`Failed to score product ${product.id}:`, error);
            return { product, score: 0.5 };
          }
        })
      );

      // Sort by score (descending)
      scores.sort((a, b) => b.score - a.score);
      return scores.map(s => s.product);
    } catch (error) {
      console.warn('AI ranking failed:', error);
      return products;
    }
  }

  /**
   * Analyze search query for fashion trend context (SEO optimization)
   */
  private analyzeTrendContext(query: string): {
    isTrendQuery: boolean;
    trendKeywords: string[];
    season?: string;
    trendingStyles?: string[];
    trendingColors?: string[];
  } {
    const queryLower = query.toLowerCase();
    const trendKeywords: string[] = [];
    let season: string | undefined;
    const trendingStyles: string[] = [];
    const trendingColors: string[] = [];

    // Check for trend keywords
    for (const keyword of this.TREND_KEYWORDS) {
      if (queryLower.includes(keyword.toLowerCase())) {
        trendKeywords.push(keyword);
      }
    }

    // Detect season from query
    for (const [seasonName, keywords] of Object.entries(this.SEASONAL_KEYWORDS)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        season = seasonName;
        break;
      }
    }

    // Detect current season if not found in query
    if (!season) {
      const currentMonth = new Date().getMonth() + 1;
      if (currentMonth >= 12 || currentMonth <= 2) {
        season = 'winter';
      } else if (currentMonth >= 3 && currentMonth <= 5) {
        season = 'spring';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        season = 'summer';
      } else {
        season = 'fall';
      }
    }

    // Extract style keywords
    const styleKeywords = ['oversized', 'minimalist', 'vintage', 'retro', 'classic', 
      'athleisure', 'streetwear', 'bohemian', 'chic', 'elegant', 'casual', 'formal'];
    styleKeywords.forEach(style => {
      if (queryLower.includes(style)) {
        trendingStyles.push(style);
      }
    });

    // Extract color keywords
    const colorKeywords = ['pastel', 'neutral', 'bold', 'bright', 'muted', 'black', 
      'white', 'navy', 'burgundy', 'coral', 'turquoise', 'rust', 'olive'];
    colorKeywords.forEach(color => {
      if (queryLower.includes(color)) {
        trendingColors.push(color);
      }
    });

    return {
      isTrendQuery: trendKeywords.length > 0 || trendingStyles.length > 0,
      trendKeywords,
      season,
      trendingStyles: trendingStyles.length > 0 ? trendingStyles : undefined,
      trendingColors: trendingColors.length > 0 ? trendingColors : undefined,
    };
  }
}

export const searchAgent = new SearchAgent();

