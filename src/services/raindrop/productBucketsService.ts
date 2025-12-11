/**
 * SmartBuckets Service - Product Images and Visual Search
 * 
 * Handles product images, visual search, and media storage
 * using Raindrop SmartBuckets.
 */

import { productBuckets } from '@/integrations/raindrop/config';

export interface ProductImageMetadata {
  productId: string;
  color?: string;
  pattern?: string;
  category?: string;
  style?: string;
  tags?: string[];
  brand?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';
  material?: string;
  price?: number;
  size?: string;
}

export interface SimilarProduct {
  productId: string;
  similarity: number;
  url: string;
  metadata?: ProductImageMetadata;
}

class ProductBucketsService {
  /**
   * Upload product image with comprehensive metadata tagging
   * Supports brand, category, season, and other metadata for advanced filtering
   */
  async uploadProductImage(
    productId: string,
    imageFile: Blob | File | ArrayBuffer,
    metadata: ProductImageMetadata
  ): Promise<string> {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const path = `products/${productId}/${metadata.color || 'default'}-${Date.now()}.jpg`;
      const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile]);
      
      // Enhanced metadata with all required fields
      const enhancedMetadata = {
        ...metadata,
        productId,
        uploadedAt: new Date().toISOString(),
        // Ensure brand, category, and season are included for filtering
        brand: metadata.brand || 'unknown',
        category: metadata.category || 'general',
        season: metadata.season || 'all-season',
      };
      
      const url = await productBuckets.upload(path, blob, enhancedMetadata);
      
      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ProductBucketsService] Failed to upload product image for ${productId}:`, errorMessage);
      throw new Error(`Failed to upload product image: ${errorMessage}`);
    }
  }

  /**
   * Find similar products using visual search with advanced filtering
   * Supports filtering by brand, category, season, and other metadata
   */
  async findSimilarProducts(
    imageUrl: string,
    options?: {
      limit?: number;
      category?: string;
      color?: string;
      brand?: string;
      season?: string;
      minSimilarity?: number;
    }
  ): Promise<SimilarProduct[]> {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      const searchOptions = {
        limit: options?.limit || 10,
        category: options?.category,
        color: options?.color,
        brand: options?.brand,
        season: options?.season,
        minSimilarity: options?.minSimilarity || 0.5,
      };

      const results = await productBuckets.findSimilar(imageUrl, searchOptions);
      
      // Filter by minimum similarity if specified
      const filtered = results
        .filter((result: any) => {
          const similarity = result.similarity || result.score || 0;
          return similarity >= searchOptions.minSimilarity;
        })
        .map((result: any) => ({
          productId: result.productId || result.id,
          similarity: result.similarity || result.score || 0,
          url: result.url || result.imageUrl,
          metadata: result.metadata || {},
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, searchOptions.limit);

      return filtered;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ProductBucketsService] Failed to find similar products:`, errorMessage);
      return [];
    }
  }

  /**
   * Get product image URL
   */
  async getProductImageUrl(productId: string, variant?: string): Promise<string> {
    const path = variant 
      ? `products/${productId}/${variant}.jpg`
      : `products/${productId}/default.jpg`;
    return productBuckets.getUrl(path);
  }

  /**
   * Upload multiple product images
   */
  async uploadProductImages(
    productId: string,
    images: Array<{ file: Blob | File | ArrayBuffer; metadata: ProductImageMetadata }>
  ): Promise<string[]> {
    const uploads = images.map(({ file, metadata }) =>
      this.uploadProductImage(productId, file, { ...metadata, productId })
    );
    return Promise.all(uploads);
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string, imagePath: string): Promise<void> {
    try {
      await productBuckets.delete(`products/${productId}/${imagePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ProductBucketsService] Failed to delete product image ${imagePath} for ${productId}:`, errorMessage);
      throw new Error(`Failed to delete product image: ${errorMessage}`);
    }
  }

  /**
   * Upload product image with File object (convenience method)
   */
  async uploadProductImageFile(
    productId: string,
    image: File,
    metadata: ProductImageMetadata
  ): Promise<string> {
    return this.uploadProductImage(productId, image, metadata);
  }
}

export const productBucketsService = new ProductBucketsService();

