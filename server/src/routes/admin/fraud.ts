/**
 * Fraud Detection Routes
 * Handles fraud detection and prevention endpoints
 */

import { Router, Request, Response } from 'express';
import { fraudMiddleware } from '../middleware/fraudMiddleware.js';

const router = Router();

// Fraud detection endpoint
router.post('/detect', fraudMiddleware, async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Fraud check passed' });
});

export default router;

