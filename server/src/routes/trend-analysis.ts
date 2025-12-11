/**
 * Trend Analysis API Routes
 * POST /api/functions/v1/trend-analysis
 */

import { Router, Request, Response } from 'express';
import {
  generateMarketTrends,
  computeTrendScores,
  forecastSeries,
  mockClassifyImage,
  generateRecommendations,
} from '../lib/trendUtils.js';
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
          .filter((t) =>
            prefs.some((p) =>
              t.name.toLowerCase().includes(p.toLowerCase())
            )
          )
          .slice(0, 6),
        topColors: topColors
          .filter((c) =>
            prefs.some((p) =>
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

export default router;
