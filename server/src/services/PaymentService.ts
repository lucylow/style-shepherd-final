/**
 * Stripe Payment Service
 * Handles payments, subscriptions, checkout sessions, and returns prediction
 */

import Stripe from 'stripe';
import env from '../config/env.js';
import { orderSQL } from '../lib/raindrop-config.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import { productRecommendationAPI } from './ProductRecommendationAPI.js';
import {
  PaymentError,
  BusinessLogicError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  ErrorCode,
} from '../lib/errors.js';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size: string;
}

export interface Order {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  incidentId?: string; // Optional fraud incident ID
}

export interface ReturnPrediction {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  suggestions: string[];
}

interface CustomerCache {
  customerId: string;
  timestamp: number;
}

export class PaymentService {
  private stripe: Stripe | null = null;
  private customerCache: Map<string, CustomerCache> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly useMockMode: boolean;
  private mockOrders: Map<string, any> = new Map();
  private mockCheckoutSessions: Map<string, any> = new Map();
  private mockCustomers: Map<string, string> = new Map(); // userId -> customerId

  constructor() {
    // Check if we should use mock mode
    const stripeKey = env.STRIPE_SECRET_KEY;
    this.useMockMode = !stripeKey || stripeKey === 'sk_test_demo' || stripeKey.startsWith('sk_test_mock');
    
    if (this.useMockMode) {
      console.log('🎭 PaymentService: Running in MOCK MODE - Stripe API calls will be simulated');
    } else {
      try {
        if (!stripeKey) {
          throw new Error('Stripe secret key is required');
        }
        this.stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16',
          maxNetworkRetries: 2,
          timeout: 30000,
        });
        console.log('✅ PaymentService: Stripe initialized with API key');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Stripe, falling back to mock mode:', error);
        this.useMockMode = true;
      }
    }
  }

  /**
   * Check if running in mock mode
   */
  private isMockMode(): boolean {
    return this.useMockMode || !this.stripe;
  }

  /**
   * Generate mock customer ID
   */
  private generateMockCustomerId(): string {
    return `cus_mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Generate mock session ID
   */
  private generateMockSessionId(): string {
    return `cs_mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Generate mock payment intent ID
   */
  private generateMockPaymentIntentId(): string {
    return `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Simulate network delay for realistic mock behavior
   */
  private async simulateDelay(ms: number = 300): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry wrapper for Stripe API calls
   */
  private async retryStripeCall<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    if (this.isMockMode()) {
      // In mock mode, simulate a delay and return mock data
      await this.simulateDelay();
      throw new Error('Mock mode - use mock methods instead');
    }

    let lastError: any;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < retries - 1) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt);
          console.warn(`Retrying ${operationName} (attempt ${attempt + 1}/${retries}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Log payment operation for metrics
   */
  private logPaymentOperation(
    operation: string,
    metadata: Record<string, any>,
    success: boolean = true
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      operation,
      success,
      ...metadata,
    };
    
    if (success) {
      console.log(`[Payment] ${operation}:`, JSON.stringify(logData));
    } else {
      console.error(`[Payment] ${operation} failed:`, JSON.stringify(logData));
    }
  }

  /**
   * Create a payment intent
   * Works in both real Stripe mode and mock mode
   */
  async createPaymentIntent(order: Order, idempotencyKey?: string): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    returnPrediction: ReturnPrediction;
  }> {
    // Validate order
    if (!order.userId) {
      throw new BusinessLogicError('User ID is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!order.items || order.items.length === 0) {
      throw new BusinessLogicError('Order must contain at least one item', ErrorCode.VALIDATION_ERROR);
    }
    if (order.totalAmount <= 0) {
      throw new BusinessLogicError('Order total must be greater than zero', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Calculate return risk before payment
      const returnPrediction = await this.createReturnPrediction(order);

      // Get or create customer
      const customerId = await this.getOrCreateCustomer(order.userId);

      // Mock mode implementation
      if (this.isMockMode()) {
        await this.simulateDelay(400);
        
        const paymentIntentId = this.generateMockPaymentIntentId();
        const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
        
        this.logPaymentOperation('createPaymentIntent', {
          paymentIntentId,
          userId: order.userId,
          amount: order.totalAmount,
          returnRiskScore: returnPrediction.score,
          mockMode: true,
        });

        return {
          clientSecret,
          paymentIntentId,
          returnPrediction,
        };
      }

      // Real Stripe implementation
      // Create Stripe payment intent with retry logic
      const paymentIntent = await this.retryStripeCall(
        () => {
          const params: Stripe.PaymentIntentCreateParams = {
            amount: Math.round(order.totalAmount * 100), // Convert to cents
            currency: 'usd',
            customer: customerId,
            automatic_payment_methods: { enabled: true },
            metadata: {
              userId: order.userId,
              orderId: `order_${Date.now()}`,
              returnRiskScore: returnPrediction.score.toString(),
              integration: 'style-shepherd',
              ...(order.incidentId && { incidentId: order.incidentId }),
            },
          };

          const options: Stripe.RequestOptions = {};
          if (idempotencyKey) {
            options.idempotencyKey = idempotencyKey;
          }

          return this.stripe!.paymentIntents.create(params, options);
        },
        'createPaymentIntent'
      );

      if (!paymentIntent.client_secret) {
        throw new PaymentError('Failed to create payment intent - no client secret returned');
      }

      this.logPaymentOperation('createPaymentIntent', {
        paymentIntentId: paymentIntent.id,
        userId: order.userId,
        amount: order.totalAmount,
        returnRiskScore: returnPrediction.score,
        mockMode: false,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        returnPrediction,
      };
    } catch (error: any) {
      this.logPaymentOperation('createPaymentIntent', {
        userId: order.userId,
        amount: order.totalAmount,
        error: error.message,
      }, false);

      if (error instanceof PaymentError || error instanceof BusinessLogicError) {
        throw error;
      }
      
      // Stripe API errors
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError(
          `Payment service error: ${error.message || 'Unknown error'}`,
          error,
          { code: error.code, type: error.type }
        );
      }
      
      throw new ExternalServiceError('Stripe', 'Failed to create payment intent', error);
    }
  }

  /**
   * Create return prediction using Vultr ML service
   */
  async createReturnPrediction(order: Order): Promise<ReturnPrediction> {
    try {
      // Get user return history
      const returnHistory = await vultrPostgres.query(
        'SELECT * FROM returns WHERE user_id = $1',
        [order.userId]
      );

      // Get user profile for preferences
      const userProfile = await vultrPostgres.query(
        'SELECT preferences, body_measurements FROM user_profiles WHERE user_id = $1',
        [order.userId]
      );

      // Use Vultr ML service for prediction
      const prediction = await productRecommendationAPI.getRecommendations(
        userProfile[0]?.preferences || {},
        { budget: order.totalAmount }
      );

      // Calculate aggregate return risk
      const avgReturnRisk = prediction.reduce((sum, p) => sum + p.returnRisk, 0) / prediction.length;
      const userReturnRate = returnHistory.length / Math.max(1, returnHistory.length + 5);

      const riskScore = (avgReturnRisk * 0.6) + (userReturnRate * 0.4);
      const riskLevel = riskScore < 0.3 ? 'low' : riskScore < 0.6 ? 'medium' : 'high';

      // Store prediction in database
      await orderSQL.insert('return_predictions', {
        order_id: `order_${Date.now()}`,
        user_id: order.userId,
        prediction_score: riskScore,
        risk_factors: JSON.stringify([
          riskScore > 0.5 ? 'Size mismatch risk' : null,
          riskScore > 0.4 ? 'Color preference mismatch' : null,
          userReturnRate > 0.3 ? 'Higher than average return history' : null,
        ].filter(Boolean)),
        created_at: new Date().toISOString(),
      });

      return {
        score: riskScore,
        riskLevel,
        factors: [
          riskScore > 0.5 ? 'Size compatibility concerns' : 'Good size match',
          riskScore > 0.4 ? 'Style preference variance' : 'Style alignment',
          userReturnRate > 0.3 ? 'Historical return patterns' : 'Low return history',
        ],
        suggestions: this.getMitigationStrategies(riskLevel, riskScore),
      };
    } catch (error) {
      console.error('Return prediction error:', error);
      // Return default prediction
      return {
        score: 0.25,
        riskLevel: 'low',
        factors: ['Standard risk assessment'],
        suggestions: ['Review size chart', 'Check product reviews'],
      };
    }
  }

  /**
   * Get mitigation strategies based on risk level
   */
  private getMitigationStrategies(
    riskLevel: string,
    riskScore: number
  ): string[] {
    const strategies: string[] = [];

    if (riskLevel === 'high') {
      strategies.push('Consider trying our virtual fitting room');
      strategies.push('Review detailed size chart and measurements');
      strategies.push('Check customer reviews for sizing feedback');
    } else if (riskLevel === 'medium') {
      strategies.push('Review size recommendations based on your profile');
      strategies.push('Check product measurements');
    } else {
      strategies.push('This order has good compatibility with your profile');
    }

    return strategies;
  }

  /**
   * Confirm payment and create order
   * Works in both real Stripe mode and mock mode
   */
  async confirmPayment(
    paymentIntentId: string,
    order: Order
  ): Promise<{ orderId: string; status: string }> {
    if (!paymentIntentId) {
      throw new BusinessLogicError('Payment intent ID is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!order.userId) {
      throw new BusinessLogicError('User ID is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Mock mode implementation
      if (this.isMockMode()) {
        await this.simulateDelay(300);
        
        // In mock mode, assume payment is successful
        // Create order in database
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          await vultrPostgres.transaction(async (client) => {
            // Check inventory before creating order (skip in mock mode if DB unavailable)
            try {
              for (const item of order.items) {
                const productResult = await client.query<{ stock: number }>(
                  'SELECT stock FROM catalog WHERE id = $1',
                  [item.productId]
                );
                
                if (productResult.rows.length > 0) {
                  const stock = productResult.rows[0].stock;
                  if (stock < item.quantity) {
                    throw new BusinessLogicError(
                      `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
                      ErrorCode.INSUFFICIENT_STOCK
                    );
                  }
                }
              }
            } catch (inventoryError) {
              // In mock mode, continue even if inventory check fails
              console.warn('Inventory check skipped in mock mode:', inventoryError);
            }

            // Insert order
            await client.query(
              `INSERT INTO orders (order_id, user_id, items, total_amount, status, payment_intent_id, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                orderId,
                order.userId,
                JSON.stringify(order.items),
                order.totalAmount,
                'confirmed',
                paymentIntentId,
                new Date().toISOString(),
              ]
            );

            // Update inventory (skip in mock mode if DB unavailable)
            try {
              for (const item of order.items) {
                await client.query(
                  'UPDATE catalog SET stock = stock - $1 WHERE id = $2',
                  [item.quantity, item.productId]
                );
              }
            } catch (inventoryError) {
              console.warn('Inventory update skipped in mock mode:', inventoryError);
            }
          });
        } catch (dbError) {
          // In mock mode, continue even if DB fails
          console.warn('Database operation failed in mock mode, continuing:', dbError);
        }

        // Store in Raindrop SmartSQL (non-critical)
        try {
          await orderSQL.insert('orders', {
            id: orderId,
            user_id: order.userId,
            items: JSON.stringify(order.items),
            total: order.totalAmount,
            status: 'confirmed',
            created_at: new Date().toISOString(),
          });
        } catch (raindropError) {
          console.warn('Failed to store order in Raindrop, continuing:', raindropError);
        }

        this.logPaymentOperation('confirmPayment', {
          paymentIntentId,
          orderId,
          userId: order.userId,
          mockMode: true,
        });

        return { orderId, status: 'confirmed' };
      }

      // Real Stripe implementation
      // Verify payment intent
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new PaymentError(
          `Payment not succeeded: ${paymentIntent.status}`,
          undefined,
          { status: paymentIntent.status, paymentIntentId }
        );
      }

      // Create order in database
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await vultrPostgres.transaction(async (client) => {
        // Check inventory before creating order
        for (const item of order.items) {
          const productResult = await client.query<{ stock: number }>(
            'SELECT stock FROM catalog WHERE id = $1',
            [item.productId]
          );
          
          if (productResult.rows.length === 0) {
            throw new BusinessLogicError(
              `Product ${item.productId} not found`,
              ErrorCode.PRODUCT_NOT_FOUND
            );
          }
          
          const stock = productResult.rows[0].stock;
          if (stock < item.quantity) {
            throw new BusinessLogicError(
              `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
              ErrorCode.INSUFFICIENT_STOCK
            );
          }
        }

        // Insert order
        await client.query(
          `INSERT INTO orders (order_id, user_id, items, total_amount, status, payment_intent_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            orderId,
            order.userId,
            JSON.stringify(order.items),
            order.totalAmount,
            'confirmed',
            paymentIntentId,
            new Date().toISOString(),
          ]
        );

        // Update inventory
        for (const item of order.items) {
          await client.query(
            'UPDATE catalog SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.productId]
          );
        }
      });

      // Store in Raindrop SmartSQL (non-critical)
      try {
        await orderSQL.insert('orders', {
          id: orderId,
          user_id: order.userId,
          items: JSON.stringify(order.items),
          total: order.totalAmount,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        });
      } catch (raindropError) {
        console.warn('Failed to store order in Raindrop, continuing:', raindropError);
      }

      this.logPaymentOperation('confirmPayment', {
        paymentIntentId,
        orderId,
        userId: order.userId,
        mockMode: false,
      });

      return { orderId, status: 'confirmed' };
    } catch (error: any) {
      if (
        error instanceof PaymentError ||
        error instanceof BusinessLogicError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }
      
      // Stripe API errors
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError(
          `Payment verification failed: ${error.message || 'Unknown error'}`,
          error,
          { code: error.code, type: error.type }
        );
      }
      
      throw new ExternalServiceError('Stripe', 'Failed to confirm payment', error);
    }
  }

  /**
   * Create or retrieve Stripe customer with caching
   * Works in both real Stripe mode and mock mode
   */
  async getOrCreateCustomer(userId: string, email?: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.customerCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.customerId;
      }

      // Mock mode implementation
      if (this.isMockMode()) {
        await this.simulateDelay(100);
        
        // Check mock customers map
        if (this.mockCustomers.has(userId)) {
          const customerId = this.mockCustomers.get(userId)!;
          this.customerCache.set(userId, {
            customerId,
            timestamp: Date.now(),
          });
          return customerId;
        }
        
        // Create new mock customer
        const customerId = this.generateMockCustomerId();
        this.mockCustomers.set(userId, customerId);
        
        // Try to store in database (non-blocking)
        try {
          await vultrPostgres.query(
            `INSERT INTO users (user_id, stripe_customer_id, email, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2, email = $3`,
            [userId, customerId, email || null, new Date().toISOString()]
          );
        } catch (dbError) {
          console.warn('Failed to store mock customer in database (non-critical):', dbError);
        }
        
        // Update cache
        this.customerCache.set(userId, {
          customerId,
          timestamp: Date.now(),
        });

        this.logPaymentOperation('createCustomer', {
          userId,
          customerId,
          email: email || 'none',
          mockMode: true,
        });

        return customerId;
      }

      // Real Stripe implementation
      // Check if customer exists in database
      const existing = await vultrPostgres.query(
        'SELECT stripe_customer_id, email FROM users WHERE user_id = $1',
        [userId]
      );

      if (existing.length > 0 && existing[0].stripe_customer_id) {
        const customerId = existing[0].stripe_customer_id;
        
        // Update cache
        this.customerCache.set(userId, {
          customerId,
          timestamp: Date.now(),
        });

        // Update email if provided and different
        if (email && existing[0].email !== email) {
          try {
            await this.stripe!.customers.update(customerId, { email });
            await vultrPostgres.query(
              'UPDATE users SET email = $1 WHERE user_id = $2',
              [email, userId]
            );
          } catch (updateError) {
            console.warn('Failed to update customer email:', updateError);
          }
        }

        return customerId;
      }

      // Create new Stripe customer with retry
      const customer = await this.retryStripeCall(
        () => this.stripe!.customers.create({
          email,
          metadata: {
            userId,
            integration: 'style-shepherd',
          },
        }),
        'createCustomer'
      );

      // Store in database
      await vultrPostgres.query(
        `INSERT INTO users (user_id, stripe_customer_id, email, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2, email = $3`,
        [userId, customer.id, email || null, new Date().toISOString()]
      );

      // Update cache
      this.customerCache.set(userId, {
        customerId: customer.id,
        timestamp: Date.now(),
      });

      this.logPaymentOperation('createCustomer', {
        userId,
        customerId: customer.id,
        email: email || 'none',
        mockMode: false,
      });

      return customer.id;
    } catch (error: any) {
      this.logPaymentOperation('createCustomer', {
        userId,
        email: email || 'none',
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to create customer', error);
    }
  }

  /**
   * Create checkout session for one-time payments or subscriptions
   * Supports both simple amount-based payments and detailed line items for cart products
   * Works in both real Stripe mode and mock mode
   */
  async createCheckoutSession(params: {
    userId: string;
    mode: 'payment' | 'subscription' | 'setup';
    priceId?: string;
    amount?: number;
    currency?: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
    lineItems?: Array<{
      productId: string;
      name: string;
      description?: string;
      price: number;
      quantity: number;
      images?: string[];
    }>;
    shippingInfo?: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  }): Promise<{ url: string; sessionId: string }> {
    try {
      // Validate required parameters
      if (!params.userId) {
        throw new BusinessLogicError('User ID is required', ErrorCode.VALIDATION_ERROR);
      }
      if (!params.successUrl || !params.cancelUrl) {
        throw new BusinessLogicError('Success and cancel URLs are required', ErrorCode.VALIDATION_ERROR);
      }
      if (params.mode === 'subscription' && !params.priceId && !params.amount) {
        throw new BusinessLogicError('Price ID or amount is required for subscription', ErrorCode.VALIDATION_ERROR);
      }
      if (params.mode === 'payment' && !params.lineItems && !params.amount) {
        throw new BusinessLogicError('Either lineItems or amount must be provided for payment', ErrorCode.VALIDATION_ERROR);
      }

      // Calculate total amount
      let totalAmount = 0;
      if (params.lineItems && params.lineItems.length > 0) {
        totalAmount = params.lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      } else if (params.amount) {
        totalAmount = params.amount;
      }

      // Mock mode implementation
      if (this.isMockMode()) {
        await this.simulateDelay(500);
        
        const sessionId = this.generateMockSessionId();
        const customerId = await this.getOrCreateCustomer(params.userId, params.customerEmail);
        const paymentIntentId = this.generateMockPaymentIntentId();
        
        // Store mock checkout session
        const mockSession = {
          id: sessionId,
          userId: params.userId,
          customerId,
          mode: params.mode,
          paymentIntentId,
          lineItems: params.lineItems || [],
          amount: totalAmount,
          currency: params.currency || 'usd',
          shippingInfo: params.shippingInfo,
          metadata: params.metadata || {},
          status: 'open',
          paymentStatus: 'unpaid',
          createdAt: new Date().toISOString(),
        };
        
        this.mockCheckoutSessions.set(sessionId, mockSession);
        
        // Create mock order if payment mode
        if (params.mode === 'payment') {
          const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const mockOrder = {
            orderId,
            userId: params.userId,
            items: params.lineItems?.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              name: item.name,
            })) || [],
            totalAmount,
            shippingInfo: params.shippingInfo,
            status: 'pending',
            paymentIntentId,
            checkoutSessionId: sessionId,
            createdAt: new Date().toISOString(),
          };
          
          this.mockOrders.set(orderId, mockOrder);
          mockSession.metadata = {
            ...mockSession.metadata,
            orderId,
          };
        }
        
        // Build checkout URL - in mock mode, redirect to success URL immediately
        // Replace {CHECKOUT_SESSION_ID} placeholder
        const checkoutUrl = params.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);
        
        this.logPaymentOperation('createCheckoutSession', {
          sessionId,
          userId: params.userId,
          mode: params.mode,
          lineItemsCount: params.lineItems?.length || 1,
          amount: totalAmount,
          mockMode: true,
        });

        return {
          url: checkoutUrl,
          sessionId,
        };
      }

      // Real Stripe implementation
      const customerId = await this.getOrCreateCustomer(params.userId, params.customerEmail);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: params.mode,
        customer: customerId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        payment_method_types: ['card'],
        metadata: {
          userId: params.userId,
          integration: 'style-shepherd',
          ...params.metadata,
        },
        // Enable automatic tax calculation if available
        automatic_tax: {
          enabled: true,
        },
        // Collect shipping address if provided
        shipping_address_collection: params.shippingInfo ? undefined : {
          allowed_countries: ['US', 'CA', 'GB', 'AU'],
        },
      };

      // Add shipping details if provided
      if (params.shippingInfo) {
        sessionParams.shipping_options = [{
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1000, // $10.00 in cents
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
          },
        }];
      }

      // Handle line items - prefer detailed line items over simple amount
      if (params.lineItems && params.lineItems.length > 0) {
        // Use detailed line items for cart products
        sessionParams.line_items = params.lineItems.map(item => ({
          price_data: {
            currency: params.currency || 'usd',
            product_data: {
              name: item.name,
              description: item.description,
              images: item.images,
              metadata: {
                productId: item.productId,
              },
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        }));
      } else if (params.mode === 'subscription' && params.priceId) {
        // Subscription with price ID
        sessionParams.line_items = [{ price: params.priceId, quantity: 1 }];
      } else if (params.mode === 'payment' && params.amount) {
        // Simple one-time payment with amount
        sessionParams.line_items = [{
          price_data: {
            currency: params.currency || 'usd',
            product_data: {
              name: 'Style Shepherd Purchase',
            },
            unit_amount: Math.round(params.amount * 100), // Convert to cents
          },
          quantity: 1,
        }];
      } else {
        throw new BusinessLogicError(
          'Either lineItems, priceId (for subscriptions), or amount (for payments) must be provided',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const session = await this.retryStripeCall(
        () => this.stripe!.checkout.sessions.create(sessionParams),
        'createCheckoutSession'
      );

      if (!session.url) {
        throw new PaymentError('Failed to create checkout session - no URL returned');
      }

      this.logPaymentOperation('createCheckoutSession', {
        sessionId: session.id,
        userId: params.userId,
        mode: params.mode,
        lineItemsCount: params.lineItems?.length || 1,
        mockMode: false,
      });

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error: any) {
      this.logPaymentOperation('createCheckoutSession', {
        userId: params.userId,
        mode: params.mode,
        error: error.message,
      }, false);

      if (error instanceof PaymentError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new ExternalServiceError('Stripe', 'Failed to create checkout session', error);
    }
  }

  /**
   * Create subscription for user
   */
  async createSubscription(
    userId: string,
    priceId: string,
    customerEmail?: string
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    if (this.isMockMode()) {
      throw new BusinessLogicError('Subscriptions not supported in mock mode', ErrorCode.VALIDATION_ERROR);
    }
    
    try {
      const customerId = await this.getOrCreateCustomer(userId, customerEmail);

      const subscription = await this.stripe!.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          userId,
          integration: 'style-shepherd',
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret || undefined,
      };
    } catch (error: any) {
      throw new ExternalServiceError('Stripe', 'Failed to create subscription', error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void> {
    if (this.isMockMode()) {
      throw new BusinessLogicError('Subscriptions not supported in mock mode', ErrorCode.VALIDATION_ERROR);
    }
    
    try {
      if (immediately) {
        await this.stripe!.subscriptions.cancel(subscriptionId);
      } else {
        await this.stripe!.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error: any) {
      throw new ExternalServiceError('Stripe', 'Failed to cancel subscription', error);
    }
  }

  /**
   * Create invoice for performance-based billing (prevented returns commission)
   */
  async createPerformanceInvoice(params: {
    retailerCustomerId: string;
    orderId: string;
    preventedValue: number;
    commissionRate: number;
    description?: string;
  }): Promise<{ invoiceId: string }> {
    try {
      const commissionAmount = Math.round(params.preventedValue * params.commissionRate * 100);

      // Create invoice item
      await this.stripe.invoiceItems.create({
        customer: params.retailerCustomerId,
        amount: commissionAmount,
        currency: 'usd',
        description: params.description || `Prevented returns commission — order ${params.orderId}`,
        metadata: {
          orderId: params.orderId,
          preventedValue: params.preventedValue.toString(),
          commissionRate: params.commissionRate.toString(),
          integration: 'style-shepherd',
        },
      });

      // Create and finalize invoice
      const invoice = await this.stripe!.invoices.create({
        customer: params.retailerCustomerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          orderId: params.orderId,
          type: 'performance_billing',
          integration: 'style-shepherd',
        },
      });

      const finalizedInvoice = await this.stripe!.invoices.finalizeInvoice(invoice.id);

      // Store in database
      try {
        await vultrPostgres.query(
          `INSERT INTO invoices (invoice_id, retailer_id, stripe_invoice_id, amount_cents, status, order_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `inv_${Date.now()}`,
            params.retailerCustomerId,
            finalizedInvoice.id,
            commissionAmount,
            finalizedInvoice.status,
            params.orderId,
            new Date().toISOString(),
          ]
        );
      } catch (dbError) {
        console.warn('Failed to store invoice in database:', dbError);
      }

      return { invoiceId: finalizedInvoice.id };
    } catch (error: any) {
      throw new ExternalServiceError('Stripe', 'Failed to create performance invoice', error);
    }
  }

  /**
   * Create payment intent with idempotency key
   */
  async createPaymentIntentWithIdempotency(
    order: Order,
    idempotencyKey: string
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    returnPrediction: ReturnPrediction;
  }> {
    return this.createPaymentIntent(order, idempotencyKey);
  }

  /**
   * Get saved payment methods for a customer
   */
  async getPaymentMethods(userId: string): Promise<Stripe.PaymentMethod[]> {
    if (this.isMockMode()) {
      return [];
    }
    
    try {
      const customerId = await this.getOrCreateCustomer(userId);
      
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      this.logPaymentOperation('getPaymentMethods', {
        userId,
        count: paymentMethods.data.length,
      });

      return paymentMethods.data;
    } catch (error: any) {
      this.logPaymentOperation('getPaymentMethods', {
        userId,
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to retrieve payment methods', error);
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const customerId = await this.getOrCreateCustomer(userId);
      
      const paymentMethod = await this.stripe!.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default if no default exists
      const customer = await this.stripe!.customers.retrieve(customerId);
      if (!customer.deleted && !customer.invoice_settings?.default_payment_method) {
        await this.stripe!.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      this.logPaymentOperation('attachPaymentMethod', {
        userId,
        paymentMethodId,
      });

      return paymentMethod;
    } catch (error: any) {
      this.logPaymentOperation('attachPaymentMethod', {
        userId,
        paymentMethodId,
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to attach payment method', error);
    }
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    if (this.isMockMode()) {
      throw new BusinessLogicError('Payment methods not supported in mock mode', ErrorCode.VALIDATION_ERROR);
    }
    
    try {
      await this.stripe!.paymentMethods.detach(paymentMethodId);
      
      this.logPaymentOperation('detachPaymentMethod', {
        paymentMethodId,
      });
    } catch (error: any) {
      this.logPaymentOperation('detachPaymentMethod', {
        paymentMethodId,
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to detach payment method', error);
    }
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    if (this.isMockMode()) {
      throw new BusinessLogicError('Payment methods not supported in mock mode', ErrorCode.VALIDATION_ERROR);
    }
    
    try {
      const customerId = await this.getOrCreateCustomer(userId);
      
      await this.stripe!.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      this.logPaymentOperation('setDefaultPaymentMethod', {
        userId,
        paymentMethodId,
      });
    } catch (error: any) {
      this.logPaymentOperation('setDefaultPaymentMethod', {
        userId,
        paymentMethodId,
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to set default payment method', error);
    }
  }

  /**
   * Process refund with better error handling
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
    metadata?: Record<string, string>
  ): Promise<{ refundId: string; amount: number; status: string }> {
    try {
      // Verify payment intent exists and is refundable
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new PaymentError(
          `Payment intent ${paymentIntentId} is not in a refundable state: ${paymentIntent.status}`,
          undefined,
          { paymentIntentId, status: paymentIntent.status }
        );
      }

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason,
        metadata: metadata || {},
      };

      if (amount) {
        const amountCents = Math.round(amount * 100);
        if (amountCents > paymentIntent.amount) {
          throw new BusinessLogicError(
            'Refund amount cannot exceed payment amount',
            ErrorCode.VALIDATION_ERROR,
            { requestedAmount: amount, paymentAmount: paymentIntent.amount / 100 }
          );
        }
        refundParams.amount = amountCents;
      }

      const refund = await this.retryStripeCall(
        () => this.stripe!.refunds.create(refundParams),
        'createRefund'
      );

      // Update order status in database
      try {
        const userId = paymentIntent.metadata?.userId;
        const orderId = paymentIntent.metadata?.orderId;
        
        if (userId && orderId) {
          await vultrPostgres.query(
            `UPDATE orders 
             SET status = 'refunded', 
                 refund_id = $1,
                 refund_amount = $2,
                 updated_at = $3
             WHERE order_id = $4 AND user_id = $5`,
            [
              refund.id,
              refund.amount / 100,
              new Date().toISOString(),
              orderId,
              userId,
            ]
          );
        }
      } catch (dbError) {
        console.warn('Failed to update order status for refund:', dbError);
      }

      this.logPaymentOperation('createRefund', {
        paymentIntentId,
        refundId: refund.id,
        amount: refund.amount / 100,
        reason: reason || 'none',
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status || 'pending',
      };
    } catch (error: any) {
      this.logPaymentOperation('createRefund', {
        paymentIntentId,
        amount: amount || 'full',
        error: error.message,
      }, false);

      if (error instanceof PaymentError || error instanceof BusinessLogicError) {
        throw error;
      }
      throw new ExternalServiceError('Stripe', 'Failed to create refund', error);
    }
  }

  /**
   * Get mock checkout session details (for testing/debugging)
   */
  getMockCheckoutSession(sessionId: string): any | null {
    if (!this.isMockMode()) {
      return null;
    }
    return this.mockCheckoutSessions.get(sessionId) || null;
  }

  /**
   * Get mock order by session ID (for testing/debugging)
   */
  getMockOrderBySessionId(sessionId: string): any | null {
    if (!this.isMockMode()) {
      return null;
    }
    const session = this.mockCheckoutSessions.get(sessionId);
    if (!session || !session.metadata?.orderId) {
      return null;
    }
    return this.mockOrders.get(session.metadata.orderId) || null;
  }

  /**
   * Simulate successful payment completion for mock checkout session
   * This can be called manually for testing or automatically after redirect
   */
  async simulateMockPaymentCompletion(sessionId: string): Promise<{ success: boolean; orderId?: string }> {
    if (!this.isMockMode()) {
      throw new BusinessLogicError('This method only works in mock mode', ErrorCode.VALIDATION_ERROR);
    }

    const session = this.mockCheckoutSessions.get(sessionId);
    if (!session) {
      throw new NotFoundError(`Checkout session ${sessionId} not found`);
    }

    if (session.paymentStatus === 'paid') {
      return { success: true, orderId: session.metadata?.orderId };
    }

    // Update session status
    session.paymentStatus = 'paid';
    session.status = 'complete';
    session.completedAt = new Date().toISOString();
    this.mockCheckoutSessions.set(sessionId, session);

    // Update order status if exists
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = this.mockOrders.get(orderId);
      if (order) {
        order.status = 'paid';
        order.paymentIntentId = session.paymentIntentId;
        order.paidAt = new Date().toISOString();
        this.mockOrders.set(orderId, order);

        // Try to store in database (non-blocking)
        try {
          await vultrPostgres.query(
            `INSERT INTO orders (order_id, user_id, items, total_amount, status, payment_intent_id, checkout_session_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (order_id) DO UPDATE SET status = $5, payment_intent_id = $6, updated_at = $8`,
            [
              orderId,
              session.userId,
              JSON.stringify(order.items),
              order.totalAmount,
              'paid',
              session.paymentIntentId,
              sessionId,
              new Date().toISOString(),
            ]
          );
        } catch (dbError) {
          console.warn('Failed to store mock order in database (non-critical):', dbError);
        }
      }
    }

    this.logPaymentOperation('simulateMockPaymentCompletion', {
      sessionId,
      orderId,
      mockMode: true,
    });

    return { success: true, orderId };
  }

  /**
   * Get revenue analytics for a time period
   */
  async getRevenueAnalytics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    oneTimeRevenue: number;
    refunds: number;
    netRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    revenueByDay: Array<{ date: string; revenue: number }>;
    topProducts: Array<{ productId: string; revenue: number; quantity: number }>;
  }> {
    try {
      const userIdFilter = userId ? 'AND user_id = $3' : '';
      const params = userId 
        ? [startDate.toISOString(), endDate.toISOString(), userId]
        : [startDate.toISOString(), endDate.toISOString()];

      // Get all orders in period
      const orders = await vultrPostgres.query<{
        order_id: string;
        user_id: string;
        total_amount: number;
        status: string;
        created_at: string;
        items: string;
      }>(
        `SELECT order_id, user_id, total_amount, status, created_at, items 
         FROM orders 
         WHERE created_at BETWEEN $1 AND $2 ${userIdFilter}
         ORDER BY created_at ASC`,
        params
      );

      // Get subscriptions
      const subscriptions = await vultrPostgres.query<{
        stripe_subscription_id: string;
        status: string;
        created_at: string;
      }>(
        `SELECT stripe_subscription_id, status, created_at
         FROM subscriptions 
         WHERE created_at BETWEEN $1 AND $2 ${userIdFilter}`,
        params
      );

      // Get refunds
      const refunds = await vultrPostgres.query<{
        refund_amount: number;
      }>(
        `SELECT COALESCE(SUM(refund_amount), 0) as refund_amount
         FROM orders 
         WHERE status = 'refunded' AND created_at BETWEEN $1 AND $2 ${userIdFilter}`,
        params
      );

      const totalRevenue = orders.reduce((sum, o) => 
        o.status === 'paid' || o.status === 'confirmed' ? sum + parseFloat(String(o.total_amount)) : sum, 0
      );
      
      const subscriptionRevenue = subscriptions.length * 19.99; // Approximate monthly subscription
      const oneTimeRevenue = totalRevenue - subscriptionRevenue;
      const refundsTotal = parseFloat(refunds[0]?.refund_amount || '0');
      const netRevenue = totalRevenue - refundsTotal;

      // Revenue by day
      const revenueByDayMap = new Map<string, number>();
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const amount = order.status === 'paid' || order.status === 'confirmed' 
          ? parseFloat(String(order.total_amount)) 
          : 0;
        revenueByDayMap.set(date, (revenueByDayMap.get(date) || 0) + amount);
      });

      const revenueByDay = Array.from(revenueByDayMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top products
      const productRevenue = new Map<string, { revenue: number; quantity: number }>();
      orders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach((item: any) => {
            const existing = productRevenue.get(item.productId) || { revenue: 0, quantity: 0 };
            productRevenue.set(item.productId, {
              revenue: existing.revenue + (item.price * item.quantity),
              quantity: existing.quantity + item.quantity,
            });
          });
        } catch (e) {
          // Skip invalid JSON
        }
      });

      const topProducts = Array.from(productRevenue.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalRevenue,
        subscriptionRevenue,
        oneTimeRevenue,
        refunds: refundsTotal,
        netRevenue,
        orderCount: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        revenueByDay,
        topProducts,
      };
    } catch (error: any) {
      console.error('Failed to get revenue analytics:', error);
      throw new ExternalServiceError('Analytics', 'Failed to retrieve revenue analytics', error);
    }
  }

  /**
   * Update subscription plan (upgrade/downgrade with prorating)
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorate: boolean = true
  ): Promise<{ subscriptionId: string; status: string }> {
    try {
      if (this.isMockMode()) {
        await this.simulateDelay(300);
        return { subscriptionId, status: 'active' };
      }

      const subscription = await this.retryStripeCall(
        () => this.stripe!.subscriptions.retrieve(subscriptionId),
        'retrieveSubscription'
      );

      // Update subscription with prorating
      const updatedSubscription = await this.retryStripeCall(
        () => this.stripe!.subscriptions.update(subscriptionId, {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: prorate ? 'always_invoice' : 'none',
        }),
        'updateSubscription'
      );

      // Update database
      await vultrPostgres.query(
        `UPDATE subscriptions 
         SET stripe_subscription_id = $1, 
             updated_at = $2
         WHERE stripe_subscription_id = $1`,
        [subscriptionId, new Date().toISOString()]
      );

      this.logPaymentOperation('updateSubscription', {
        subscriptionId,
        newPriceId,
        prorate,
      });

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
      };
    } catch (error: any) {
      this.logPaymentOperation('updateSubscription', {
        subscriptionId,
        error: error.message,
      }, false);
      throw new ExternalServiceError('Stripe', 'Failed to update subscription', error);
    }
  }

  /**
   * Get subscription usage for usage-based billing
   */
  async getSubscriptionUsage(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    voiceSessions: number;
    stylingRecommendations: number;
    fitReports: number;
    premiumFeatures: number;
    totalUsage: number;
  }> {
    try {
      // This would integrate with your analytics/usage tracking
      // For now, return mock data structure
      const usage = await vultrPostgres.query<{
        event_type: string;
        count: number;
      }>(
        `SELECT event_type, COUNT(*) as count
         FROM engagement_events
         WHERE user_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY event_type`,
        [userId, startDate.toISOString(), endDate.toISOString()]
      );

      const voiceSessions = usage.find(u => u.event_type === 'voice_session')?.count || 0;
      const stylingRecommendations = usage.find(u => u.event_type === 'recommendation')?.count || 0;
      const fitReports = usage.find(u => u.event_type === 'fit_report')?.count || 0;
      const premiumFeatures = usage.find(u => u.event_type === 'premium_feature')?.count || 0;

      return {
        voiceSessions: Number(voiceSessions),
        stylingRecommendations: Number(stylingRecommendations),
        fitReports: Number(fitReports),
        premiumFeatures: Number(premiumFeatures),
        totalUsage: Number(voiceSessions) + Number(stylingRecommendations) + Number(fitReports) + Number(premiumFeatures),
      };
    } catch (error: any) {
      console.error('Failed to get subscription usage:', error);
      // Return zero usage on error
      return {
        voiceSessions: 0,
        stylingRecommendations: 0,
        fitReports: 0,
        premiumFeatures: 0,
        totalUsage: 0,
      };
    }
  }

  /**
   * Handle Stripe webhook with improved error handling and retry logic
   * This is called when Stripe sends events about payment status changes
   * In mock mode, this can be called manually to simulate webhook events
   */
  async handleWebhook(payload: Buffer | string, signature: string): Promise<void> {
    // Mock mode - allow webhook simulation without signature verification
    if (this.isMockMode()) {
      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
      let eventData: any;
      
      try {
        eventData = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payloadString);
      } catch (err) {
        // If payload is already an object, use it directly
        eventData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      }

      // Handle mock checkout.session.completed event
      if (eventData.type === 'checkout.session.completed' || eventData.sessionId) {
        const sessionId = eventData.sessionId || eventData.data?.object?.id;
        if (sessionId) {
          await this.simulateMockPaymentCompletion(sessionId);
        }
      }

      this.logPaymentOperation('webhook', {
        eventType: eventData.type || 'mock',
        mockMode: true,
      });
      return;
    }

    // Real Stripe webhook handling
    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.warn('Stripe webhook secret not configured - webhook verification skipped');
      // In development, allow webhooks without secret for testing
      if (env.NODE_ENV === 'production') {
        throw new Error('Stripe webhook secret not configured');
      }
    }

    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');

    let event: Stripe.Event;
    
    try {
      event = this.stripe!.webhooks.constructEvent(
        payloadString,
        signature,
        env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      this.logPaymentOperation('webhookVerification', {
        error: err.message,
        eventId: 'unknown',
      }, false);
      throw new PaymentError(`Webhook signature verification failed: ${err.message}`);
    }

    // Check if event was already processed
    try {
      const existing = await vultrPostgres.query(
        'SELECT processed FROM webhook_events WHERE stripe_event_id = $1',
        [event.id]
      );
      
      if (existing.length > 0 && existing[0].processed) {
        console.log(`Webhook event ${event.id} already processed, skipping`);
        return;
      }
    } catch (dbError) {
      console.warn('Failed to check existing webhook event:', dbError);
      // Continue processing
    }

    // Store webhook event in database
    try {
      await vultrPostgres.query(
        `INSERT INTO webhook_events (stripe_event_id, type, payload, processed, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stripe_event_id) DO NOTHING`,
        [
          event.id,
          event.type,
          JSON.stringify(event.data),
          false,
          new Date().toISOString(),
        ]
      );
    } catch (dbError) {
      console.warn('Failed to store webhook event in database:', dbError);
    }

    // Handle different event types
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logPaymentOperation('webhook.payment_intent.succeeded', {
            eventId: event.id,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
          });
          
          // Update order status in database
          try {
            const userId = paymentIntent.metadata?.userId;
            const orderId = paymentIntent.metadata?.orderId;
            
            if (userId && orderId) {
              await vultrPostgres.query(
                `UPDATE orders 
                 SET status = 'paid', 
                     payment_intent_id = $1,
                     updated_at = $2
                 WHERE order_id = $3 AND user_id = $4`,
                [paymentIntent.id, new Date().toISOString(), orderId, userId]
              );
              this.logPaymentOperation('orderStatusUpdated', {
                orderId,
                status: 'paid',
              });
            }
          } catch (dbError) {
            console.error('Failed to update order status:', dbError);
            // Don't throw - webhook was received, just log the error
            this.logPaymentOperation('orderStatusUpdateFailed', {
              paymentIntentId: paymentIntent.id,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            }, false);
          }
          break;
        }
      
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logPaymentOperation('webhook.payment_intent.payment_failed', {
            eventId: event.id,
            paymentIntentId: paymentIntent.id,
            lastPaymentError: paymentIntent.last_payment_error?.message || 'unknown',
          }, false);
          
          // Update order status to failed
          try {
            const userId = paymentIntent.metadata?.userId;
            const orderId = paymentIntent.metadata?.orderId;
            
            if (userId && orderId) {
              await vultrPostgres.query(
                `UPDATE orders 
                 SET status = 'payment_failed', 
                     updated_at = $1
                 WHERE order_id = $2 AND user_id = $3`,
                [new Date().toISOString(), orderId, userId]
              );
              this.logPaymentOperation('orderStatusUpdated', {
                orderId,
                status: 'payment_failed',
              });
            }
          } catch (dbError) {
            console.error('Failed to update order status:', dbError);
            this.logPaymentOperation('orderStatusUpdateFailed', {
              paymentIntentId: paymentIntent.id,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            }, false);
          }
          break;
        }
        
        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logPaymentOperation('webhook.payment_intent.canceled', {
            eventId: event.id,
            paymentIntentId: paymentIntent.id,
          });
          break;
        }

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          this.logPaymentOperation('webhook.checkout.session.completed', {
            eventId: event.id,
            sessionId: session.id,
            mode: session.mode,
            paymentStatus: session.payment_status,
          });

          // Handle completed checkout session
          try {
            const userId = session.metadata?.userId;
            const paymentIntentId = session.payment_intent as string;

            if (session.mode === 'payment' && paymentIntentId && userId && this.stripe) {
              // Retrieve the payment intent to get order details
              const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
              const orderId = paymentIntent.metadata?.orderId;

              if (orderId && session.payment_status === 'paid') {
                // Update order status to paid
                await vultrPostgres.query(
                  `UPDATE orders 
                   SET status = 'paid', 
                       payment_intent_id = $1,
                       checkout_session_id = $2,
                       updated_at = $3
                   WHERE order_id = $4 AND user_id = $5`,
                  [
                    paymentIntentId,
                    session.id,
                    new Date().toISOString(),
                    orderId,
                    userId,
                  ]
                );
                this.logPaymentOperation('orderStatusUpdated', {
                  orderId,
                  status: 'paid',
                  source: 'checkout.session.completed',
                });
              }
            } else if (session.mode === 'subscription' && userId) {
              // Handle subscription checkout completion
              const subscriptionId = session.subscription as string;
              if (subscriptionId) {
                const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);
                await vultrPostgres.query(
                  `INSERT INTO subscriptions (subscription_id, user_id, stripe_subscription_id, status, current_period_end, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6)
                   ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = $4, current_period_end = $5, updated_at = $6`,
                  [
                    `sub_${Date.now()}`,
                    userId,
                    subscription.id,
                    subscription.status,
                    new Date(subscription.current_period_end * 1000).toISOString(),
                    new Date().toISOString(),
                  ]
                );
                this.logPaymentOperation('subscriptionCreated', {
                  subscriptionId: subscription.id,
                  userId,
                });
              }
            }

            // Update fraud incident if payment completed successfully
            const incidentId = session.metadata?.incidentId;
            if (incidentId && session.payment_status === 'paid') {
              try {
                await vultrPostgres.query(
                  `UPDATE fraud_incidents 
                   SET decision = 'allow', 
                       notes = 'payment completed successfully',
                       updated_at = $1
                   WHERE id = $2`,
                  [new Date().toISOString(), incidentId]
                );
              } catch (fraudError) {
                console.error('Failed to update fraud incident for completed checkout:', fraudError);
              }
            }
          } catch (dbError) {
            console.error('Failed to process checkout.session.completed:', dbError);
            this.logPaymentOperation('checkoutSessionProcessingFailed', {
              sessionId: session.id,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            }, false);
          }
          break;
        }
      
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          this.logPaymentOperation('webhook.charge.refunded', {
            eventId: event.id,
            chargeId: charge.id,
            refundAmount: charge.amount_refunded / 100,
          });
          
          // Update order status to refunded
          try {
            const paymentIntentId = charge.payment_intent as string;
            if (paymentIntentId) {
              const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
              const userId = paymentIntent.metadata?.userId;
              const orderId = paymentIntent.metadata?.orderId;
              
              if (userId && orderId) {
                await vultrPostgres.query(
                  `UPDATE orders 
                   SET status = 'refunded', 
                       refund_id = $1,
                       refund_amount = $2,
                       updated_at = $3
                   WHERE order_id = $4 AND user_id = $5`,
                  [
                    charge.refunds?.data[0]?.id || null,
                    charge.amount_refunded / 100,
                    new Date().toISOString(),
                    orderId,
                    userId,
                  ]
                );
                this.logPaymentOperation('orderStatusUpdated', {
                  orderId,
                  status: 'refunded',
                });
              }
            }
          } catch (dbError) {
            console.error('Failed to update order status for refund:', dbError);
            this.logPaymentOperation('orderStatusUpdateFailed', {
              chargeId: charge.id,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            }, false);
          }
          break;
        }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('✅ Invoice payment succeeded:', invoice.id);
        // Handle subscription renewals or one-time invoice payments
        try {
          if (invoice.subscription) {
            await vultrPostgres.query(
              `UPDATE subscriptions SET status = 'active', updated_at = $1 WHERE stripe_subscription_id = $2`,
              [new Date().toISOString(), invoice.subscription as string]
            );
          }
        } catch (dbError) {
          console.error('Failed to update subscription status:', dbError);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ Invoice payment failed:', invoice.id);
        // Notify user, update subscription status, etc.
        try {
          if (invoice.subscription) {
            await vultrPostgres.query(
              `UPDATE subscriptions SET status = 'past_due', updated_at = $1 WHERE stripe_subscription_id = $2`,
              [new Date().toISOString(), invoice.subscription as string]
            );
          }
        } catch (dbError) {
          console.error('Failed to update subscription status:', dbError);
        }
        break;
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log('⚠️ Dispute created/updated:', dispute.id);
        
        // Update fraud incidents and user risk profiles
        try {
          const chargeId = dispute.charge as string;
          if (chargeId && this.stripe) {
            const charge = await this.stripe.charges.retrieve(chargeId);
            const paymentIntentId = charge.payment_intent as string;
            
            if (paymentIntentId) {
              const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
              const userId = paymentIntent.metadata?.userId;
              const incidentId = paymentIntent.metadata?.incidentId;
              
              // Update fraud incident if linked
              if (incidentId) {
                await vultrPostgres.query(
                  `UPDATE fraud_incidents 
                   SET decision = 'deny', 
                       notes = $1,
                       updated_at = $2
                   WHERE id = $3`,
                  [
                    `Stripe dispute: ${event.type} - ${dispute.reason || 'unknown'} - Amount: ${dispute.amount / 100}`,
                    new Date().toISOString(),
                    incidentId,
                  ]
                );
                
                this.logPaymentOperation('fraud.dispute.linked', {
                  incidentId,
                  disputeId: dispute.id,
                  reason: dispute.reason,
                  amount: dispute.amount / 100,
                });
              }
              
              // Update user risk profile - increment chargeback count
              if (userId) {
                await vultrPostgres.query(
                  `INSERT INTO user_risk_profiles (id, user_id, chargeback_count, last_update)
                   VALUES ($1, $2, 1, $3)
                   ON CONFLICT (user_id) DO UPDATE SET
                     chargeback_count = user_risk_profiles.chargeback_count + 1,
                     last_update = $3`,
                  [
                    `risk_${userId}`,
                    userId,
                    new Date().toISOString(),
                  ]
                );
                
                // Log dispute for analytics
                this.logPaymentOperation('fraud.dispute.user', {
                  userId,
                  disputeId: dispute.id,
                  chargebackCount: 'incremented',
                });
              }
            }
          }
        } catch (dbError) {
          console.error('Failed to update fraud data for dispute:', dbError);
          this.logPaymentOperation('fraud.dispute.error', {
            disputeId: dispute.id,
            error: dbError instanceof Error ? dbError.message : String(dbError),
          }, false);
        }
        break;
      }
      
      case 'radar.early_fraud_warning.created': {
        const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
        console.log('🚨 Stripe Radar early fraud warning:', warning.id);
        
        try {
          const chargeId = warning.charge as string;
          if (chargeId && this.stripe) {
            const charge = await this.stripe.charges.retrieve(chargeId);
            const paymentIntentId = charge.payment_intent as string;
            
            if (paymentIntentId) {
              const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
              const userId = paymentIntent.metadata?.userId;
              const incidentId = paymentIntent.metadata?.incidentId;
              
              // Log Radar warning
              this.logPaymentOperation('fraud.radar.warning', {
                warningId: warning.id,
                chargeId,
                paymentIntentId,
                userId,
                incidentId,
                actionable: warning.actionable.toString(),
              }, false);
              
              // Update fraud incident if exists
              if (incidentId) {
                await vultrPostgres.query(
                  `UPDATE fraud_incidents 
                   SET notes = COALESCE(notes, '') || $1,
                       updated_at = $2
                   WHERE id = $3`,
                  [
                    ` | Stripe Radar warning: ${warning.id} (actionable: ${warning.actionable})`,
                    new Date().toISOString(),
                    incidentId,
                  ]
                );
              }
              
              // If actionable and no incident exists, create one
              if (warning.actionable && !incidentId && userId) {
                const newIncidentId = `radar_${warning.id}`;
                await vultrPostgres.query(
                  `INSERT INTO fraud_incidents (id, user_id, score, decision, notes, created_at, updated_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    newIncidentId,
                    userId,
                    0.7, // High risk score for Radar warnings
                    'manual_review',
                    `Stripe Radar early fraud warning: ${warning.id}`,
                    new Date().toISOString(),
                    new Date().toISOString(),
                  ]
                );
              }
            }
          }
        } catch (radarError) {
          console.error('Failed to process Radar fraud warning:', radarError);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📋 Subscription updated:', subscription.id);
        const userId = subscription.metadata?.userId;

        if (userId) {
          try {
            await vultrPostgres.query(
              `INSERT INTO subscriptions (subscription_id, user_id, stripe_subscription_id, status, current_period_end, created_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = $4, current_period_end = $5, updated_at = $6`,
              [
                `sub_${Date.now()}`,
                userId,
                subscription.id,
                subscription.status,
                new Date(subscription.current_period_end * 1000).toISOString(),
                new Date().toISOString(),
              ]
            );
          } catch (dbError) {
            console.error('Failed to update subscription:', dbError);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🗑️ Subscription deleted:', subscription.id);
        try {
          await vultrPostgres.query(
            'UPDATE subscriptions SET status = $1, updated_at = $2 WHERE stripe_subscription_id = $3',
            ['canceled', new Date().toISOString(), subscription.id]
          );
        } catch (dbError) {
          console.error('Failed to update subscription status:', dbError);
        }
        break;
      }
      
        default:
          this.logPaymentOperation('webhook.unhandled', {
            eventId: event.id,
            eventType: event.type,
          });
      }
    } catch (error: any) {
      this.logPaymentOperation('webhook.processingError', {
        eventId: event.id,
        eventType: event.type,
        error: error.message,
      }, false);
      // Re-throw to allow webhook retry
      throw error;
    }

    // Mark event as processed
    try {
      await vultrPostgres.query(
        'UPDATE webhook_events SET processed = true WHERE stripe_event_id = $1',
        [event.id]
      );
      this.logPaymentOperation('webhook.processed', {
        eventId: event.id,
        eventType: event.type,
      });
    } catch (dbError) {
      console.warn('Failed to mark webhook event as processed:', dbError);
      // Don't throw - event was processed, just couldn't update flag
    }
  }
}

export const paymentService = new PaymentService();

