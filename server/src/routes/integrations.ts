/**
 * Integration Status and Health Routes
 * Provides status endpoint for judges/operators to check integration configuration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { validateAll } from '../lib/keysValidator.js';
import { callVultrInference } from '../lib/vultrClient.js';
import { textToSpeech } from '../lib/elevenlabsClient.js';

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
 * Test endpoint for Vultr inference (with mock fallback)
 */
router.post(
  '/vultr/infer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { model, messages } = req.body;
      const result = await callVultrInference({
        model: model || 'gpt-3.5-turbo',
        messages: messages || [],
        timeoutMs: 25000
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/integrations/elevenlabs/tts
 * Test endpoint for ElevenLabs TTS (with mock fallback)
 */
router.post(
  '/elevenlabs/tts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, voiceId } = req.body;
      const result = await textToSpeech({
        text: text || 'Hello demo',
        voiceId: voiceId
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
