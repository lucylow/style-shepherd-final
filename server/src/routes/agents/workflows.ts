/**
 * Workflow API Routes
 * Handles multi-agent workflow orchestration
 */

import express from 'express';
import { multiAgentWorkflow, type ShoppingIntent } from '../services/agents/workflow-engine.js';
import { supabaseWorkflowService } from '../lib/supabase-client.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ExternalServiceError } from '../lib/errors.js';

const router = express.Router();

/**
 * POST /api/workflows/start
 * Start a new multi-agent shopping workflow
 */
router.post(
  '/start',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const intent: ShoppingIntent = {
      userId: req.body.userId || req.body.user_id,
      budget: req.body.budget,
      occasion: req.body.occasion,
      style: req.body.style,
      preferences: req.body.preferences,
      selfieUrl: req.body.selfieUrl || req.body.selfie_url,
      skinTone: req.body.skinTone || req.body.skin_tone,
      measurements: req.body.measurements,
    };

    if (!intent.userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    try {
      // Execute workflow (this is async and will continue in background)
      const recommendation = await multiAgentWorkflow.execute(intent);

      res.json({
        success: true,
        workflowId: recommendation.workflowId,
        recommendation,
      });
    } catch (error) {
      const appError = error instanceof ExternalServiceError
        ? error
        : new ExternalServiceError('WorkflowAPI', 'Failed to start workflow', error as Error);

      res.status(500).json({
        error: appError.message,
        details: appError.details,
      });
    }
  })
);

/**
 * GET /api/workflows/:workflowId
 * Get workflow status and results
 */
router.get(
  '/:workflowId',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { workflowId } = req.params;

    try {
      const workflow = await supabaseWorkflowService.getWorkflow(workflowId);

      if (!workflow) {
        return res.status(404).json({
          error: 'Workflow not found',
        });
      }

      // Get agent messages
      const messages = await supabaseWorkflowService.getAgentMessages(workflowId);

      res.json({
        workflow,
        messages,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get workflow',
      });
    }
  })
);

/**
 * GET /api/workflows/:workflowId/status
 * Get workflow status only
 */
router.get(
  '/:workflowId/status',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { workflowId } = req.params;

    try {
      const workflow = await supabaseWorkflowService.getWorkflow(workflowId);

      if (!workflow) {
        return res.status(404).json({
          error: 'Workflow not found',
        });
      }

      res.json({
        workflowId: workflow.id,
        status: workflow.status,
        currentStage: workflow.current_stage,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        completedAt: workflow.completed_at,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get workflow status',
      });
    }
  })
);

/**
 * GET /api/workflows/:workflowId/messages
 * Get agent messages for a workflow
 */
router.get(
  '/:workflowId/messages',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { workflowId } = req.params;
    const { agentType } = req.query;

    try {
      const messages = await supabaseWorkflowService.getAgentMessages(
        workflowId,
        agentType as any
      );

      res.json({
        messages,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get messages',
      });
    }
  })
);

/**
 * POST /api/workflows/:workflowId/cancel
 * Cancel a running workflow
 */
router.post(
  '/:workflowId/cancel',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { workflowId } = req.params;

    try {
      await supabaseWorkflowService.updateWorkflowStatus(workflowId, 'cancelled');

      res.json({
        success: true,
        message: 'Workflow cancelled',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to cancel workflow',
      });
    }
  })
);

/**
 * GET /api/workflows/user/:userId
 * Get all workflows for a user
 */
router.get(
  '/user/:userId',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    const { limit = '10', offset = '0' } = req.query;

    try {
      // Note: This would require a new method in supabaseWorkflowService
      // For now, we'll return a message indicating this needs to be implemented
      res.json({
        message: 'User workflow list endpoint - to be implemented',
        userId,
        limit,
        offset,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get user workflows',
      });
    }
  })
);

export default router;

