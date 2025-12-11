/**
 * Personalization API Routes
 * Endpoints for personalized recommendations and data portability
 */

import { Router, Request, Response, NextFunction } from 'express';
import { personalizedRecommendations } from '../lib/personalization/index.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';
import { vultrPostgres } from '../lib/vultr-postgres.js';

const router = Router();

/**
 * POST /api/personalize/recommend
 * Get personalized product recommendations
 */
router.post(
  '/recommend',
  validateBody(
    z.object({
      query: z.string().optional(),
      intent: z.string().optional(),
      occasion: z.string().optional(),
      budget: z.number().positive().optional(),
      userId: z.string().min(1, 'User ID is required'),
      topK: z.number().int().positive().max(100).optional(),
      rerankTop: z.number().int().positive().max(50).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, intent, occasion, budget, userId, topK, rerankTop } = req.body;

      const recs = await personalizedRecommendations(
        userId,
        { query, intent, occasion, budget, userId },
        { topK, rerankTop }
      );

      res.json({ success: true, items: recs, count: recs.length });
    } catch (error: any) {
      console.error('Personalization recommend error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/export/user-data
 * Export user data for portability (GDPR-style)
 */
router.get(
  '/export/user-data',
  validateQuery(
    z.object({
      userId: z.string().min(1, 'User ID is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.query;

      // Fetch user profile
      const profileResult = await vultrPostgres.query(
        `SELECT id, email, preferences, size, budget, created_at, updated_at 
         FROM users WHERE id = $1`,
        [userId]
      );
      const profile = profileResult.rows[0] || null;

      // Fetch preferences
      const prefsResult = await vultrPostgres.query(
        `SELECT key, value, created_at FROM preferences WHERE user_id = $1`,
        [userId]
      ).catch(() => ({ rows: [] }));
      const preferences = prefsResult.rows || [];

      // Fetch interactions
      const interactionsResult = await vultrPostgres.query(
        `SELECT product_id, type, value, metadata, created_at 
         FROM interactions WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      ).catch(() => ({ rows: [] }));
      const interactions = interactionsResult.rows || [];

      // Fetch orders (if orders table exists)
      const ordersResult = await vultrPostgres.query(
        `SELECT id, items, total, status, created_at, updated_at 
         FROM orders WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      ).catch(() => ({ rows: [] }));
      const orders = ordersResult.rows || [];

      const payload = {
        exportedAt: new Date().toISOString(),
        userId,
        profile,
        preferences,
        interactions,
        orders,
      };

      res.setHeader('Content-Disposition', `attachment; filename="style-shepherd-${userId}-export.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(payload);
    } catch (error: any) {
      console.error('Export user data error:', error);
      next(error);
    }
  }
);

/**
 * DELETE /api/export/user-data
 * Delete user data (GDPR right to be forgotten)
 */
router.delete(
  '/export/user-data',
  validateQuery(
    z.object({
      userId: z.string().min(1, 'User ID is required'),
      confirm: z.string().optional(), // Require explicit confirmation
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, confirm } = req.query;

      if (confirm !== 'true') {
        return res.status(400).json({
          success: false,
          error: 'Deletion requires explicit confirmation. Add ?confirm=true to the URL',
        });
      }

      // Delete user data (soft delete or hard delete based on policy)
      // For GDPR compliance, we'll anonymize rather than hard delete in some cases

      // Delete preferences
      await vultrPostgres.query(`DELETE FROM preferences WHERE user_id = $1`, [userId]).catch(() => {});

      // Anonymize interactions (keep for analytics but remove PII)
      await vultrPostgres.query(
        `UPDATE interactions SET user_id = NULL, metadata = jsonb_set(metadata, '{anonymized}', 'true') WHERE user_id = $1`,
        [userId]
      ).catch(() => {});

      // Anonymize user profile
      await vultrPostgres.query(
        `UPDATE users SET email = NULL, preferences = NULL WHERE id = $1`,
        [userId]
      ).catch(() => {});

      // Log deletion for audit
      await vultrPostgres.query(
        `INSERT INTO audit_log (action, user_id, metadata, created_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        ['user_data_deleted', userId, JSON.stringify({ timestamp: new Date().toISOString() })]
      ).catch(() => {});

      res.json({
        success: true,
        message: 'User data deleted successfully',
        deletedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Delete user data error:', error);
      next(error);
    }
  }
);

export default router;
