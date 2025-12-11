/**
 * Return Risk Prediction API Routes
 * ML-powered return risk prediction using 55+ features
 */

import { Router, Request, Response, NextFunction } from 'express';
import { validateBody } from '../middleware/validation.js';
import { z } from 'zod';
import { ReturnRiskPredictionService } from '../services/ReturnRiskPredictionService.js';

const router = Router();
const riskService = new ReturnRiskPredictionService();

/**
 * POST /api/functions/v1/return-risk-prediction
 * Predict return risk for a purchase using 55+ features
 */
router.post(
  '/v1/return-risk-prediction',
  validateBody(
    z.object({
      user: z.object({
        userId: z.string().min(1),
        totalPurchases: z.number().int().min(0),
        totalReturns: z.number().int().min(0),
        returnRate: z.number().min(0).max(1),
        avgOrderValue: z.number().min(0),
        avgReturnValue: z.number().min(0).optional(),
        accountAgeInDays: z.number().int().min(0),
        preferredSize: z.string().optional(),
        preferredBrand: z.string().optional(),
        sizeAccuracy: z.number().min(0).max(1).optional(),
        reviewScore: z.number().min(1).max(5).optional(),
        loyaltyTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
      }),
      product: z.object({
        productId: z.string().min(1),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        brand: z.string().min(1),
        price: z.number().min(0),
        originalPrice: z.number().min(0).optional(),
        discountPercentage: z.number().min(0).max(100).optional(),
        fabric: z.string().optional(),
        fit: z.enum(['tight', 'normal', 'loose', 'oversized']).optional(),
        ratingAverage: z.number().min(1).max(5).optional(),
        ratingCount: z.number().int().min(0).optional(),
        returnCount: z.number().int().min(0).optional(),
        totalSold: z.number().int().min(0).optional(),
        isSeasonalItem: z.boolean().optional(),
        inStock: z.boolean().optional(),
        color: z.string().optional(),
        size: z.string().optional(),
      }),
      context: z.object({
        deviceType: z.enum(['mobile', 'desktop', 'tablet']),
        isNewCustomer: z.boolean(),
        isGiftPurchase: z.boolean(),
        daysSincePurchase: z.number().int().min(0).optional(),
        shippingSpeed: z.enum(['standard', 'expedited', 'overnight']),
        paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay']),
        promoApplied: z.boolean().optional(),
        promoDiscount: z.number().min(0).optional(),
        returnsWindow: z.number().int().min(0).optional(),
        isInternational: z.boolean().optional(),
        weatherCondition: z.string().optional(),
        socialMediaMentioned: z.boolean().optional(),
        previouslyReturnedBrand: z.boolean().optional(),
      }).optional(),
      batch: z.array(
        z.object({
          user: z.any(),
          product: z.any(),
          context: z.any().optional(),
        })
      ).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, product, context, batch } = req.body;

      // Handle batch predictions
      if (batch && Array.isArray(batch)) {
        const results = await riskService.predictBatch(batch);
        return res.status(200).json({
          success: true,
          predictions: results,
          count: results.length,
          timestamp: new Date().toISOString(),
        });
      }

      // Single prediction
      const prediction = await riskService.predict(
        user,
        product,
        context || {
          deviceType: 'desktop',
          isNewCustomer: false,
          isGiftPurchase: false,
          shippingSpeed: 'standard',
          paymentMethod: 'credit_card',
          returnsWindow: 30,
        }
      );

      return res.status(200).json({
        success: true,
        prediction,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Return risk prediction error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/functions/v1/return-risk-prediction/baseline
 * Get baseline risk rates by category
 * Note: getBaseline method not implemented in ReturnRiskPredictionService
 */
router.get(
  '/v1/return-risk-prediction/baseline',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Return default baseline until getBaseline is implemented
      const baseline = {
        overall: 0.15,
        byCategory: {
          'clothing': 0.18,
          'shoes': 0.12,
          'accessories': 0.10,
          'jewelry': 0.08,
        },
      };
      return res.status(200).json({
        success: true,
        baseline,
      });
    } catch (error: any) {
      console.error('Baseline fetch error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      });
    }
  }
);

export default router;
