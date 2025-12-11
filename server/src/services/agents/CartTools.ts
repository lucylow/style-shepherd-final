/**
 * Cart Tools for Agents
 * MCP-style tools that allow AI agents to manipulate user carts
 * These tools enable agents to add items, update quantities, and initiate checkout
 */

import { cartService, type CartItem } from '../CartService.js';
import { paymentService } from '../PaymentService.js';
import { vultrPostgres } from '../../lib/vultr-postgres.js';
import {
  BusinessLogicError,
  ValidationError,
  ErrorCode,
} from '../../lib/errors.js';

export interface AgentCartAddItemParams {
  userId: string;
  productId: string;
  quantity?: number;
  size?: string;
  price: number;
  productData?: any;
  sessionId?: string;
  requireConfirmation?: boolean; // If true, agent should ask user before adding
}

export interface AgentCartUpdateParams {
  userId: string;
  productId: string;
  quantity?: number;
  size?: string;
  sessionId?: string;
}

export interface AgentCartRemoveParams {
  userId: string;
  productId: string;
  size?: string;
  sessionId?: string;
}

export interface AgentCheckoutParams {
  userId: string;
  shippingInfo?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  sessionId?: string;
  requireConfirmation?: boolean; // If true, agent should ask user before checkout
}

export class CartTools {
  /**
   * Add item to user's cart (agent tool)
   * Returns cart state after addition
   */
  async addItemToCart(params: AgentCartAddItemParams): Promise<{
    success: boolean;
    cart: any;
    message: string;
    requiresConfirmation?: boolean;
  }> {
    try {
      const {
        userId,
        productId,
        quantity = 1,
        size,
        price,
        productData,
        sessionId,
        requireConfirmation = false,
      } = params;

      // Validate inputs
      if (!userId || userId === 'guest') {
        throw new ValidationError('Valid user ID is required', ErrorCode.VALIDATION_ERROR);
      }
      if (!productId) {
        throw new ValidationError('Product ID is required', ErrorCode.VALIDATION_ERROR);
      }
      if (price <= 0) {
        throw new ValidationError('Price must be positive', ErrorCode.VALIDATION_ERROR);
      }

      // If confirmation required, return early
      if (requireConfirmation) {
        return {
          success: false,
          cart: null,
          message: `I'd like to add this item to your cart. Should I proceed?`,
          requiresConfirmation: true,
        };
      }

      // Add to cart
      const cart = await cartService.addToCart(
        userId,
        { productId, quantity, size, price, productData },
        sessionId
      );

      // Track analytics
      await this.trackCartEvent(userId, 'item_added', {
        productId,
        quantity,
        cartValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      });

      return {
        success: true,
        cart: {
          items: cart.items,
          totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
        message: `Added ${quantity}x ${productId} to your cart`,
      };
    } catch (error: any) {
      return {
        success: false,
        cart: null,
        message: `Failed to add item: ${error.message}`,
      };
    }
  }

  /**
   * Update item quantity in cart (agent tool)
   */
  async updateCartItem(params: AgentCartUpdateParams): Promise<{
    success: boolean;
    cart: any;
    message: string;
  }> {
    try {
      const { userId, productId, quantity, size, sessionId } = params;

      if (!userId || userId === 'guest') {
        throw new ValidationError('Valid user ID is required', ErrorCode.VALIDATION_ERROR);
      }

      const cart = await cartService.updateQuantity(userId, productId, size, quantity || 0, sessionId);

      return {
        success: true,
        cart: {
          items: cart.items,
          totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
        message: `Updated cart item quantity`,
      };
    } catch (error: any) {
      return {
        success: false,
        cart: null,
        message: `Failed to update cart: ${error.message}`,
      };
    }
  }

  /**
   * Remove item from cart (agent tool)
   */
  async removeItemFromCart(params: AgentCartRemoveParams): Promise<{
    success: boolean;
    cart: any;
    message: string;
  }> {
    try {
      const { userId, productId, size, sessionId } = params;

      if (!userId || userId === 'guest') {
        throw new ValidationError('Valid user ID is required', ErrorCode.VALIDATION_ERROR);
      }

      const cart = await cartService.removeFromCart(userId, productId, size, sessionId);

      return {
        success: true,
        cart: {
          items: cart.items,
          totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
        message: `Removed item from cart`,
      };
    } catch (error: any) {
      return {
        success: false,
        cart: null,
        message: `Failed to remove item: ${error.message}`,
      };
    }
  }

  /**
   * Get user's cart (agent tool)
   */
  async getCart(userId: string, sessionId?: string): Promise<{
    success: boolean;
    cart: any;
    message: string;
  }> {
    try {
      if (!userId || userId === 'guest') {
        if (!sessionId) {
          return {
            success: true,
            cart: { items: [], totalItems: 0, totalValue: 0 },
            message: 'Cart is empty',
          };
        }
        const guestCart = await cartService.getGuestCart(sessionId);
        if (!guestCart) {
          return {
            success: true,
            cart: { items: [], totalItems: 0, totalValue: 0 },
            message: 'Cart is empty',
          };
        }
        return {
          success: true,
          cart: {
            items: guestCart.items,
            totalItems: guestCart.items.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: guestCart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          },
          message: `Cart has ${guestCart.items.length} item(s)`,
        };
      }

      const cart = await cartService.getCart(userId, sessionId);
      return {
        success: true,
        cart: {
          items: cart.items,
          totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          totalValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
        message: `Cart has ${cart.items.length} item(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        cart: null,
        message: `Failed to get cart: ${error.message}`,
      };
    }
  }

  /**
   * Initiate checkout (agent tool)
   * Creates payment intent and returns checkout URL or client secret
   */
  async initiateCheckout(params: AgentCheckoutParams): Promise<{
    success: boolean;
    checkoutUrl?: string;
    clientSecret?: string;
    paymentIntentId?: string;
    message: string;
    requiresConfirmation?: boolean;
  }> {
    try {
      const { userId, shippingInfo, sessionId, requireConfirmation = true } = params;

      if (!userId || userId === 'guest') {
        throw new ValidationError('User must be logged in to checkout', ErrorCode.VALIDATION_ERROR);
      }

      // Get cart
      const cart = await cartService.getCart(userId, sessionId);
      if (cart.items.length === 0) {
        throw new BusinessLogicError('Cart is empty', ErrorCode.VALIDATION_ERROR);
      }

      // If confirmation required, return early
      if (requireConfirmation) {
        const summary = await cartService.getCartSummary(userId, sessionId);
        return {
          success: false,
          message: `Your cart has ${summary.totalItems} item(s) totaling $${summary.total.toFixed(2)}. Would you like to proceed to checkout?`,
          requiresConfirmation: true,
        };
      }

      // Convert cart items to order format
      const orderItems = cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        size: item.size || 'M',
      }));

      const totalAmount = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent(
        {
          userId,
          items: orderItems,
          totalAmount,
          ...(shippingInfo && { shippingInfo }),
        }
      );

      // Track analytics
      await this.trackCartEvent(userId, 'checkout_initiated', {
        cartValue: totalAmount,
        itemsCount: cart.items.length,
      });

      return {
        success: true,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
        message: `Checkout initiated. Payment intent created.`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to initiate checkout: ${error.message}`,
      };
    }
  }

  /**
   * Add multiple items to cart at once (agent tool)
   * Useful when agent recommends a bundle
   */
  async addItemsToCart(
    userId: string,
    items: Array<{
      productId: string;
      quantity?: number;
      size?: string;
      price: number;
      productData?: any;
    }>,
    sessionId?: string
  ): Promise<{
    success: boolean;
    cart: any;
    message: string;
    added: number;
    failed: number;
  }> {
    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await cartService.addToCart(
          userId,
          {
            productId: item.productId,
            quantity: item.quantity || 1,
            size: item.size,
            price: item.price,
            productData: item.productData,
          },
          sessionId
        );
        added++;
      } catch (error: any) {
        failed++;
        errors.push(`${item.productId}: ${error.message}`);
      }
    }

    const cart = await cartService.getCart(userId, sessionId);

    return {
      success: added > 0,
      cart: {
        items: cart.items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      },
      message: `Added ${added} item(s) to cart${failed > 0 ? `, ${failed} failed` : ''}`,
      added,
      failed,
    };
  }

  /**
   * Track cart analytics events
   */
  private async trackCartEvent(
    userId: string,
    eventType: string,
    metadata: any
  ): Promise<void> {
    try {
      await vultrPostgres.query(
        `INSERT INTO checkout_analytics (user_id, event_type, cart_value, items_count, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          eventType,
          metadata.cartValue || 0,
          metadata.itemsCount || 0,
          JSON.stringify(metadata),
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track cart analytics:', error);
    }
  }
}

export const cartTools = new CartTools();
