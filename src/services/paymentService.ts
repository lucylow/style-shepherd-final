import { CartItem } from '@/types/fashion';
import { apiPost, apiGet, ApiClientOptions } from '@/lib/apiClient';
import { handleError } from '@/lib/errorHandler';
import { getApiBaseUrl } from '@/lib/api-config';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  returnPrediction?: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    suggestions: string[];
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface ShippingInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

class PaymentService {
  private readonly API_BASE = getApiBaseUrl();
  private readonly errorOptions: ApiClientOptions = {
    retry: {
      maxRetries: 3,
    },
  };

  private async retryApiCall<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
    }
    throw lastError;
  }

  /**
   * Create a payment intent for Stripe
   * Calls the backend API to create a Stripe PaymentIntent
   */
  async createPaymentIntent(
    items: CartItem[],
    userId: string,
    shippingInfo?: ShippingInfo,
    idempotencyKey?: string
  ): Promise<PaymentIntent> {
    // Calculate total amount (including tax and shipping if needed)
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    
    // For now, use subtotal as totalAmount
    // In production, you might want to calculate tax and shipping separately
    const totalAmount = subtotal;

    // Transform CartItem[] to backend format
    const backendItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      size: item.size || 'M', // Default size if not specified
    }));

    try {
      const requestBody: any = {
        userId,
        items: backendItems,
        totalAmount,
      };

      // Include shippingInfo if provided
      if (shippingInfo) {
        requestBody.shippingInfo = {
          name: shippingInfo.name,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zip: shippingInfo.zipCode, // Backend expects 'zip', frontend uses 'zipCode'
          country: shippingInfo.country,
        };
      }

      // Use idempotent endpoint if key provided
      const endpoint = idempotencyKey 
        ? '/payments/intent-idempotent'
        : '/payments/intent';
      
      if (idempotencyKey) {
        requestBody.idempotencyKey = idempotencyKey;
      }

      const response = await apiPost<PaymentIntent>(endpoint, requestBody, undefined, this.errorOptions);
      const data = response.data;
      
      // Return in format expected by frontend
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        returnPrediction: data.returnPrediction,
      };
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  /**
   * Generate idempotency key for payment
   */
  generateIdempotencyKey(userId: string, items: CartItem[]): string {
    const itemsHash = items
      .map(item => `${item.product.id}-${item.quantity}`)
      .sort()
      .join(',');
    return `${userId}-${Date.now()}-${btoa(itemsHash).substring(0, 16)}`;
  }

  /**
   * Create a Stripe checkout session for one-time payments
   * Uses Stripe Checkout Sessions which redirect to Stripe's hosted checkout page
   * This is better for Lovable Cloud as it handles all payment UI on Stripe's side
   */
  async createCheckoutSession(
    items: CartItem[],
    userId: string,
    successUrl: string,
    cancelUrl: string,
    shippingInfo?: ShippingInfo
  ): Promise<CheckoutSession> {
    // Calculate total amount
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // Build line items for checkout session
    const lineItems = items.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      description: item.product.description || undefined,
      price: item.product.price,
      quantity: item.quantity,
      images: item.product.images && item.product.images.length > 0 
        ? item.product.images.map((img: any) => typeof img === 'string' ? img : (img?.url || ''))
        : undefined,
    }));

    try {
      const response = await apiPost<CheckoutSession>(
        '/payments/checkout-session',
        {
          userId,
          mode: 'payment',
          lineItems,
          amount: totalAmount, // Fallback if line items fail
          currency: 'usd',
          successUrl,
          cancelUrl,
          shippingInfo: shippingInfo ? {
            name: shippingInfo.name,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zip: shippingInfo.zipCode,
            country: shippingInfo.country,
          } : undefined,
          metadata: {
            cartItemCount: items.length.toString(),
            totalAmount: totalAmount.toString(),
          },
        },
        undefined,
        this.errorOptions
      );

      const data = response.data;
      return {
        sessionId: data.sessionId,
        url: data.url,
      };
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  /**
   * Confirm payment and create order
   * This should be called after payment is confirmed on the frontend
   */
  async confirmPayment(
    paymentIntentId: string,
    items: CartItem[],
    userId: string,
    shippingInfo: ShippingInfo
  ): Promise<{ orderId: string; status: string }> {
    return this.retryApiCall(async () => {
      const totalAmount = items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      const backendItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        size: item.size || 'M',
      }));

      const response = await fetch(`${this.API_BASE}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          order: {
            userId,
            items: backendItems,
            totalAmount,
            shippingInfo: {
              name: shippingInfo.name,
              address: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              zip: shippingInfo.zipCode,
              country: shippingInfo.country,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to confirm payment: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    });
  }

  /**
   * Get saved payment methods for a user
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const response = await apiGet<{ paymentMethods: PaymentMethod[] }>(
        `/payments/payment-methods/${userId}`,
        undefined,
        this.errorOptions
      );

      return response.data.paymentMethods || [];
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  /**
   * Attach payment method to user
   */
  async attachPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentMethod> {
    return this.retryApiCall(async () => {
      const response = await fetch(`${this.API_BASE}/payments/payment-methods/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to attach payment method: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data.paymentMethod;
    });
  }

  /**
   * Detach payment method from user
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await apiPost(
        '/payments/payment-methods/detach',
        {
          paymentMethodId,
        },
        undefined,
        this.errorOptions
      );
    } catch (error) {
      handleError(error);
      throw error;
    }
  }

  /**
   * Set default payment method for user
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      await apiPost(
        '/payments/payment-methods/set-default',
        {
          userId,
          paymentMethodId,
        },
        undefined,
        this.errorOptions
      );
    } catch (error) {
      handleError(error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

