/**
 * Trend Analysis API Routes
 * POST /api/functions/v1/trend-analysis
 * GET /api/functions/trends - Google Trends integration
 * GET /api/functions/mock-trends - Curated mock trends
 * GET /api/functions/clusters - Fashion-MNIST clusters
 * GET /api/functions/combined - Combined trends + clusters
 * GET /api/functions/demo-recommendations - Demo product recommendations
 */

import { Router, Request, Response } from 'express';
import {
  generateMarketTrends,
  computeTrendScores,
  forecastSeries,
  mockClassifyImage,
  generateRecommendations,
} from '../lib/trendUtils.js';
import { trendService } from '../services/TrendService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

const trendAnalysisSchema = z.object({
  region: z.string().optional(),
  city: z.string().optional().nullable(),
  category: z.string().optional(),
  timeframeMonths: z.number().int().positive().max(24).optional(),
  userProfile: z
    .object({
      preferences: z.array(z.string()).optional(),
      size: z.string().optional(),
      pastPurchases: z.array(z.any()).optional(),
    })
    .optional()
    .nullable(),
  sampleImage: z.string().optional().nullable(),
});

router.post(
  '/v1/trend-analysis',
  validateBody(trendAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body;
    const region = body.region || 'Global';
    const city = body.city || null;
    const category = body.category || 'apparel';
    const timeframeMonths = Number(body.timeframeMonths || 6);
    const userProfile = body.userProfile || null;
    const includeMockImageAnalysis = !!body.sampleImage;

    // Generate or fetch mock trend data for the requested scope
    const trends = generateMarketTrends({
      region,
      city,
      category,
      months: timeframeMonths,
    });

    // Compute scores and rank top attributes
    const topColors = computeTrendScores(trends.colors);
    const topStyles = computeTrendScores(trends.styles);
    const topFabrics = computeTrendScores(trends.fabrics);

    // Forecast for top styles: simple extrapolation using linear fit
    const styleForecasts: Record<
      string,
      Array<{ month: string; predicted: number }>
    > = {};
    for (const s of topStyles.slice(0, 6)) {
      const hist = trends.styleHistory[s.name] || s.history || [];
      styleForecasts[s.name] = forecastSeries(hist, 3); // predict 3 future months
    }

    // Personalized "Trends For You" filtering (simple)
    let personalized: {
      perspective: string;
      topStyles: Array<{ name: string; score: number }>;
      topColors: Array<{ name: string; score: number }>;
    } | null = null;

    if (userProfile && Array.isArray(userProfile.preferences)) {
      const prefs = userProfile.preferences;
      personalized = {
        perspective: 'personalized',
        topStyles: topStyles
          .filter((t: { name: string; score: number }) =>
            prefs.some((p: string) =>
              t.name.toLowerCase().includes(p.toLowerCase())
            )
          )
          .slice(0, 6),
        topColors: topColors
          .filter((c: { name: string; score: number }) =>
            prefs.some((p: string) =>
              c.name.toLowerCase().includes(p.toLowerCase())
            )
          )
          .slice(0, 6),
      };
    }

    // Optionally simulate image classification (fake)
    let imageAnalysis = null;
    if (includeMockImageAnalysis) {
      imageAnalysis = mockClassifyImage(body.sampleImage, { region, category });
    }

    // Compose recommendations
    const recommendations = generateRecommendations({
      topStyles,
      topColors,
      topFabrics,
      userProfile,
      category,
    });

    const response = {
      success: true,
      meta: {
        region,
        city,
        category,
        generatedAt: new Date().toISOString(),
        timeframeMonths,
      },
      summary: {
        headline: `Top trends for ${city ? city + ', ' : ''}${region} — ${category}`,
        insight: `Detected ${topStyles.length} prominent style signals. Showing top colors, fabrics and short forecasts.`,
      },
      data: {
        topColors,
        topStyles,
        topFabrics,
        styleForecasts,
        timeSeries: trends, // full generated time-series for charts (colors/styles/fabrics history)
        personalized,
        imageAnalysis,
      },
      recommendations,
    };

    return res.status(200).json(response);
  })
);

/**
 * GET /api/functions/trends
 * Get trend scores for keywords using Google Trends (or mock fallback)
 */
router.get(
  '/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const keywords = req.query.keywords as string;
    const timeframe = (req.query.timeframe as string) || 'today 12-m';

    if (!keywords) {
      return res.status(400).json({
        error: 'keywords query parameter is required (comma-separated)',
      });
    }

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keywordList.length === 0) {
      return res.status(400).json({
        error: 'At least one valid keyword is required',
      });
    }

    try {
      // Check if trend service is available
      const isAvailable = await trendService.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({
          error: 'Trend service is not available',
          message: 'The Python trend service is not running. Please start it with: cd server/trend-service && uvicorn trend_service:app --port 8000',
        });
      }

      const result = await trendService.getTrends(keywordList, timeframe);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to fetch trends',
        message: error.message,
      });
    }
  })
);

/**
 * GET /api/functions/mock-trends
 * Get curated mock trends (useful for demos)
 */
router.get(
  '/mock-trends',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const isAvailable = await trendService.isAvailable();
      if (!isAvailable) {
        // Return a fallback mock response if service is unavailable
        return res.status(200).json({
          generated_at: new Date().toISOString(),
          trends: [
            { category: 'linen', score: 0.92, note: 'Rising in searches across Europe; summer staple' },
            { category: 'oversized-blazer', score: 0.79, note: 'High engagement on social platforms' },
            { category: 'pastel-denim', score: 0.66, note: 'Niche but rapidly growing' },
            { category: 'sustainable-fabrics', score: 0.87, note: 'Brands pushing eco-friendly collections' },
            { category: 'athleisure', score: 0.58, note: 'Stable interest; high conversion rates' },
          ],
        });
      }

      const result = await trendService.getMockTrends();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to fetch mock trends',
        message: error.message,
      });
    }
  })
);

/**
 * GET /api/functions/clusters
 * Get Fashion-MNIST clusters
 */
router.get(
  '/clusters',
  asyncHandler(async (req: Request, res: Response) => {
    const nClusters = parseInt(req.query.n_clusters as string) || 8;
    const sampleLimit = parseInt(req.query.sample_limit as string) || 5000;

    try {
      const isAvailable = await trendService.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({
          error: 'Trend service is not available',
          message: 'The Python trend service is not running.',
        });
      }

      const result = await trendService.getClusters(nClusters, sampleLimit);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to fetch clusters',
        message: error.message,
      });
    }
  })
);

/**
 * GET /api/functions/combined
 * Get combined trends and clusters
 */
router.get(
  '/combined',
  asyncHandler(async (req: Request, res: Response) => {
    const keywords = req.query.keywords as string;
    const nClusters = parseInt(req.query.n_clusters as string) || 8;

    try {
      const isAvailable = await trendService.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({
          error: 'Trend service is not available',
          message: 'The Python trend service is not running.',
        });
      }

      const keywordList = keywords
        ? keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : undefined;

      const result = await trendService.getCombined(keywordList, nClusters);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to fetch combined trends',
        message: error.message,
      });
    }
  })
);

/**
 * GET /api/functions/demo-recommendations
 * Get demo product recommendations based on trends
 */
router.get(
  '/demo-recommendations',
  asyncHandler(async (req: Request, res: Response) => {
    const keywords = req.query.keywords as string;
    const limit = parseInt(req.query.limit as string) || 5;

    try {
      const isAvailable = await trendService.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({
          error: 'Trend service is not available',
          message: 'The Python trend service is not running.',
        });
      }

      const keywordList = keywords
        ? keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : undefined;

      const result = await trendService.getDemoRecommendations(keywordList, limit);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to fetch demo recommendations',
        message: error.message,
      });
    }
  })
);

export default router;
