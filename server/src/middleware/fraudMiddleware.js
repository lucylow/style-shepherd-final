// middleware/fraudMiddleware.js
// Use this middleware in checkout or any action that needs fraud screening.

const { runChecks } = require('../lib/fraudDetector.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fraudMiddleware(req, res, next) {
  try {
    const ipHeader = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '').toString();
    const ip = ipHeader.split(',')[0].trim();
    const ctx = {
      userId: req.session?.user?.id || null,
      email: req.session?.user?.email || req.body?.email,
      ip,
      userAgent: req.headers['user-agent'],
      billingAddress: req.body?.billingAddress,
      shippingAddress: req.body?.shippingAddress,
      amount: req.body?.amountCents || req.body?.amount || 0,
      cardBin: req.body?.cardBin || (req.body?.cardNumber ? String(req.body.cardNumber).slice(0, 6) : undefined),
      estimatedReturnProb: req.body?.estimatedReturnProb || 0.0,
      action: req.originalUrl || req.url || 'checkout'
    };

    const incident = await runChecks(ctx);

    await prisma.fraudIncident.create({
      data: {
        id: incident.id,
        userId: incident.userId,
        userEmail: incident.userEmail,
        userIp: incident.userIp,
        userAgent: incident.userAgent,
        action: incident.action,
        amount: incident.amount,
        currency: incident.currency,
        score: incident.score,
        modelScore: incident.modelScore,
        ruleScores: incident.ruleScores,
        rulesFired: incident.rulesFired,
        decision: incident.decision,
        notes: 'Auto-created by fraudMiddleware'
      }
    });

    if (incident.decision === 'deny') {
      return res.status(403).json({ success: false, reason: 'denied_fraud', incidentId: incident.id, score: incident.score });
    } else if (incident.decision === 'manual_review') {
      return res.status(202).json({ success: true, reason: 'manual_review', incidentId: incident.id, score: incident.score });
    }

    // pass incident to downstream handler
    req.fraudIncident = incident;
    return next();
  } catch (err) {
    console.error('fraudMiddleware error', err);
    // fail-open: allow request through but log error for investigation
    return next();
  }
}

module.exports = fraudMiddleware;
