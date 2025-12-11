/**
 * Wishlist Service - Save for later functionality
 */

import { vultrPostgres } from '../lib/vultr-postgres.js';
import {
  BusinessLogicError,
  NotFoundError,
  DatabaseError,
  ErrorCode,
} from '../lib/errors.js';

export interface WishlistItem {
  wishlistId: string;
  userId: string;
  productId: string;
  productData: any;
  notes?: string;
  createdAt: Date;
}

export class WishlistService {
  /**
   * Get user's wishlist
   */
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    try {
      const result = await vultrPostgres.query<WishlistItem>(
        `SELECT wishlist_id as "wishlistId", user_id as "userId", product_id as "productId",
         product_data as "productData", notes, created_at as "createdAt"
         FROM wishlists 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        ...row,
        productData: typeof row.productData === 'string' 
          ? JSON.parse(row.productData) 
          : row.productData,
        createdAt: new Date(row.createdAt),
      }));
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get wishlist: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(
    userId: string,
    productId: string,
    productData: any,
    notes?: string
  ): Promise<WishlistItem> {
    try {
      // Check if already in wishlist
      const existing = await vultrPostgres.query(
        'SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (existing.rows.length > 0) {
        throw new BusinessLogicError(
          'Item already in wishlist',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const wishlistId = `wish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await vultrPostgres.query(
        `INSERT INTO wishlists (wishlist_id, user_id, product_id, product_data, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          wishlistId,
          userId,
          productId,
          JSON.stringify(productData),
          notes || null,
          new Date().toISOString(),
        ]
      );

      return {
        wishlistId,
        userId,
        productId,
        productData,
        notes,
        createdAt: new Date(),
      };
    } catch (error: any) {
      if (error instanceof BusinessLogicError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to add to wishlist: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    try {
      const result = await vultrPostgres.query(
        'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError(
          'Item not found in wishlist',
          ErrorCode.NOT_FOUND
        );
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to remove from wishlist: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Check if product is in wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const result = await vultrPostgres.query(
        'SELECT 1 FROM wishlists WHERE user_id = $1 AND product_id = $2 LIMIT 1',
        [userId, productId]
      );
      return result.rows.length > 0;
    } catch (error: any) {
      return false;
    }
  }
}

export const wishlistService = new WishlistService();
