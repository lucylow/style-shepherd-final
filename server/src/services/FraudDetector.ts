/**
 * Fraud Detection Service
 * Implements deterministic rule engine with optional ML model support
 */

import crypto from 'crypto';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import env from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRAUD_SCORE_THRESHOLD = Number(process.env.FRAUD_SCORE_THRESHOLD || 0.65);
const FRAUD_FLAG_THRESHOLD = Number(process.env.FRAUD_FLAG_THRESHOLD || 0.45);
const MODEL_PATH = process.env.FRAUD_MODEL_PATH || path.join(process.cwd(), 'model_fraud.json');
const ALPHA = Number(process.env.FRAUD_MODEL_ALPHA || 0.5); // weight for heuristic score

// Load optional ML model
interface FraudModel {
  feature_names: string[];
  means: number[];
  stds: number[];
  coefs: number[];
  intercept: number;
}

let MODEL: FraudModel | null = null;

try {
  if (fs.existsSync(MODEL_PATH)) {
    const modelData = fs.readFileSync(MODEL_PATH, 'utf-8');
    MODEL = JSON.parse(modelData);
    console.log('✅ Loaded fraud model from', MODEL_PATH);
  }
} catch (e: any) {
  console.warn('⚠️ Failed to load fraud model:', e.message);
}

// Types
export interface FraudContext {
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  billingAddress?: {
    country?: string;
    [key: string]: any;
  };
  shippingAddress?: {
    country?: string;
    [key: string]: any;
  };
  amount?: number; // in cents
  currency?: string;
  cardBin?: string;
  action?: string;
  estimatedReturnProb?: number;
  userReturnRate?: number;
  chargebackCount?: number;
  brandTrustScore?: number;
}

export interface RuleResult {
  score: number;
  count?: number;
  limit?: number;
  reason?: string;
  [key: string]: any;
}

export interface FraudIncident {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userIp?: string | null;
  userAgent?: string | null;
  action: string;
  amount?: number | null;
  currency: string;
  score: number;
  modelScore?: number | null;
  ruleScores: Record<string, RuleResult>;
  rulesFired: string[];
  decision: 'allow' | 'challenge' | 'deny' | 'manual_review';
  createdAt: string;
}

// Utility functions
function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Velocity check: number of actions in time window (per IP / per user)
 * Uses Redis counters with TTL
 */
async function velocityCheck(params: {
  key: string;
  windowSeconds?: number;
  limit?: number;
}): Promise<RuleResult> {
  const { key, windowSeconds = 60, limit = 5 } = params;
  const ttl = windowSeconds;

  try {
    const val = await vultrValkey.incr(key);
    if (val === 1) {
      await vultrValkey.expire(key, ttl);
    }
    const score = Math.min(1, Math.max(0, (val - limit) / limit)); // 0..1
    return { count: val, score, limit };
  } catch (error) {
    // If Redis fails, return safe default
    console.warn('Velocity check failed, defaulting to safe score:', error);
    return { count: 0, score: 0, limit };
  }
}

/**
 * Shipping/billing mismatch: different country between billing and shipping
 */
function shippingBillingMismatch(params: {
  billingAddress?: { country?: string };
  shippingAddress?: { country?: string };
}): RuleResult {
  const { billingAddress, shippingAddress } = params;
  if (!billingAddress || !shippingAddress) {
    return { score: 0, reason: 'missing' };
  }

  const mismatch =
    (billingAddress.country || '').toLowerCase() !==
    (shippingAddress.country || '').toLowerCase();
  return {
    score: mismatch ? 0.9 : 0.0,
    reason: mismatch ? 'country_mismatch' : 'ok',
  };
}

/**
 * Email risk checks simple heuristics (free domain, disposable detection)
 */
function emailRisk(email?: string): RuleResult {
  if (!email) return { score: 0.0, reason: 'missing' };

  const domain = email.split('@').pop()?.toLowerCase() || '';
  const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const disposablePatterns = [
    'mailinator',
    '10minutemail',
    'maildrop',
    'tempmail',
    'guerrillamail',
  ];

  const isFree = freeDomains.includes(domain);
  const isDisposable = disposablePatterns.some((p) => domain.includes(p));

  let score = 0;
  if (isDisposable) score = 0.9;
  else if (isFree) score = 0.1;

  return { score, domain, isFree, isDisposable };
}

/**
 * IP risk: geo mismatch, ASN/proxy detection
 */
async function ipRisk(ip?: string): Promise<RuleResult> {
  if (!ip) return { score: 0, reason: 'no_ip' };

  // Private/localhost => safe
  if (
    ip.startsWith('127.') ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.')
  ) {
    return { score: 0.0, reason: 'private' };
  }

  // Optional: call ipinfo if token provided
  const token = process.env.IPINFO_TOKEN;
  if (!token) {
    return { score: 0.05, reason: 'no_lookup' }; // small risk default
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://ipinfo.io/${ip}/json?token=${token}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!res.ok) return { score: 0.1, reason: 'ipinfo_failed' };

    const j = await res.json() as { org?: string; country?: string };
    const proxy =
      j.org &&
      /amazon|digitalocean|linode|vultr|google|azure|aws/i.test(j.org);

    return {
      score: proxy ? 0.8 : 0.05,
      asn: j.org,
      country: j.country,
      reason: proxy ? 'datacenter' : 'ok',
    };
  } catch (e: any) {
    return { score: 0.1, reason: 'ipinfo_error' };
  }
}

/**
 * Payment pattern risk: BIN country mismatch, high amount, etc.
 */
async function paymentPatternRisk(params: {
  cardBin?: string;
  billingCountry?: string;
  amountCents?: number;
}): Promise<RuleResult> {
  const { cardBin, billingCountry, amountCents } = params;
  if (!cardBin) return { score: 0, reason: 'no_bin' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`https://lookup.binlist.net/${cardBin}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return { score: 0.1, reason: 'bin_failed' };

    const j = await res.json() as { country?: { alpha2?: string } };
    const country = j.country && j.country.alpha2;
    const mismatch =
      country &&
      billingCountry &&
      country.toLowerCase() !== billingCountry.toLowerCase();

    let score = mismatch ? 0.8 : 0.05;

    // High amount increases score linearly
    const amount = Number(amountCents || 0) / 100.0;
    if (amount > 500) score = Math.min(1, score + 0.15);
    if (amount > 1000) score = Math.min(1, score + 0.1);

    return { score, country, reason: mismatch ? 'bin_country_mismatch' : 'ok' };
  } catch (e: any) {
    return { score: 0.1, reason: 'bin_error' };
  }
}

/**
 * Compute model probability (linear logistic)
 */
function computeModelProb(model: FraudModel, features: Record<string, number>): number {
  const { feature_names, means, stds, coefs, intercept } = model;
  const vals: number[] = [];

  for (let i = 0; i < feature_names.length; i++) {
    const k = feature_names[i];
    const raw = Number(features[k] || 0.0);
    const mean = Number(means[i] || 0.0);
    const std = Number(stds[i]) || 1.0;
    vals.push((raw - mean) / std);
  }

  let dot = 0;
  for (let i = 0; i < coefs.length; i++) {
    dot += Number(coefs[i]) * vals[i];
  }
  dot += Number(intercept || 0);

  return sigmoid(dot);
}

/**
 * Run fraud checks and return incident
 */
export async function runFraudChecks(context: FraudContext): Promise<FraudIncident> {
  const results: Record<string, RuleResult> = {};

  // Velocity per IP
  const ipKey = `vel:ip:${context.ip || 'unknown'}`;
  const vIp = await velocityCheck({ key: ipKey, windowSeconds: 60, limit: 8 });
  results.velocity_ip = vIp;

  // Velocity per user
  if (context.userId) {
    const userKey = `vel:user:${context.userId}`;
    const vUser = await velocityCheck({ key: userKey, windowSeconds: 60, limit: 6 });
    results.velocity_user = vUser;
  }

  // Shipping / billing mismatch
  results.shipping_mismatch = shippingBillingMismatch({
    billingAddress: context.billingAddress,
    shippingAddress: context.shippingAddress,
  });

  // Email risk
  results.email = emailRisk(context.email);

  // IP risk
  results.ip = await ipRisk(context.ip);

  // Payment pattern
  results.payment = await paymentPatternRisk({
    cardBin: context.cardBin,
    billingCountry: context.billingAddress?.country,
    amountCents: context.amount,
  });

  // User history heuristics
  results.user_history = {
    returnRate: context.userReturnRate || 0.0,
    chargebacks: context.chargebackCount || 0,
    score: Math.min(1, (context.chargebackCount || 0) * 0.3 + (context.userReturnRate || 0) * 0.5),
  };

  // Compute weighted heuristic score
  const weights = {
    velocity_ip: 0.15,
    velocity_user: 0.1,
    shipping_mismatch: 0.2,
    email: 0.1,
    ip: 0.15,
    payment: 0.2,
    user_history: 0.1,
  };

  let heuristicScore = 0;
  heuristicScore += (results.velocity_ip?.score || 0) * weights.velocity_ip;
  heuristicScore += (results.velocity_user?.score || 0) * weights.velocity_user;
  heuristicScore += (results.shipping_mismatch?.score || 0) * weights.shipping_mismatch;
  heuristicScore += (results.email?.score || 0) * weights.email;
  heuristicScore += (results.ip?.score || 0) * weights.ip;
  heuristicScore += (results.payment?.score || 0) * weights.payment;
  heuristicScore += (results.user_history?.score || 0) * weights.user_history;

  // Model score
  let modelScore: number | null = null;
  if (MODEL) {
    const featureObj = {
      price: (context.amount || 0) / 100.0,
      returnsProb: context.estimatedReturnProb || 0.0,
      userReturnRate: context.userReturnRate || 0.0,
      brandTrustScore: context.brandTrustScore || 0.5,
      anomalyFlagsCount:
        (results.velocity_ip?.count || 0) + (results.velocity_user?.count || 0),
    };
    modelScore = computeModelProb(MODEL, featureObj);
  }

  // Combine: finalScore = alpha * heuristicScore + (1-alpha) * modelScore (if present)
  let finalScore = heuristicScore;
  if (modelScore != null) {
    finalScore = ALPHA * heuristicScore + (1 - ALPHA) * modelScore;
  }
  finalScore = Math.max(0, Math.min(1, finalScore));

  // Decision mapping
  let decision: 'allow' | 'challenge' | 'deny' | 'manual_review' = 'allow';
  if (finalScore >= FRAUD_SCORE_THRESHOLD) {
    decision = 'deny';
  } else if (finalScore >= FRAUD_FLAG_THRESHOLD) {
    decision = 'manual_review';
  } else {
    decision = 'allow';
  }

  // Produce incident object
  const rulesFired: string[] = [];
  Object.entries(results).forEach(([k, v]) => {
    if (v && (v.score || v.count)) {
      const s = v.score || 0;
      if (s >= 0.2 || (v.count && v.count > 8)) {
        rulesFired.push(k);
      }
    }
  });

  const incidentId = sha256Hex(
    JSON.stringify({ context, t: Date.now() })
  ).slice(0, 20);

  const incident: FraudIncident = {
    id: incidentId,
    userId: context.userId || null,
    userEmail: context.email || null,
    userIp: context.ip || null,
    userAgent: context.userAgent || null,
    action: context.action || 'unknown',
    amount: context.amount || null,
    currency: context.currency || 'usd',
    score: finalScore,
    modelScore: modelScore || null,
    ruleScores: results,
    rulesFired,
    decision,
    createdAt: new Date().toISOString(),
  };

  return incident;
}

/**
 * Persist fraud incident to database
 */
export async function saveFraudIncident(incident: FraudIncident): Promise<void> {
  try {
    await vultrPostgres.query(
      `INSERT INTO fraud_incidents (
        id, user_id, user_email, user_ip, user_agent, action, amount, currency,
        score, model_score, rule_scores, rules_fired, decision, evidence_id, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        decision = EXCLUDED.decision,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at`,
      [
        incident.id,
        incident.userId,
        incident.userEmail,
        incident.userIp,
        incident.userAgent,
        incident.action,
        incident.amount,
        incident.currency,
        incident.score,
        incident.modelScore,
        JSON.stringify(incident.ruleScores),
        incident.rulesFired,
        incident.decision,
        null, // evidence_id
        null, // notes
        incident.createdAt,
        new Date().toISOString(),
      ]
    );

    // Send alert for high-risk incidents
    if (incident.score >= 0.9) {
      const { sendFraudAlert } = await import('./AlertService.js');
      sendFraudAlert(incident).catch((err) => {
        console.error('Failed to send fraud alert:', err);
      });
    }
  } catch (error) {
    console.error('Failed to save fraud incident:', error);
    // Don't throw - fraud detection should not block transactions
  }
}

/**
 * Get user risk profile
 */
export async function getUserRiskProfile(
  userId: string
): Promise<{
  avgReturnRate?: number;
  chargebackCount: number;
  fraudFlags: number;
} | null> {
  try {
    const rows = await vultrPostgres.query(
      'SELECT avg_return_rate, chargeback_count, fraud_flags FROM user_risk_profiles WHERE user_id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return { chargebackCount: 0, fraudFlags: 0 };
    }
    return {
      avgReturnRate: rows[0].avg_return_rate,
      chargebackCount: rows[0].chargeback_count || 0,
      fraudFlags: rows[0].fraud_flags || 0,
    };
  } catch (error) {
    console.error('Failed to get user risk profile:', error);
    return { chargebackCount: 0, fraudFlags: 0 };
  }
}

// Export internal functions for testing
export const _internal = {
  velocityCheck,
  shippingBillingMismatch,
  emailRisk,
  ipRisk,
  paymentPatternRisk,
  computeModelProb,
};

