/**
 * Guardrails API Routes
 * Provides endpoints for monitoring, management, and emergency controls
 */

import { Router, Request, Response } from 'express';
import { guardrailEngine } from '../lib/guardrails/policy-engine.js';
import { guardrailMonitor } from '../lib/guardrails/monitoring.js';
import { permissionManager } from '../lib/guardrails/permissions.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

/**
 * GET /api/guardrails/dashboard
 * Get real-time monitoring dashboard
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await guardrailMonitor.getDashboard();
    res.json(dashboard);
  })
);

/**
 * GET /api/guardrails/stats
 * Get violation statistics for a time period
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const stats = await guardrailMonitor.getViolationStats(startDate, endDate);
    res.json(stats);
  })
);

/**
 * POST /api/guardrails/kill-switch
 * Emergency kill switch - suspend all agents
 */
router.post(
  '/kill-switch',
  asyncHandler(async (req: Request, res: Response) => {
    // In production, add admin authentication here
    guardrailEngine.emergencyKillSwitch();
    res.json({ 
      success: true, 
      message: 'Emergency kill switch activated - all agents suspended' 
    });
  })
);

/**
 * POST /api/guardrails/circuit-breaker/:agent/reset
 * Reset circuit breaker for a specific agent
 */
router.post(
  '/circuit-breaker/:agent/reset',
  asyncHandler(async (req: Request, res: Response) => {
    const { agent } = req.params;
    guardrailEngine.resetCircuitBreaker(agent as any);
    res.json({ 
      success: true, 
      message: `Circuit breaker reset for agent: ${agent}` 
    });
  })
);

/**
 * GET /api/guardrails/permissions/:userId
 * Get user permissions
 */
router.get(
  '/permissions/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const permissions = await permissionManager.getUserPermissions(userId);
    res.json(permissions);
  })
);

/**
 * PUT /api/guardrails/permissions/:userId/tier
 * Update user tier
 */
router.put(
  '/permissions/:userId/tier',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { tier } = req.body;
    
    if (!['FREE', 'PREMIUM', 'VIP'].includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be FREE, PREMIUM, or VIP' 
      });
    }

    await permissionManager.updateUserTier(userId, tier);
    res.json({ 
      success: true, 
      message: `User tier updated to ${tier}` 
    });
  })
);

export default router;

