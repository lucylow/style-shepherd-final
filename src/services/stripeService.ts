import { CartItem } from '@/types/fashion';
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

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Mock payment storage
const MOCK_PAYMENTS_KEY = 'style_shepherd_payments';
const MOCK_SUBSCRIPTIONS_KEY = 'style_shepherd_subscriptions';

interface MockPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

interface MockSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
  createdAt: string;
}

class StripeService {
  private API_BASE = getApiBaseUrl();
  private useMock = true; // Set to false when backend is available

  /**
   * Generate mock payment intent
   */
  private generateMockPaymentIntent(amount: number): PaymentIntent {
    const id = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      clientSecret: `${id}_secret_${Math.random().toString(36).substring(2, 15)}`,
      paymentIntentId: id,
      returnPrediction: {
        score: Math.random() * 0.3, // Low return risk for demo
        riskLevel: 'low',
        factors: ['Accurate size selection', 'Popular item'],
        suggestions: [],
      },
    };
  }

  /**
   * Get mock payments from storage
   */
  private getMockPayments(): MockPayment[] {
    try {
      const data = localStorage.getItem(MOCK_PAYMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save mock payment
   */
  private saveMockPayment(payment: MockPayment) {
    const payments = this.getMockPayments();
    payments.push(payment);
    localStorage.setItem(MOCK_PAYMENTS_KEY, JSON.stringify(payments));
  }

  /**
   * Get mock subscriptions
   */
  private getMockSubscriptions(): MockSubscription[] {
    try {
      const data = localStorage.getItem(MOCK_SUBSCRIPTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save mock subscription
   */
  private saveMockSubscription(subscription: MockSubscription) {
    const subscriptions = this.getMockSubscriptions();
    const existingIndex = subscriptions.findIndex(s => s.userId === subscription.userId);
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subscription;
    } else {
      subscriptions.push(subscription);
    }
    localStorage.setItem(MOCK_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    items: CartItem[],
    userId: string,
    shippingInfo?: ShippingInfo
  ): Promise<PaymentIntent> {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    if (this.useMock) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const paymentIntent = this.generateMockPaymentIntent(totalAmount);
      
      // Store mock payment
      this.saveMockPayment({
        id: paymentIntent.paymentIntentId,
        userId,
        amount: totalAmount,
        currency: 'usd',
        status: 'pending',
        createdAt: new Date().toISOString(),
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
      });
      
      return paymentIntent;
    }

    // Real API call
    const response = await fetch(`${this.API_BASE}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          size: item.size || 'M',
        })),
        totalAmount,
        shippingInfo,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return response.json();
  }

  /**
   * Confirm payment (mock)
   */
  async confirmPayment(
    paymentIntentId: string,
    items: CartItem[],
    userId: string,
    shippingInfo: ShippingInfo
  ): Promise<{ orderId: string; status: string }> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update mock payment status
      const payments = this.getMockPayments();
      const paymentIndex = payments.findIndex(p => p.id === paymentIntentId);
      if (paymentIndex >= 0) {
        payments[paymentIndex].status = 'succeeded';
        localStorage.setItem(MOCK_PAYMENTS_KEY, JSON.stringify(payments));
      }
      
      return {
        orderId: `order_${Date.now()}`,
        status: 'confirmed',
      };
    }

    const response = await fetch(`${this.API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        order: {
          userId,
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            size: item.size || 'M',
          })),
          shippingInfo,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to confirm payment');
    }

    return response.json();
  }

  /**
   * Create checkout session for subscriptions
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    mode: 'payment' | 'subscription',
    successUrl: string,
    cancelUrl: string,
    customerEmail?: string,
    metadata?: Record<string, string>
  ): Promise<CheckoutSession> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      if (mode === 'subscription') {
        // Create mock subscription
        this.saveMockSubscription({
          id: `sub_${Date.now()}`,
          userId,
          planId: metadata?.planId || priceId,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      
      // For mock, redirect directly to success URL with session ID
      return {
        sessionId,
        url: `${successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId)}`,
      };
    }

    const response = await fetch(`${this.API_BASE}/payments/checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        priceId,
        mode,
        successUrl,
        cancelUrl,
        customerEmail,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    return response.json();
  }

  /**
   * Get user's subscription status
   */
  async getSubscription(userId: string): Promise<MockSubscription | null> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const subscriptions = this.getMockSubscriptions();
      return subscriptions.find(s => s.userId === userId && s.status === 'active') || null;
    }

    const response = await fetch(`${this.API_BASE}/subscriptions/${userId}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const subscriptions = this.getMockSubscriptions();
      const subIndex = subscriptions.findIndex(s => s.id === subscriptionId);
      if (subIndex >= 0) {
        subscriptions[subIndex].status = 'canceled';
        localStorage.setItem(MOCK_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
      }
      return;
    }

    const response = await fetch(`${this.API_BASE}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string): Promise<MockPayment[]> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.getMockPayments().filter(p => p.userId === userId);
    }

    const response = await fetch(`${this.API_BASE}/payments/history/${userId}`);
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    if (this.useMock) {
      await new Promise(resolve => setTimeout(resolve, 200));
      // Return mock payment method
      return [
        {
          id: 'pm_mock_visa',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        },
      ];
    }

    const response = await fetch(`${this.API_BASE}/payments/payment-methods/${userId}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.paymentMethods || [];
  }
}

export const stripeService = new StripeService();

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'style-concierge-monthly',
    name: 'Style Concierge',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly',
    price: 19.99,
    interval: 'month',
    features: [
      'Unlimited voice styling sessions',
      'Premium fit reports',
      'Personalized style recommendations',
      'Priority customer support',
      'Early access to new features',
    ],
    popular: true,
  },
  {
    id: 'style-concierge-yearly',
    name: 'Style Concierge (Yearly)',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_yearly',
    price: 199.99,
    interval: 'year',
    features: [
      'Everything in Monthly',
      'Save 17% with annual billing',
      'Exclusive yearly subscriber perks',
      'Annual style consultation',
    ],
  },
];
