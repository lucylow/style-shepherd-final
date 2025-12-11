/**
 * Raindrop Memory API Routes
 * Server-side endpoints for AI Memory management
 * Uses server-side raindropClient with file-based mock fallback
 */

import { Router, Request, Response, NextFunction } from 'express';
import { initRaindrop, storeMemory, searchMemory, deleteMemory, updateMemory } from '../lib/raindropClient.js';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation.js';

const router = Router();

// Initialize Raindrop on module load
initRaindrop().catch((err) => {
  console.warn('Raindrop initialization error (will use mock mode):', err);
});

/**
 * POST /api/raindrop/store-memory
 * Store a new memory entry
 */
router.post(
  '/store-memory',
  validateBody(
    z.object({
      userId: z.string().default('demo_user'),
      type: z.string().default('working'),
      text: z.string().min(1, 'Text is required'),
      metadata: z.record(z.any()).optional().default({}),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', type = 'working', text, metadata = {} } = req.body;
      
      const result = await storeMemory(userId, type, text, metadata);
      
      // Normalize response format
      if (result.source === 'raindrop') {
        return res.status(200).json({
          success: true,
          source: 'raindrop',
          resp: result.resp,
          results: result.resp ? [result.resp] : [],
        });
      } else {
        return res.status(200).json({
          success: true,
          source: 'mock',
          entry: result.entry,
          results: result.entry ? [result.entry] : [],
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/raindrop/search-memory
 * Search memories for a user
 */
router.post(
  '/search-memory',
  validateBody(
    z.object({
      userId: z.string().default('demo_user'),
      q: z.string().default(''),
      topK: z.number().int().positive().max(10000).default(20),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', q = '', topK = 20 } = req.body;
      
      const result = await searchMemory(userId, q, topK);
      
      // Normalize response format
      if (result.source === 'raindrop') {
        // Raindrop SDK response format
        const results = result.resp?.results || result.resp || [];
        return res.status(200).json({
          success: true,
          source: 'raindrop',
          resp: result.resp,
          results: Array.isArray(results) ? results : [],
        });
      } else {
        // Mock response format
        return res.status(200).json({
          success: true,
          source: 'mock',
          results: result.results || [],
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/raindrop/delete-memory
 * Delete a memory entry
 */
router.post(
  '/delete-memory',
  validateBody(
    z.object({
      userId: z.string().default('demo_user'),
      id: z.string().min(1, 'Memory ID is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'id required' });
      }
      
      const result = await deleteMemory(userId, id);
      
      return res.status(200).json({
        success: result.success,
        source: result.source,
        deleted: result.deleted || 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/raindrop/export-memory
 * Export all memories for a user as JSON
 */
router.get(
  '/export-memory',
  validateQuery(
    z.object({
      userId: z.string().default('demo_user'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.query.userId as string) || 'demo_user';
      
      // Fetch all memories (large topK)
      const result = await searchMemory(userId, '', 10000);
      
      // Normalize results
      let results: any[] = [];
      if (result.source === 'raindrop') {
        results = result.resp?.results || result.resp || [];
        if (!Array.isArray(results)) {
          results = [];
        }
      } else {
        results = result.results || [];
      }
      
      const payload = {
        exportedAt: new Date().toISOString(),
        userId,
        count: results.length,
        memories: results,
      };
      
      const json = JSON.stringify(payload, null, 2);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="style-shepherd-memories-${userId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json"`
      );
      res.status(200).send(json);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/raindrop/clear-memory
 * Clear all memories for a user (iterates and deletes each)
 */
router.post(
  '/clear-memory',
  validateBody(
    z.object({
      userId: z.string().default('demo_user'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user' } = req.body;
      
      // Fetch all memories
      const result = await searchMemory(userId, '', 10000);
      
      // Normalize results
      let items: any[] = [];
      if (result.source === 'raindrop') {
        items = result.resp?.results || result.resp || [];
        if (!Array.isArray(items)) {
          items = [];
        }
      } else {
        items = result.results || [];
      }
      
      // Delete each one
      let deleted = 0;
      for (const it of items) {
        const id = it.id || it?.resp?.id;
        if (!id) continue;
        
        try {
          await deleteMemory(userId, id);
          deleted++;
        } catch (e) {
          console.warn('deleteMemory failed for', id, e);
        }
      }
      
      return res.status(200).json({
        success: true,
        deleted,
        total: items.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/raindrop/batch-store-memory
 * Store multiple memories at once
 */
router.post(
  '/batch-store-memory',
  validateBody(
    z.object({
      memories: z.array(
        z.object({
          userId: z.string().default('demo_user'),
          type: z.string().default('working'),
          text: z.string().min(1),
          metadata: z.record(z.any()).optional().default({}),
        })
      ).min(1).max(100),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memories } = req.body;
      const { batchStoreMemory } = await import('../lib/raindropClient.js');
      const results = await batchStoreMemory(memories);
      res.status(200).json({ success: true, results });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/raindrop/update-memory
 * Update a memory entry
 */
router.post(
  '/update-memory',
  validateBody(
    z.object({
      userId: z.string().default('demo_user'),
      id: z.string().min(1, 'Memory ID is required'),
      text: z.string().min(1, 'Text is required'),
      type: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', id, text, type, metadata } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'id required' });
      }
      
      const result = await updateMemory(userId, id, text, type, metadata);
      
      if (!result.success) {
        return res.status(404).json({ success: false, message: 'Memory not found' });
      }
      
      return res.status(200).json({
        success: true,
        source: result.source,
        entry: result.entry,
        resp: result.resp,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/raindrop/memory-stats
 * Get memory statistics for a user
 */
router.get(
  '/memory-stats',
  validateQuery(
    z.object({
      userId: z.string().default('demo_user'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.query.userId as string) || 'demo_user';
      const { getMemoryStats } = await import('../lib/raindropClient.js');
      const stats = await getMemoryStats(userId);
      res.status(200).json({ success: true, stats });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

