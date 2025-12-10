/**
 * Integration Status and Health Routes
 * Provides status endpoint for judges/operators to check integration configuration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { validateAll } from '../lib/keysValidator.js';
import { callVultrInference } from '../lib/vultrClient.js';
import { textToSpeech } from '../lib/elevenlabsClient.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { tryAcquire } from '../lib/rateLimiter.js';
import { storeMemory, searchMemory, deleteMemory } from '../lib/raindropClient.js';
import { createHash } from 'crypto';

const router = Router();

/**
 * GET /api/integrations/status
 * Returns status of all integrations (keys present, validation, reachability)
 * Safe for judges/operators - does not expose keys or make billable calls
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = validateAll();
    
    // Optionally perform lightweight reachability checks (non-billing)
    // Keep them safe: GET/HEAD to docs endpoints or a HEAD request to the base URL, not inference endpoints
    const pingResults: Record<string, any> = {};
    
    // Only ping if keys present
    if (report.vultr.present && report.vultr.ok) {
      try {
        const vultrPingUrl = process.env.VULTR_INFERENCE_BASE_URL || 
          process.env.VULTR_API_ENDPOINT || 
          'https://api.vultrinference.com/v1';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(vultrPingUrl, { 
          method: 'HEAD',
          signal: controller.signal
        }).catch((e: unknown) => ({ 
          ok: false, 
          statusText: String(e) 
        }));
        clearTimeout(timeout);
        pingResults.vultr = { 
          reachable: !!r.ok, 
          status: (r as Response).status || null 
        };
      } catch (e) {
        pingResults.vultr = { 
          reachable: false, 
          error: String(e) 
        };
      }
    }
    
    if (report.eleven.present && report.eleven.ok) {
      try {
        const elevenBase = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1/voices';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(elevenBase, {
          method: 'GET',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || 
              process.env.ELEVEN_LABS_API_KEY || 
              ''
          },
          signal: controller.signal
        }).catch((e: unknown) => ({ 
          ok: false, 
          statusText: String(e) 
        }));
        clearTimeout(timeout);
        pingResults.eleven = { 
          reachable: !!(r as Response).ok, 
          status: (r as Response).status || null 
        };
      } catch (e) {
        pingResults.eleven = { 
          reachable: false, 
          error: String(e) 
        };
      }
    }
    
    // Raindrop is often SDK-only; we just report presence
    // Could add SDK initialization check if needed
    
    res.status(200).json({
      ok: true,
      report,
      pingResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/vultr/infer
 * Test endpoint for Vultr inference (with mock fallback, caching, and rate limiting)
 */
router.post(
  '/vultr/infer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate limiting
      if (!tryAcquire()) {
        return res.status(429).json({ 
          success: false, 
          message: 'Demo rate limit reached' 
        });
      }

      const { model = 'gpt-3.5-turbo', messages } = req.body || {};
      
      if (!Array.isArray(messages)) {
        return res.status(400).json({ 
          success: false, 
          message: 'messages array required' 
        });
      }

      // Check cache
      const cacheKey = 'vultr:' + createHash('sha256')
        .update(JSON.stringify({ model, messages }))
        .digest('hex');
      
      const cached = cacheGet(cacheKey);
      if (cached) {
        return res.status(200).json({ ...cached, cached: true });
      }

      // Call Vultr
      const result = await callVultrInference({
        model,
        messages,
        timeoutMs: 25000
      });

      // Cache successful responses
      if (result?.success) {
        cacheSet(cacheKey, result, 30_000); // 30 second cache
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/elevenlabs/tts
 * Test endpoint for ElevenLabs TTS (with mock fallback)
 * Note: Caching is handled internally by textToSpeech function
 */
router.post(
  '/elevenlabs/tts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, voiceId } = req.body || {};
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'text (string) required' 
        });
      }

      const result = await textToSpeech({
        text,
        voiceId: voiceId
      });
      
      // Return 200 so front-end can handle demo gracefully
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/raindrop/store-memory
 * Store memory in Raindrop SmartMemory (or mock)
 */
router.post(
  '/raindrop/store-memory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', type = 'working', text = '', metadata = {} } = req.body || {};
      
      if (!text) {
        return res.status(400).json({ 
          success: false, 
          message: 'text required' 
        });
      }

      const result = await storeMemory(userId, type, text, metadata);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/raindrop/search-memory
 * Search memories in Raindrop SmartMemory (or mock)
 */
router.post(
  '/raindrop/search-memory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', q = '', topK = 10 } = req.body || {};
      
      if (!q) {
        return res.status(400).json({ 
          success: false, 
          message: 'q required' 
        });
      }

      const result = await searchMemory(userId, q, topK);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/raindrop/delete-memory
 * Delete memory from Raindrop SmartMemory (or mock)
 */
router.post(
  '/raindrop/delete-memory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 'demo_user', id } = req.body || {};
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'id required' 
        });
      }

      const result = await deleteMemory(userId, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
