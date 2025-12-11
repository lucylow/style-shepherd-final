/**
 * Fraud Detection Middleware
 * Runs fraud checks on checkout/payment requests
 */

import { Request, Response, NextFunction } from 'express';
import {
  runFraudChecks,
  saveFraudIncident,
  getUserRiskProfile,
  FraudContext,
} from '../services/FraudDetector.js';
// Express type extensions are automatically picked up from src/types/express.d.ts

/**
 * Fraud detection middleware
 * Extracts context from request and runs fraud checks
 */
export async function fraudMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract context from request
    const userId = (req as any).user?.id || req.body?.userId || null;
    const email = (req as any).user?.email || req.body?.email || null;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.socket.remoteAddress as string) ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Get user risk profile if userId exists
    let userReturnRate: number | undefined;
    let chargebackCount: number | undefined;

    if (userId) {
      const riskProfile = await getUserRiskProfile(userId);
      if (riskProfile) {
        userReturnRate = riskProfile.avgReturnRate;
        chargebackCount = riskProfile.chargebackCount;
      }
    }

    // Build fraud context
    const context: FraudContext = {
      userId,
      email,
      ip,
      userAgent,
      billingAddress: req.body?.billingAddress || req.body?.billing,
      shippingAddress: req.body?.shippingAddress || req.body?.shipping,
      amount: req.body?.amountCents || req.body?.totalAmount
        ? Math.round((req.body?.totalAmount || 0) * 100)
        : undefined,
      currency: req.body?.currency || 'usd',
      cardBin:
        req.body?.cardBin ||
        (req.body?.cardNumber && req.body.cardNumber.slice(0, 6)),
      estimatedReturnProb: req.body?.estimatedReturnProb || 0.0,
      userReturnRate,
      chargebackCount,
      brandTrustScore: req.body?.brandTrustScore || 0.5,
      action: req.originalUrl || req.url || 'checkout',
    };

    // Run fraud checks
    const incident = await runFraudChecks(context);

    // Persist incident for audit
    await saveFraudIncident(incident);

    // If high-risk, block or challenge
    if (incident.decision === 'deny') {
      res.status(403).json({
        success: false,
        reason: 'denied_fraud',
        incidentId: incident.id,
        score: incident.score,
        message: 'Transaction declined due to fraud risk',
      });
      return;
    } else if (incident.decision === 'manual_review') {
      // Allow but flag for review
      // You can queue this for manual review or send alert
      console.warn('⚠️ Manual review required:', {
        incidentId: incident.id,
        score: incident.score,
        userId,
      });
      // Continue but attach incident to request
      req.fraudIncident = incident;
      return next();
    }

    // Allow - attach incident to request for logging
    req.fraudIncident = incident;
    // Add incidentId to request body so payment service can include it in metadata
    if (req.body) {
      req.body.incidentId = incident.id;
    }
    return next();
  } catch (err: any) {
    console.error('Fraud middleware error:', err);
    // Fail safe: if middleware fails, allow through but log
    // In production, you might want to be more strict
    return next();
  }
}

/**
 * Optional: Fraud check for specific actions (e.g., autonomous payments)
 */
export async function fraudCheckForAction(
  context: FraudContext
): Promise<{ allowed: boolean; incident: any }> {
  const incident = await runFraudChecks(context);
  await saveFraudIncident(incident);

  return {
    allowed: incident.decision !== 'deny',
    incident,
  };
}
