/**
 * Returns Predictor Agent Routes
 * API endpoints for cart validation and return risk assessment
 */

import { Router, Request, Response, NextFunction } from 'express';
import { returnsPredictorAgent } from '../services/agents/returns-predictor/index.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/agents/returns-predictor/validate-cart
 * Validate cart items for return risk before checkout
 */
router.post(
  '/validate-cart',
  validateBody(
    z.object({
      cartItems: z.array(
        z.object({
          product: z.object({
            id: z.string(),
            name: z.string(),
            brand: z.string(),
            price: z.number(),
            category: z.string().optional(),
            description: z.string().optional(),
            rating: z.number().optional(),
            reviews: z.array(
              z.object({
                rating: z.number(),
                comment: z.string(),
              })
            ).optional(),
            color: z.string().optional(),
            sizes: z.array(z.string()).optional(),
          }),
          quantity: z.number().int().positive(),
          size: z.string().optional(),
        })
      ).min(1, 'Cart must contain at least one item'),
      userId: z.string().min(1, 'User ID is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cartItems, userId } = req.body;

      // Assess cart items for return risk
      const assessments = await returnsPredictorAgent.assessCart(cartItems, userId);

      // Get cart risk summary
      const summary = await returnsPredictorAgent.getCartRiskSummary(cartItems, userId);

      res.json({
        success: true,
        assessments,
        summary: {
          averageRisk: summary.averageRisk,
          highRiskItems: summary.highRiskItems,
          totalPotentialSavings: summary.totalPotentialSavings,
          recommendations: summary.recommendations,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/returns-predictor/assess-item
 * Assess a single product for return risk
 */
router.post(
  '/assess-item',
  validateBody(
    z.object({
      product: z.object({
        id: z.string(),
        name: z.string(),
        brand: z.string(),
        price: z.number(),
        category: z.string().optional(),
        description: z.string().optional(),
        rating: z.number().optional(),
        reviews: z.array(
          z.object({
            rating: z.number(),
            comment: z.string(),
          })
        ).optional(),
      }),
      quantity: z.number().int().positive().default(1),
      size: z.string().optional(),
      userId: z.string().min(1, 'User ID is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { product, quantity, size, userId } = req.body;

      const cartItem = {
        product,
        quantity: quantity || 1,
        size,
      };

      // Use private method via type casting (in production, make this public or add public method)
      const assessments = await returnsPredictorAgent.assessCart([cartItem], userId);
      const assessment = assessments[0];

      res.json({
        success: true,
        assessment,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/agents/returns-predictor/summary/:userId
 * Get return risk summary for a user's shopping history
 */
router.get(
  '/summary/:userId',
  validateParams(z.object({ userId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      // This would fetch user's recent cart/history and provide summary
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Return risk summary endpoint - implementation in progress',
        userId,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

