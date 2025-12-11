/**
 * Specialized Agents API Routes
 * Routes for the four new specialized agents:
 * - Personal Shopper
 * - Makeup Artist
 * - Size Predictor
 * - Returns Predictor
 */

import { Router, Request, Response, NextFunction } from 'express';
import { agentOrchestrator } from '../services/agents/AgentOrchestrator.js';
import {
  personalShopperAgent,
  makeupArtistAgent,
  sizePredictorAgent,
  returnsPredictorAgent,
} from '../services/agents/index.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../lib/errors.js';

const router = Router();

/**
 * POST /api/agents/orchestrate
 * Main orchestration endpoint - routes query to appropriate agent(s)
 */
router.post(
  '/orchestrate',
  validateBody(
    z.object({
      userId: z.string().min(1),
      intent: z.string().min(1),
      context: z.object({
        budget: z.number().optional(),
        occasion: z.string().optional(),
        style: z.string().optional(),
        measurements: z.any().optional(),
        items: z.array(z.any()).optional(),
        selfieUrl: z.string().url().optional(),
        skinTone: z.any().optional(),
        preferences: z.any().optional(),
      }).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, intent, context } = req.body;
      const result = await agentOrchestrator.parseIntent({ userId, intent, context });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/personal-shopper
 * Personal Shopper Agent - Outfit recommendations
 */
router.post(
  '/personal-shopper',
  validateBody(
    z.object({
      userId: z.string().min(1),
      budget: z.number().positive(),
      occasion: z.string().optional(),
      style: z.string().optional(),
      preferences: z.object({
        colors: z.array(z.string()).optional(),
        brands: z.array(z.string()).optional(),
        styles: z.array(z.string()).optional(),
      }).optional(),
      excludeProductIds: z.array(z.string()).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await personalShopperAgent.recommendOutfits(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/makeup-artist
 * Makeup Artist Agent - Makeup look generation
 */
router.post(
  '/makeup-artist',
  validateBody(
    z.object({
      userId: z.string().min(1),
      occasion: z.string().min(1),
      selfieUrl: z.string().url().optional(),
      skinTone: z.object({
        undertone: z.enum(['warm', 'cool', 'neutral']).optional(),
        depth: z.enum(['light', 'medium', 'tan', 'deep']).optional(),
      }).optional(),
      preferences: z.object({
        intensity: z.enum(['natural', 'moderate', 'bold']).optional(),
        colors: z.array(z.string()).optional(),
        brands: z.array(z.string()).optional(),
      }).optional(),
      budget: z.number().positive().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await makeupArtistAgent.generateLook(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/size-predictor
 * Size Predictor Agent - Size recommendations
 */
router.post(
  '/size-predictor',
  validateBody(
    z.object({
      userId: z.string().min(1),
      brand: z.string().min(1),
      category: z.string().min(1),
      measurements: z.object({
        height: z.number().optional(),
        weight: z.number().optional(),
        chest: z.number().optional(),
        waist: z.number().optional(),
        hips: z.number().optional(),
        inseam: z.number().optional(),
        shoeSize: z.number().optional(),
      }),
      productId: z.string().optional(),
      preferredSize: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sizePredictorAgent.predictSize(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/returns-predictor
 * Returns Predictor Agent - Return risk assessment
 */
router.post(
  '/returns-predictor',
  validateBody(
    z.object({
      userId: z.string().min(1),
      items: z.array(
        z.object({
          productId: z.string(),
          brand: z.string(),
          category: z.string(),
          price: z.number(),
          size: z.string().optional(),
          color: z.string().optional(),
          rating: z.number().optional(),
        })
      ).min(1),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await returnsPredictorAgent.predictRisk(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/agents
 * List all available specialized agents
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      agents: [
        {
          id: 'personal-shopper',
          name: 'Personal Shopper',
          description: 'Recommends complete outfits based on style, budget, and preferences',
          capabilities: ['outfit-recommendation', 'wardrobe-styling', 'budget-optimization'],
        },
        {
          id: 'makeup-artist',
          name: 'Makeup Artist',
          description: 'Generates personalized makeup looks based on skin tone and occasion',
          capabilities: ['makeup-recommendation', 'skin-tone-analysis', 'beauty-routine'],
        },
        {
          id: 'size-predictor',
          name: 'Size Predictor',
          description: 'Predicts optimal sizing across brands using body measurements',
          capabilities: ['size-prediction', 'fit-optimization', 'brand-sizing'],
        },
        {
          id: 'returns-predictor',
          name: 'Returns Predictor',
          description: 'Flags high-return-risk items pre-purchase using ML',
          capabilities: ['return-risk-assessment', 'cart-analysis', 'risk-mitigation'],
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

