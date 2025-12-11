/**
 * Risk & Compliance API Routes
 * Risk assessment, approval, and audit endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { evaluateAction } from '../lib/policyEngine.js';
import { logEvidence } from '../lib/evidence.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function checkAdminAuth(req: Request): boolean {
  const header = req.headers['x-admin-token'] || (req.query?.adminToken as string);
  return header === ADMIN_TOKEN;
}

/**
 * POST /api/risk/assess
 * Assess risk for an action
 */
router.post(
  '/assess',
  validateBody(
    z.object({
      user: z
        .object({
          id: z.string().optional(),
          email: z.string().email().optional(),
          history: z
            .object({
              totalOrders: z.number().optional(),
              returnRate: z.number().optional(),
              fraudFlags: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      product: z
        .object({
          sku: z.string().optional(),
          price: z.number().optional(),
          brand: z.string().optional(),
          brandTrustScore: z.number().min(0).max(1).optional(),
        })
        .optional(),
      action: z
        .object({
          type: z.enum(['checkout', 'cart', 'auto-buy', 'invoice', 'refund']).optional(),
          details: z.record(z.any()).optional(),
        })
        .optional(),
      returnsPrediction: z
        .object({
          probability: z.number().min(0).max(1).optional(),
        })
        .optional(),
      otherSignals: z
        .object({
          anomalyFlags: z.array(z.string()).optional(),
          merchantRules: z.record(z.any()).optional(),
        })
        .optional(),
      autonomy: z.enum(['manual', 'hybrid', 'autonomous']).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const { user, product, action, returnsPrediction, otherSignals, autonomy } = body;

      // Evaluate
      const result = evaluateAction({
        user,
        product,
        action,
        returnsPrediction,
        otherSignals,
        autonomy,
      });

      // Persist an evidence snapshot (request + assessment)
      const evidence = await logEvidence({
        action: action?.type || 'assess',
        userId: user?.id,
        payload: { request: body, assessment: result },
      });

      // Also persist as a RiskIncident if Prisma is available (best-effort)
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.riskIncident.create({
          data: {
            action: action?.type || 'assess',
            userId: user?.id,
            score: result.score,
            decision: result.decision,
            reasons: result.reasons as any,
            evidenceId: evidence.id,
            // Extract explicit features if available
            price: product?.price ? Math.round(product.price * 100) : undefined, // convert to cents
            returnsProbability: returnsPrediction?.probability,
            userReturnRate: user?.history?.returnRate,
            brandTrustScore: product?.brandTrustScore,
            anomalyFlagsCount: otherSignals?.anomalyFlags?.length,
            actionType: action?.type,
          },
        });
        await prisma.$disconnect();
      } catch (e) {
        // ignore if DB not configured
      }

      return res.status(200).json({ success: true, result, evidence });
    } catch (err) {
      console.error('assess error', err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }
);

/**
 * POST /api/risk/approve
 * Admin approval handler
 */
router.post(
  '/approve',
  validateBody(
    z.object({
      incidentId: z.string().min(1, 'Incident ID is required'),
      decision: z.enum(['allow', 'deny', 'require_approval']),
      adminId: z.string().optional(),
      note: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!checkAdminAuth(req)) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }

    try {
      const { incidentId, decision, adminId, note } = req.body;

      // Persist admin action in evidence
      const evidence = await logEvidence({
        action: 'approval',
        userId: adminId || 'admin',
        payload: { incidentId, decision, note },
      });

      // Update RiskIncident in DB if available
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.riskIncident.update({
          where: { id: incidentId },
          data: {
            decision,
            handledBy: adminId,
            handledAt: new Date(),
          },
        });
        await prisma.$disconnect();
      } catch (e) {
        // ignore
      }

      return res.json({ success: true, evidence });
    } catch (err) {
      console.error('approve error', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  }
);

export default router;
