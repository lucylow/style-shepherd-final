/**
 * Cart Service - Frontend
 * Persistent cart management with backend API integration
 * Supports both logged-in users and guest sessions
 */

import { CartItem, Product } from '@/types/fashion';
import { apiGet, apiPost, apiPut, apiDelete, ApiClientOptions } from '@/lib/apiClient';
import { handleError, handleErrorSilently } from '@/lib/errorHandler';

export interface CartItemBackend {
  productId: string;
  quantity: number;
  size?: string;
  price: number;
  productData?: any;
}

export interface Cart {
  cartId: string;
  userId: string;
  items: CartItemBackend[];
  sessionId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartSummary {
  items: CartItemBackend[];
  totalItems: number;
  subtotal: number;
  estimatedShipping: number;
  estimatedTax: number;
  total: number;
}

class CartService {
  private sessionId: string | null = null;
  private errorOptions: ApiClientOptions = {
    showErrorToast: false, // We'll handle errors manually for better UX
  };

  constructor() {
    // Generate or retrieve session ID for guest carts
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Get or create session ID for guest carts
   */
  private getOrCreateSessionId(): string {
    const key = 'style_shepherd_session_id';
    let sessionId = localStorage.getItem(key);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, sessionId);
    }
    
    return sessionId;
  }

  /**
   * Convert backend cart item to frontend CartItem format
   */
  private backendToFrontendItem(item: CartItemBackend, product?: Product): CartItem {
    // If product data is stored, use it; otherwise use provided product
    const productData = item.productData || product;
    
    if (!productData) {
      throw new Error('Product data is required');
    }

    return {
      product: productData as Product,
      quantity: item.quantity,
      size: item.size,
      selectedSize: item.size,
    };
  }

  /**
   * Convert frontend CartItem to backend format
   */
  private frontendToBackendItem(item: CartItem): CartItemBackend {
    return {
      productId: item.product.id,
      quantity: item.quantity,
      size: item.size || item.selectedSize,
      price: item.product.price,
      productData: item.product, // Store product snapshot
    };
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      const params = new URLSearchParams();
      if (userId === 'guest') {
        params.append('sessionId', this.sessionId!);
      } else {
        params.append('userId', userId);
      }

      const response = await apiGet<Cart>(`/cart?${params.toString()}`, undefined, this.errorOptions);
      const data = response.data;
      
      // Convert backend items to frontend format
      return data.items.map(item => this.backendToFrontendItem(item));
    } catch (error) {
      handleErrorSilently(error);
      // Fallback to empty cart
      return [];
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId: string): Promise<CartSummary> {
    try {
      const params = new URLSearchParams();
      if (userId === 'guest') {
        params.append('sessionId', this.sessionId!);
      } else {
        params.append('userId', userId);
      }

      const response = await apiGet<CartSummary>(`/cart/summary?${params.toString()}`, undefined, this.errorOptions);
      return response.data;
    } catch (error) {
      handleErrorSilently(error);
      return {
        items: [],
        totalItems: 0,
        subtotal: 0,
        estimatedShipping: 0,
        estimatedTax: 0,
        total: 0,
      };
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    try {
      const backendItem = this.frontendToBackendItem(item);

      const response = await apiPost<Cart>(
        '/cart/items',
        {
          userId: userId === 'guest' ? undefined : userId,
          sessionId: userId === 'guest' ? this.sessionId : undefined,
          ...backendItem,
        },
        undefined,
        { ...this.errorOptions, showErrorToast: true }
      );

      const cart = response.data;
      return cart.items.map(item => this.backendToFrontendItem(item));
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to add item to cart. Please try again.',
      });
      throw error;
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    userId: string,
    productId: string,
    size: string,
    quantity: number
  ): Promise<CartItem[]> {
    try {
      const params = new URLSearchParams();
      if (size) {
        params.append('size', size);
      }

      const response = await apiPut<Cart>(
        `/cart/items/${productId}${params.toString() ? `?${params.toString()}` : ''}`,
        {
          userId: userId === 'guest' ? undefined : userId,
          sessionId: userId === 'guest' ? this.sessionId : undefined,
          quantity,
        },
        undefined,
        { ...this.errorOptions, showErrorToast: true }
      );

      const cart = response.data;
      return cart.items.map(item => this.backendToFrontendItem(item));
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to update item quantity. Please try again.',
      });
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string, size?: string): Promise<CartItem[]> {
    try {
      const params = new URLSearchParams();
      if (userId === 'guest') {
        params.append('sessionId', this.sessionId!);
      } else {
        params.append('userId', userId);
      }
      if (size) {
        params.append('size', size);
      }

      const response = await apiDelete<Cart>(
        `/cart/items/${productId}?${params.toString()}`,
        undefined,
        this.errorOptions
      );

      const cart = response.data;
      return cart.items.map(item => this.backendToFrontendItem(item));
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (userId === 'guest') {
        params.append('sessionId', this.sessionId!);
      } else {
        params.append('userId', userId);
      }

      await apiDelete(`/cart?${params.toString()}`, undefined, { ...this.errorOptions, showErrorToast: true });
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Failed to clear cart. Please try again.',
      });
      throw error;
    }
  }

  /**
   * Merge guest cart into user cart (when user logs in)
   */
  async mergeGuestCart(userId: string): Promise<CartItem[]> {
    try {
      const response = await apiPost<Cart>(
        '/cart/merge',
        {
          userId,
          guestSessionId: this.sessionId,
        },
        undefined,
        { ...this.errorOptions, showErrorToast: false } // Silent for merge operations
      );

      const cart = response.data;
      return cart.items.map(item => this.backendToFrontendItem(item));
    } catch (error) {
      handleErrorSilently(error);
      // Return empty cart if merge fails - user can still use their account cart
      return [];
    }
  }

  /**
   * Get session ID (for guest carts)
   */
  getSessionId(): string {
    return this.sessionId!;
  }
}

export const cartService = new CartService();
