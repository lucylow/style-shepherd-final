/**
 * Product Service
 * 
 * Fetches products from the backend API and transforms them to the frontend model.
 * Falls back to mock service if API is unavailable.
 */

import { apiGet, apiPost, extractApiData } from '@/lib/apiClient';
import { Product } from '@/types/fashion';
import { transformProduct, safeTransformProduct } from '@/lib/transform';
import { handleErrorSilently } from '@/lib/errorHandler';
import { mockProductService } from './mocks/mockProducts';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  gender?: string;
  limit?: number;
}

class ProductService {
  private useMockFallback = false;

  /**
   * Search products with filters using the improved search API
   * Supports both GET (query params) and POST (body) methods
   */
  async searchProducts(filters: SearchFilters = {}): Promise<Product[]> {
    try {
      // Use the improved search API endpoint
      const searchParams: Record<string, string> = {};
      
      if (filters.query) searchParams.q = filters.query;
      if (filters.category) searchParams.category = filters.category;
      if (filters.brand) searchParams.brand = filters.brand;
      if (filters.minPrice !== undefined) searchParams.minPrice = filters.minPrice.toString();
      if (filters.maxPrice !== undefined) searchParams.maxPrice = filters.maxPrice.toString();
      if (filters.limit) searchParams.limit = filters.limit.toString();

      // Use GET request with query parameters (more RESTful)
      const params = new URLSearchParams(searchParams);
      const response = await apiGet<{
        success: boolean;
        data?: {
          results: Product[];
          pagination?: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
          };
          filters?: Record<string, any>;
        };
        results?: Product[]; // Fallback for old format
      }>(
        `/products/search?${params.toString()}`,
        undefined,
        { showErrorToast: false }
      );
      
      // Extract data from ApiResponse wrapper
      const responseData = extractApiData(response);
      
      // Handle new improved response format
      let products: Product[] = [];
      
      if (responseData.data && responseData.data.results) {
        // New format with pagination
        products = responseData.data.results.map(safeTransformProduct);
      } else if (responseData.results && Array.isArray(responseData.results)) {
        // Fallback to old format
        products = responseData.results.map(safeTransformProduct);
      } else if (Array.isArray(responseData)) {
        // Direct array response
        products = responseData.map(safeTransformProduct);
      } else {
        console.warn('[ProductService] Unexpected response shape:', responseData);
        products = [];
      }

      this.useMockFallback = false;
      return products;
    } catch (error: any) {
      // Log error silently (don't show toast for fallback scenarios)
      handleErrorSilently(error);
      this.useMockFallback = true;
      
      // Fallback to mock service
      return mockProductService.searchProducts(filters);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await apiGet<Product | Product[]>(
        `/vultr/postgres/products?id=${id}`,
        undefined,
        { showErrorToast: false }
      );
      
      const responseData = extractApiData(response);
      
      if (Array.isArray(responseData) && responseData.length > 0) {
        return transformProduct(responseData[0]);
      }
      
      if (responseData && typeof responseData === 'object' && 'id' in responseData) {
        return transformProduct(responseData as Product);
      }
      
      return null;
    } catch (error: any) {
      console.error('[ProductService] Error fetching product:', error);
      
      // Fallback to mock service
      return mockProductService.getProductById(id);
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId: string): Promise<Product[]> {
    try {
      // Try the recommendations API endpoint
      const response = await apiPost<{ recommendations?: Array<{ productId?: string }> }>(
        '/recommendations',
        {
          userPreferences: {
            // You can enhance this with actual user preferences from context
          },
          context: {
            sessionType: 'browsing',
          },
        },
        undefined,
        { showErrorToast: false }
      );

      const responseData = extractApiData(response);

      if (responseData.recommendations && Array.isArray(responseData.recommendations)) {
        // Recommendations API returns recommendation results, not full products
        // We need to fetch the actual products
        const productIds = responseData.recommendations
          .map((rec) => rec.productId)
          .filter(Boolean);
        
        if (productIds.length > 0) {
          // Fetch products by IDs (if endpoint supports it)
          // For now, return empty and let it fall back
          // In production, you'd have a batch fetch endpoint
        }
      }

      // If recommendations API doesn't return full products, fall back to search
      return this.searchProducts({ limit: 12 });
    } catch (error: any) {
      // Log error silently (don't show toast for fallback scenarios)
      handleErrorSilently(error);
      
      // Fallback to mock service
      return mockProductService.getRecommendations(userId);
    }
  }

  /**
   * Get all products (no filters)
   */
  async getAllProducts(): Promise<Product[]> {
    return this.searchProducts({});
  }

  /**
   * Check if service is using mock fallback
   */
  isUsingMockFallback(): boolean {
    return this.useMockFallback;
  }
}

export const productService = new ProductService();

