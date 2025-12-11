/**
 * Cart Service - Persistent cart management
 * Handles cart operations with database persistence, cross-device sync, and guest cart support
 */

import { vultrPostgres } from '../lib/vultr-postgres.js';
import {
  BusinessLogicError,
  NotFoundError,
  DatabaseError,
  ErrorCode,
} from '../lib/errors.js';

export interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  price: number;
  productData?: any; // Snapshot of product at time of adding
}

export interface Cart {
  cartId: string;
  userId: string;
  items: CartItem[];
  sessionId?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
}

export class CartService {
  private readonly GUEST_CART_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly MAX_CART_SIZE = 50;
  private readonly MAX_QUANTITY = 99;

  /**
   * Get or create cart for user
   */
  async getCart(userId: string, sessionId?: string): Promise<Cart> {
    try {
      // Try to get existing cart
      let result = await vultrPostgres.query<Cart>(
        `SELECT cart_id as "cartId", user_id as "userId", items, session_id as "sessionId", 
         expires_at as "expiresAt", created_at as "createdAt", updated_at as "updatedAt"
         FROM carts 
         WHERE user_id = $1 
         ORDER BY updated_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length > 0) {
        const cart = this.mapCartFromDb(result.rows[0]);
        // Clean expired guest carts
        if (cart.expiresAt && cart.expiresAt < new Date()) {
          await this.deleteCart(cart.cartId);
          return this.createCart(userId, sessionId);
        }
        return cart;
      }

      // Create new cart if none exists
      return this.createCart(userId, sessionId);
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get cart: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get guest cart by session ID
   */
  async getGuestCart(sessionId: string): Promise<Cart | null> {
    try {
      const result = await vultrPostgres.query<Cart>(
        `SELECT cart_id as "cartId", user_id as "userId", items, session_id as "sessionId",
         expires_at as "expiresAt", created_at as "createdAt", updated_at as "updatedAt"
         FROM carts 
         WHERE session_id = $1 
         ORDER BY updated_at DESC 
         LIMIT 1`,
        [sessionId]
      );

      if (result.length === 0) {
        return null;
      }

      const cart = this.mapCartFromDb(result[0]);
      
      // Check expiration
      if (cart.expiresAt && cart.expiresAt < new Date()) {
        await this.deleteCart(cart.cartId);
        return null;
      }

      return cart;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get guest cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Create new cart
   */
  async createCart(userId: string, sessionId?: string): Promise<Cart> {
    try {
      const cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = sessionId 
        ? new Date(Date.now() + this.GUEST_CART_TTL)
        : null;

      await vultrPostgres.query(
        `INSERT INTO carts (cart_id, user_id, items, session_id, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          cartId,
          userId,
          JSON.stringify([]),
          sessionId || null,
          expiresAt?.toISOString() || null,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      return {
        cartId,
        userId,
        items: [],
        sessionId,
        expiresAt: expiresAt || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(
    userId: string,
    item: CartItem,
    sessionId?: string
  ): Promise<Cart> {
    try {
      const cart = await this.getCart(userId, sessionId);

      // Validate item
      this.validateCartItem(item);

      // Check cart size limit
      if (cart.items.length >= this.MAX_CART_SIZE) {
        throw new BusinessLogicError(
          `Cart is full. Maximum ${this.MAX_CART_SIZE} items allowed.`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      // Check if item already exists (same product and size)
      const existingIndex = cart.items.findIndex(
        i => i.productId === item.productId && i.size === item.size
      );

      let updatedItems: CartItem[];
      if (existingIndex >= 0) {
        // Update quantity
        const newQuantity = cart.items[existingIndex].quantity + item.quantity;
        if (newQuantity > this.MAX_QUANTITY) {
          throw new BusinessLogicError(
            `Maximum quantity of ${this.MAX_QUANTITY} exceeded`,
            ErrorCode.VALIDATION_ERROR
          );
        }
        updatedItems = [...cart.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: newQuantity,
        };
      } else {
        // Add new item
        updatedItems = [...cart.items, item];
      }

      // Update cart in database
      await vultrPostgres.query(
        `UPDATE carts 
         SET items = $1, updated_at = $2
         WHERE cart_id = $3`,
        [JSON.stringify(updatedItems), new Date().toISOString(), cart.cartId]
      );

      return {
        ...cart,
        items: updatedItems,
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error instanceof BusinessLogicError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to add to cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    userId: string,
    productId: string,
    size: string | undefined,
    quantity: number,
    sessionId?: string
  ): Promise<Cart> {
    try {
      if (quantity < 0) {
        throw new BusinessLogicError(
          'Quantity cannot be negative',
          ErrorCode.VALIDATION_ERROR
        );
      }

      if (quantity > this.MAX_QUANTITY) {
        throw new BusinessLogicError(
          `Maximum quantity of ${this.MAX_QUANTITY} exceeded`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      const cart = await this.getCart(userId, sessionId);

      const itemIndex = cart.items.findIndex(
        i => i.productId === productId && i.size === size
      );

      if (itemIndex === -1) {
        throw new NotFoundError(
          'Item not found in cart',
          ErrorCode.NOT_FOUND
        );
      }

      let updatedItems: CartItem[];
      if (quantity === 0) {
        // Remove item
        updatedItems = cart.items.filter((_, index) => index !== itemIndex);
      } else {
        // Update quantity
        updatedItems = [...cart.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity,
        };
      }

      await vultrPostgres.query(
        `UPDATE carts 
         SET items = $1, updated_at = $2
         WHERE cart_id = $3`,
        [JSON.stringify(updatedItems), new Date().toISOString(), cart.cartId]
      );

      return {
        ...cart,
        items: updatedItems,
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error instanceof BusinessLogicError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to update quantity: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    userId: string,
    productId: string,
    size?: string,
    sessionId?: string
  ): Promise<Cart> {
    try {
      const cart = await this.getCart(userId, sessionId);

      const filteredItems = cart.items.filter(item => {
        if (size !== undefined) {
          return !(item.productId === productId && item.size === size);
        }
        return item.productId !== productId;
      });

      await vultrPostgres.query(
        `UPDATE carts 
         SET items = $1, updated_at = $2
         WHERE cart_id = $3`,
        [JSON.stringify(filteredItems), new Date().toISOString(), cart.cartId]
      );

      return {
        ...cart,
        items: filteredItems,
        updatedAt: new Date(),
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to remove from cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string, sessionId?: string): Promise<void> {
    try {
      const cart = await this.getCart(userId, sessionId);
      await vultrPostgres.query(
        `UPDATE carts 
         SET items = $1, updated_at = $2
         WHERE cart_id = $3`,
        [JSON.stringify([]), new Date().toISOString(), cart.cartId]
      );
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to clear cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Get cart summary with calculations
   */
  async getCartSummary(userId: string, sessionId?: string): Promise<CartSummary> {
    const cart = await this.getCart(userId, sessionId);
    
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const estimatedShipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const estimatedTax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const total = subtotal + estimatedShipping + estimatedTax;

    return {
      items: cart.items,
      totalItems,
      subtotal: Math.round(subtotal * 100) / 100,
      estimatedShipping,
      estimatedTax,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * Merge guest cart into user cart (when user logs in)
   */
  async mergeGuestCart(userId: string, guestSessionId: string): Promise<Cart> {
    try {
      const guestCart = await this.getGuestCart(guestSessionId);
      if (!guestCart || guestCart.items.length === 0) {
        return this.getCart(userId);
      }

      const userCart = await this.getCart(userId);

      // Merge items (combine quantities for same product+size)
      const mergedItems = [...userCart.items];
      
      for (const guestItem of guestCart.items) {
        const existingIndex = mergedItems.findIndex(
          i => i.productId === guestItem.productId && i.size === guestItem.size
        );

        if (existingIndex >= 0) {
          mergedItems[existingIndex].quantity += guestItem.quantity;
          if (mergedItems[existingIndex].quantity > this.MAX_QUANTITY) {
            mergedItems[existingIndex].quantity = this.MAX_QUANTITY;
          }
        } else {
          mergedItems.push(guestItem);
        }
      }

      // Update user cart
      await vultrPostgres.query(
        `UPDATE carts 
         SET items = $1, updated_at = $2
         WHERE cart_id = $3`,
        [JSON.stringify(mergedItems), new Date().toISOString(), userCart.cartId]
      );

      // Delete guest cart
      await this.deleteCart(guestCart.cartId);

      return {
        ...userCart,
        items: mergedItems,
        updatedAt: new Date(),
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to merge guest cart: ${error.message}`,
        ErrorCode.DATABASE_ERROR,
        error
      );
    }
  }

  /**
   * Delete cart
   */
  private async deleteCart(cartId: string): Promise<void> {
    try {
      await vultrPostgres.query('DELETE FROM carts WHERE cart_id = $1', [cartId]);
    } catch (error: any) {
      console.error(`Failed to delete cart ${cartId}:`, error);
    }
  }

  /**
   * Validate cart item
   */
  private validateCartItem(item: CartItem): void {
    if (!item.productId) {
      throw new BusinessLogicError('Product ID is required', ErrorCode.VALIDATION_ERROR);
    }
    if (item.quantity <= 0) {
      throw new BusinessLogicError('Quantity must be greater than 0', ErrorCode.VALIDATION_ERROR);
    }
    if (item.quantity > this.MAX_QUANTITY) {
      throw new BusinessLogicError(
        `Maximum quantity of ${this.MAX_QUANTITY} exceeded`,
        ErrorCode.VALIDATION_ERROR
      );
    }
    if (item.price < 0) {
      throw new BusinessLogicError('Price cannot be negative', ErrorCode.VALIDATION_ERROR);
    }
  }

  /**
   * Map database row to Cart object
   */
  private mapCartFromDb(row: any): Cart {
    return {
      cartId: row.cartId,
      userId: row.userId,
      items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
      sessionId: row.sessionId,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}

export const cartService = new CartService();
