/**
 * Admin API Routes
 * Provider management and metrics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import providerRegistry from '../lib/providerRegistry.js';
import { OpenAIAdapter } from '../lib/llm/openaiAdapter.js';
import { OpenAIEmbeddingsAdapter } from '../lib/embeddings/openaiEmbeddings.js';
import { ElevenLabsAdapter } from '../lib/tts/elevenlabsAdapter.js';
import { PostgresVectorDBAdapter } from '../lib/vectordb/postgresAdapter.js';
import { MemoryVectorDBAdapter } from '../lib/vectordb/memoryAdapter.js';
import env from '../config/env.js';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation.js';

const router = Router();

// Simple admin token check (replace with proper auth in production)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminToken = process.env.ADMIN_TOKEN || '';
  const header = req.headers['x-admin-token'] || (req.query?.adminToken as string);

  if (!adminToken || header !== adminToken) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }
  next();
}

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * GET /api/admin/providers
 * List all registered providers
 */
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = providerRegistry.getAllProviders();
    res.json({ success: true, providers });
  } catch (error: any) {
    console.error('Admin providers list error:', error);
    next(error);
  }
});

/**
 * POST /api/admin/providers
 * Register a new provider
 */
router.post(
  '/providers',
  validateBody(
    z.object({
      type: z.enum(['openai-llm', 'openai-emb', 'elevenlabs', 'postgres-vectordb', 'memory-vectordb']),
      config: z.record(z.any()),
      priority: z.number().int().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, config, priority } = req.body;
      let adapter: any;

      switch (type) {
        case 'openai-llm':
          if (!config.apiKey) {
            return res.status(400).json({ success: false, error: 'apiKey required for OpenAI LLM' });
          }
          adapter = new OpenAIAdapter(config.apiKey, { priority });
          break;

        case 'openai-emb':
          if (!config.apiKey) {
            return res.status(400).json({ success: false, error: 'apiKey required for OpenAI embeddings' });
          }
          adapter = new OpenAIEmbeddingsAdapter(config.apiKey, {
            model: config.model,
            priority,
          });
          break;

        case 'elevenlabs':
          if (!config.apiKey) {
            return res.status(400).json({ success: false, error: 'apiKey required for ElevenLabs' });
          }
          adapter = new ElevenLabsAdapter(config.apiKey, {
            voiceId: config.voiceId,
            priority,
          });
          break;

        case 'postgres-vectordb':
          adapter = new PostgresVectorDBAdapter({
            tableName: config.tableName,
            priority,
          });
          break;

        case 'memory-vectordb':
          adapter = new MemoryVectorDBAdapter({ priority });
          break;

        default:
          return res.status(400).json({ success: false, error: `Unknown provider type: ${type}` });
      }

      providerRegistry.register(adapter);
      res.json({ success: true, provider: adapter.meta });
    } catch (error: any) {
      console.error('Admin provider registration error:', error);
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/providers
 * Unregister a provider
 */
router.delete(
  '/providers',
  validateBody(
    z.object({
      kind: z.enum(['llm', 'embeddings', 'tts', 'vectordb']),
      id: z.string().min(1),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kind, id } = req.body;
      const deleted = providerRegistry.unregister(kind, id);
      res.json({ success: deleted, message: deleted ? 'Provider unregistered' : 'Provider not found' });
    } catch (error: any) {
      console.error('Admin provider unregister error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/admin/metrics
 * Get provider metrics (simplified - extend with real metrics collection)
 */
router.get('/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In production, this would query a metrics store (Prometheus, Datadog, etc.)
    // For now, return basic provider status
    const providers = providerRegistry.getAllProviders();
    const metrics: Record<string, any> = {};

    // Simple metrics - in production, track actual usage
    Object.values(providers).flat().forEach((p) => {
      metrics[p.id] = {
        enabled: p.enabled !== false,
        priority: p.priority || 50,
        lastChecked: new Date().toISOString(),
        // Add real metrics: successCount, errorCount, avgLatency, etc.
      };
    });

    res.json({ success: true, metrics });
  } catch (error: any) {
    console.error('Admin metrics error:', error);
    next(error);
  }
});

export default router;
