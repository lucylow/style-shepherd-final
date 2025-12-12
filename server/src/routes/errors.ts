/**
 * Error Reporting Routes
 * Handles client-side error reports
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ValidationError } from '../lib/errors.js';
import { logError } from '../lib/errorLogger.js';
import { z } from 'zod';

const router = Router();

const errorReportSchema = z.object({
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }),
  context: z.object({
    component: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  timestamp: z.string(),
  url: z.string(),
  userAgent: z.string(),
});

/**
 * POST /api/errors/report
 * Receives error reports from client
 */
router.post(
  '/report',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = errorReportSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid error report format', {
        validationErrors: validationResult.error.errors,
      });
    }

    const report = validationResult.data;

    // Create error object for logging
    const error = new Error(report.error.message);
    error.name = report.error.name;
    error.stack = report.error.stack;

    // Log error with context
    logError(error, req, {
      errorReport: {
        context: report.context,
        url: report.url,
        userAgent: report.userAgent,
        timestamp: report.timestamp,
      },
    });

    // TODO: Send to external error tracking service (e.g., Sentry, DataDog)
    // if (process.env.ERROR_TRACKING_DSN) {
    //   await sendToErrorTrackingService(report);
    // }

    res.json({ success: true, message: 'Error reported' });
  })
);

export default router;

