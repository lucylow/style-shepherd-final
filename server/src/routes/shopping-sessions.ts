/**
 * Shopping Sessions API Routes
 * Handles HITL shopping session management and human actions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { hitlOrchestrator } from '../services/HITLOrchestrator.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';
import { AppError, ErrorCode } from '../lib/errors.js';

const router = Router();

// POST /api/shopping/start - Start a new shopping session with HITL
router.post(
  '/start',
  validateBody(
    z.object({
      userId: z.string().min(1, 'User ID is required'),
      query: z.string().min(1, 'Query is required'),
      budget: z.number().positive().optional(),
      occasion: z.string().optional(),
      preferences: z.record(z.any()).optional(),
      tier: z.enum(['premium', 'express', 'vip']).optional(),
      sessionId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, query, budget, occasion, preferences, tier, sessionId } = req.body;

      const sessionIdFinal = sessionId || `session_${userId}_${Date.now()}`;

      // Process with human review
      const response = await hitlOrchestrator.processWithHumanReview({
        sessionId: sessionIdFinal,
        userId,
        query,
        budget,
        occasion,
        preferences,
        tier: tier || 'premium',
      });

      res.json({
        success: true,
        sessionId: response.sessionId,
        status: response.status,
        message: response.message,
        nextStep: response.nextStep,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/shopping/session/:sessionId - Get session status
router.get(
  '/session/:sessionId',
  validateParams(z.object({ sessionId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = await hitlOrchestrator.getSession(sessionId);

      if (!session) {
        throw new AppError('Session not found', ErrorCode.NOT_FOUND, 404);
      }

      res.json({
        success: true,
        session,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/shopping/human-action - Handle human approval/rejection
router.post(
  '/human-action',
  validateBody(
    z.object({
      sessionId: z.string().min(1, 'Session ID is required'),
      action: z.enum([
        'approved',
        'rejected',
        'suggested_alt',
        'override_size',
        'refine_style',
        'new_budget',
        'confirm_size',
        'body_scan_needed',
        'accept_risk',
        'swap_item',
        'remove',
        'shade_approval',
        'selfie_retake',
      ]),
      stylistId: z.string().uuid('Invalid stylist ID'),
      updates: z.record(z.any()).optional(), // Optional updates like size overrides
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, action, stylistId, updates } = req.body;

      const session = await hitlOrchestrator.handleHumanAction(
        sessionId,
        action,
        stylistId,
        updates
      );

      res.json({
        success: true,
        session,
        message: `Action "${action}" processed successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/shopping/stylist/queue - Get pending sessions for stylist queue
router.get(
  '/stylist/queue',
  validateQuery(
    z.object({
      stylistId: z.string().uuid().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stylistId } = req.query;
      const sessions = await hitlOrchestrator.getPendingSessions(
        stylistId as string | undefined
      );

      res.json({
        success: true,
        sessions,
        count: sessions.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/shopping/stylist/claim - Claim a session for review
router.post(
  '/stylist/claim',
  validateBody(
    z.object({
      sessionId: z.string().min(1, 'Session ID is required'),
      stylistId: z.string().uuid('Invalid stylist ID'),
      stylistName: z.string().min(1, 'Stylist name is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, stylistId, stylistName } = req.body;

      const session = await hitlOrchestrator.updateSession(sessionId, {
        stylist_id: stylistId,
        stylist_name: stylistName,
        assigned_at: new Date().toISOString(),
        sla_deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min SLA
      });

      res.json({
        success: true,
        session,
        message: 'Session claimed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
