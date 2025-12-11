/**
 * Return Risk Prediction Service - Test Suite
 * Comprehensive test coverage for feature engineering, model, and API
 */

import { ReturnRiskPredictionService } from '../returnRiskPrediction';
import type { UserProfile, ProductInfo, TransactionContext, RiskPrediction } from '../returnRiskPrediction';

describe('ReturnRiskPredictionService', () => {
  let service: ReturnRiskPredictionService;

  beforeEach(() => {
    service = new ReturnRiskPredictionService();
  });

  // ============================================================================
  // UNIT TESTS: Low Risk Scenario
  // ============================================================================

  describe('Low-risk prediction (loyal customer)', () => {
    const lowRiskUser: UserProfile = {
      userId: 'user_loyal',
      totalPurchases: 45,
      totalReturns: 2,
      returnRate: 0.044,
      avgOrderValue: 95.5,
      avgReturnValue: 50.0,
      accountAgeInDays: 720,
      preferredSize: 'M',
      sizeAccuracy: 0.92,
      reviewScore: 4.5,
      loyaltyTier: 'platinum',
    };

    const lowRiskProduct: ProductInfo = {
      productId: 'tee_basic',
      category: 'tops',
      brand: 'Uniqlo',
      price: 29.99,
      fit: 'normal',
      ratingAverage: 4.6,
      ratingCount: 2450,
      returnCount: 30,
      totalSold: 1500,
      inStock: true,
      size: 'M',
    };

    const lowRiskContext: TransactionContext = {
      deviceType: 'desktop',
      isNewCustomer: false,
      isGiftPurchase: false,
      shippingSpeed: 'standard',
      paymentMethod: 'credit_card',
      promoApplied: false,
      returnsWindow: 30,
    };

    it('should predict very low risk (< 0.2)', async () => {
      const prediction = await service.predict(lowRiskUser, lowRiskProduct, lowRiskContext);
      expect(prediction.riskScore).toBeLessThan(0.2);
      expect(prediction.riskLevel).toBe('very_low');
    });

    it('should have high confidence (> 0.75)', async () => {
      const prediction = await service.predict(lowRiskUser, lowRiskProduct, lowRiskContext);
      expect(prediction.confidence).toBeGreaterThan(0.75);
    });

    it('should recommend standard handling', async () => {
      const prediction = await service.predict(lowRiskUser, lowRiskProduct, lowRiskContext);
      expect(prediction.recommendations.some(r => r.includes('Standard handling'))).toBe(true);
    });
  });

  // ============================================================================
  // UNIT TESTS: High Risk Scenario
  // ============================================================================

  describe('High-risk prediction (new customer)', () => {
    const highRiskUser: UserProfile = {
      userId: 'user_new',
      totalPurchases: 1,
      totalReturns: 1,
      returnRate: 1.0,
      avgOrderValue: 35.0,
      avgReturnValue: 35.0,
      accountAgeInDays: 3,
      preferredSize: undefined,
      sizeAccuracy: 0.2,
      reviewScore: 2.5,
      loyaltyTier: 'bronze',
    };

    const highRiskProduct: ProductInfo = {
      productId: 'intimates_risky',
      category: 'intimates',
      brand: 'Unknown',
      price: 89.99,
      fit: 'tight',
      ratingAverage: 3.0,
      ratingCount: 15,
      returnCount: 6,
      totalSold: 22,
      inStock: true,
      size: 'S',
    };

    const highRiskContext: TransactionContext = {
      deviceType: 'mobile',
      isNewCustomer: true,
      isGiftPurchase: true,
      shippingSpeed: 'standard',
      paymentMethod: 'debit_card',
      promoApplied: true,
      promoDiscount: 25,
      returnsWindow: 30,
      isInternational: true,
      previouslyReturnedBrand: true,
    };

    it('should predict high risk (> 0.5)', async () => {
      const prediction = await service.predict(highRiskUser, highRiskProduct, highRiskContext);
      expect(prediction.riskScore).toBeGreaterThan(0.5);
      expect(['high', 'very_high'].includes(prediction.riskLevel)).toBe(true);
    });

    it('should include manual review recommendation', async () => {
      const prediction = await service.predict(highRiskUser, highRiskProduct, highRiskContext);
      expect(prediction.recommendations.some(r => r.includes('Manual review') || r.includes('contact'))).toBe(true);
    });

    it('should identify top risk factors', async () => {
      const prediction = await service.predict(highRiskUser, highRiskProduct, highRiskContext);
      expect(prediction.factors.length).toBeGreaterThan(0);
      expect(prediction.factors[0]).toHaveProperty('impact');
    });
  });

  // ============================================================================
  // UNIT TESTS: Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    const baseUser: UserProfile = {
      userId: 'user_base',
      totalPurchases: 10,
      totalReturns: 1,
      returnRate: 0.1,
      avgOrderValue: 75,
      avgReturnValue: 50,
      accountAgeInDays: 180,
      sizeAccuracy: 0.5,
    };

    const baseProduct: ProductInfo = {
      productId: 'prod_base',
      category: 'dresses',
      brand: 'Zara',
      price: 75,
      fit: 'normal',
      ratingAverage: 4.0,
      ratingCount: 100,
      returnCount: 15,
      totalSold: 200,
      inStock: true,
    };

    const baseContext: TransactionContext = {
      deviceType: 'desktop',
      isNewCustomer: false,
      isGiftPurchase: false,
      shippingSpeed: 'standard',
      paymentMethod: 'credit_card',
      returnsWindow: 30,
    };

    it('should handle missing optional fields', async () => {
      const prediction = await service.predict(baseUser, baseProduct, baseContext);
      expect(prediction).toHaveProperty('riskScore');
      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(1);
    });

    it('should clamp risk score to [0, 1]', async () => {
      const prediction = await service.predict(baseUser, baseProduct, baseContext);
      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(1);
    });

    it('should produce deterministic results', async () => {
      const pred1 = await service.predict(baseUser, baseProduct, baseContext);
      const pred2 = await service.predict(baseUser, baseProduct, baseContext);
      expect(pred1.riskScore).toBe(pred2.riskScore);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: Batch Processing
  // ============================================================================

  describe('Batch prediction', () => {
    it('should process multiple predictions', async () => {
      const predictions = [
        {
          user: {
            userId: 'user1',
            totalPurchases: 5,
            totalReturns: 0,
            returnRate: 0,
            avgOrderValue: 50,
            avgReturnValue: 0,
            accountAgeInDays: 60,
          },
          product: {
            productId: 'prod1',
            category: 'tops',
            brand: 'Brand1',
            price: 40,
          },
          context: {
            deviceType: 'desktop' as const,
            isNewCustomer: false,
            isGiftPurchase: false,
            shippingSpeed: 'standard' as const,
            paymentMethod: 'credit_card' as const,
            returnsWindow: 30,
          },
        },
        {
          user: {
            userId: 'user2',
            totalPurchases: 20,
            totalReturns: 3,
            returnRate: 0.15,
            avgOrderValue: 100,
            avgReturnValue: 75,
            accountAgeInDays: 400,
          },
          product: {
            productId: 'prod2',
            category: 'dresses',
            brand: 'Brand2',
            price: 90,
          },
          context: {
            deviceType: 'mobile' as const,
            isNewCustomer: false,
            isGiftPurchase: false,
            shippingSpeed: 'standard' as const,
            paymentMethod: 'credit_card' as const,
            returnsWindow: 30,
          },
        },
      ];

      const results = await service.predictBatch(predictions);
      expect(results).toHaveLength(2);
      expect(results[0].riskScore).toBeLessThan(results[1].riskScore);
    });
  });

  // ============================================================================
  // VALIDATION TESTS: Output Format
  // ============================================================================

  describe('Output validation', () => {
    const testUser: UserProfile = {
      userId: 'test',
      totalPurchases: 5,
      totalReturns: 0,
      returnRate: 0,
      avgOrderValue: 50,
      avgReturnValue: 0,
      accountAgeInDays: 30,
    };

    const testProduct: ProductInfo = {
      productId: 'test',
      category: 'tops',
      brand: 'Test',
      price: 50,
    };

    const testContext: TransactionContext = {
      deviceType: 'desktop',
      isNewCustomer: false,
      isGiftPurchase: false,
      shippingSpeed: 'standard',
      paymentMethod: 'credit_card',
      returnsWindow: 30,
    };

    it('should return valid RiskPrediction object', async () => {
      const prediction = await service.predict(testUser, testProduct, testContext);

      expect(prediction).toHaveProperty('riskScore');
      expect(prediction).toHaveProperty('riskLevel');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('factors');
      expect(prediction).toHaveProperty('recommendations');
      expect(prediction).toHaveProperty('modelVersion');
    });

    it('should have valid risk level', async () => {
      const prediction = await service.predict(testUser, testProduct, testContext);
      const validLevels = ['very_low', 'low', 'medium', 'high', 'very_high'];
      expect(validLevels).toContain(prediction.riskLevel);
    });

    it('should have positive confidence', async () => {
      const prediction = await service.predict(testUser, testProduct, testContext);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should have actionable recommendations', async () => {
      const prediction = await service.predict(testUser, testProduct, testContext);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(prediction.recommendations[0]).toBeTruthy();
    });
  });
});
