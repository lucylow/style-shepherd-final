// lib/fraudDetector.js
// Hybrid fraud detection: deterministic rules + optional model scoring.
// Uses Redis for velocity counters. Optional model loaded from JSON/joblib (if available).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const FRAUD_SCORE_THRESHOLD = Number(process.env.FRAUD_SCORE_THRESHOLD || 0.65);
const FRAUD_FLAG_THRESHOLD = Number(process.env.FRAUD_FLAG_THRESHOLD || 0.45);
const MODEL_PATH = process.env.FRAUD_MODEL_PATH || path.join(process.cwd(), 'model_fraud.json');
const ALPHA = Number(process.env.FRAUD_MODEL_ALPHA || 0.5); // weight for heuristic score

let MODEL = null;
try {
  if (fs.existsSync(MODEL_PATH)) {
    MODEL = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    console.log('Loaded fraud model from', MODEL_PATH);
  }
} catch (e) {
  console.warn('Could not load fraud model:', e.message);
}

// Use global fetch if available; fallback to node-fetch if required
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  try {
    // node-fetch v2 (CJS) compatibility; if using node-fetch v3 adjust accordingly
    fetchFn = require('node-fetch');
  } catch (e) {
    fetchFn = null;
  }
}
const fetch = fetchFn;

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/* ---------- helper: velocity checks using Redis ---------- */
async function velocityCheck({ key, windowSeconds = 60, limit = 5 }) {
  const ttl = windowSeconds;
  const val = await redis.incr(key);
  if (val === 1) {
    await redis.expire(key, ttl);
  }
  const score = Math.min(1, Math.max(0, (val - limit) / limit)); // normalized
  return { count: val, score, limit };
}

/* ---------- deterministic heuristic checks ---------- */

function shippingBillingMismatch({ billingAddress, shippingAddress }) {
  if (!billingAddress || !shippingAddress) return { score: 0, reason: 'missing' };
  const mismatch = (String(billingAddress.country || '').trim().toLowerCase() !== String(shippingAddress.country || '').trim().toLowerCase());
  return { score: mismatch ? 0.9 : 0.0, reason: mismatch ? 'country_mismatch' : 'ok' };
}

function emailRisk(email) {
  if (!email) return { score: 0.0, reason: 'missing' };
  const domain = String(email).split('@').pop().toLowerCase();
  const freeDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com'];
  const disposablePatterns = ['mailinator','10minutemail','maildrop','tempmail','dispostable','trashmail'];
  const isFree = freeDomains.includes(domain);
  const isDisposable = disposablePatterns.some(p => domain.includes(p));
  let score = 0;
  if (isDisposable) score = 0.9;
  else if (isFree) score = 0.1;
  return { score, domain, isFree, isDisposable };
}

async function ipRisk(ip) {
  if (!ip) return { score: 0, reason: 'no_ip' };
  if (ip.startsWith('127.') || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return { score: 0.0, reason: 'private' };
  }
  const token = process.env.IPINFO_TOKEN;
  if (!token || !fetch) {
    return { score: 0.05, reason: 'no_lookup' };
  }
  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`, { timeout: 5000 });
    if (!res.ok) return { score: 0.1, reason: 'ipinfo_failed' };
    const j = await res.json();
    const proxy = (j.org && /amazon|digitalocean|linode|vultr|google|microsoft/i.test(j.org));
    return { score: proxy ? 0.8 : 0.05, asn: j.org, country: j.country, reason: proxy ? 'datacenter' : 'ok' };
  } catch (e) {
    return { score: 0.1, reason: 'ipinfo_error' };
  }
}

async function paymentPatternRisk({ cardBin, billingCountry, amountCents }) {
  if (!cardBin) return { score: 0, reason: 'no_bin' };
  if (!fetch) return { score: 0.1, reason: 'no_fetch' };
  try {
    const res = await fetch(`https://lookup.binlist.net/${encodeURIComponent(cardBin)}`, { timeout: 3000 });
    if (!res.ok) return { score: 0.1, reason: 'bin_failed' };
    const j = await res.json();
    const country = j?.country?.alpha2;
    const mismatch = country && billingCountry && country.toLowerCase() !== String(billingCountry).toLowerCase();
    let score = mismatch ? 0.8 : 0.05;
    const amount = Number(amountCents || 0) / 100.0;
    if (amount > 500) score = Math.min(1, score + 0.15);
    return { score, country, reason: mismatch ? 'bin_country_mismatch' : 'ok' };
  } catch (e) {
    return { score: 0.1, reason: 'bin_error' };
  }
}

/* ---------- model scoring helper ---------- */

function computeModelProb(model, x) {
  if (!model) return null;
  const feature_names = model.feature_names || model.featureNames || [];
  const means = model.means || model.mean || [];
  const stds = model.stds || model.std || [];
  const coefs = model.coefs || model.coef || [];
  const intercept = model.intercept || model.b || 0;
  const vals = [];
  for (let i = 0; i < feature_names.length; i++) {
    const k = feature_names[i];
    const raw = Number(x[k] || 0.0);
    const mean = Number(means[i] || 0.0);
    const std = Number(stds[i]) || 1.0;
    vals.push((raw - mean) / std);
  }
  let dot = 0;
  for (let i = 0; i < (coefs.length || 0); i++) {
    dot += Number(coefs[i] || 0) * (vals[i] || 0);
  }
  dot += Number(intercept || 0);
  return sigmoid(dot);
}

/* ---------- main runner ---------- */

async function runChecks(context = {}) {
  const results = {};

  const ipKey = `vel:ip:${context.ip || 'unknown'}`;
  const vIp = await velocityCheck({ key: ipKey, windowSeconds: 60, limit: Number(process.env.VELOCITY_IP_LIMIT || 8) });
  results.velocity_ip = vIp;

  if (context.userId) {
    const userKey = `vel:user:${String(context.userId)}`;
    const vUser = await velocityCheck({ key: userKey, windowSeconds: 60, limit: Number(process.env.VELOCITY_USER_LIMIT || 6) });
    results.velocity_user = vUser;
  }

  results.shipping_mismatch = shippingBillingMismatch({ billingAddress: context.billingAddress, shippingAddress: context.shippingAddress });

  results.email = emailRisk(context.email);

  results.ip = await ipRisk(context.ip);

  results.payment = await paymentPatternRisk({ cardBin: context.cardBin, billingCountry: (context.billingAddress || {}).country, amountCents: context.amount });

  results.user_history = { returnRate: context.userReturnRate || 0.0, chargebacks: context.chargebackCount || 0 };

  const weights = {
    velocity_ip: 0.15, velocity_user: 0.1, shipping_mismatch: 0.2, email: 0.1, ip: 0.15, payment: 0.2, user_history: 0.1
  };

  let heuristicScore = 0;
  heuristicScore += (results.velocity_ip?.score || 0) * weights.velocity_ip;
  heuristicScore += (results.velocity_user?.score || 0) * weights.velocity_user;
  heuristicScore += (results.shipping_mismatch?.score || 0) * weights.shipping_mismatch;
  heuristicScore += (results.email?.score || 0) * weights.email;
  heuristicScore += (results.ip?.score || 0) * weights.ip;
  heuristicScore += (results.payment?.score || 0) * weights.payment;
  heuristicScore += (results.user_history?.returnRate || 0) * weights.user_history;

  let modelScore = null;
  if (MODEL) {
    const featureObj = {
      price: (context.amount || 0) / 100.0,
      returnsProb: context.estimatedReturnProb || 0.0,
      userReturnRate: context.userReturnRate || 0.0,
      brandTrustScore: context.brandTrustScore || 0.5,
      anomalyFlagsCount: (results.velocity_ip?.count || 0) + (results.velocity_user?.count || 0)
    };
    modelScore = computeModelProb(MODEL, featureObj);
  }

  let finalScore = heuristicScore;
  if (modelScore != null) finalScore = ALPHA * heuristicScore + (1 - ALPHA) * modelScore;
  finalScore = Math.max(0, Math.min(1, finalScore));

  let decision = 'allow';
  if (finalScore >= FRAUD_SCORE_THRESHOLD) decision = 'deny';
  else if (finalScore >= FRAUD_FLAG_THRESHOLD) decision = 'manual_review';
  else decision = 'allow';

  const rulesFired = [];
  Object.entries(results).forEach(([k, v]) => {
    if (!v) return;
    const s = v.score || 0;
    if (s >= 0.2 || (v.count && v.count > 8)) rulesFired.push(k);
  });

  const incident = {
    id: sha256Hex(JSON.stringify({ context, t: Date.now() })).slice(0, 20),
    userId: context.userId || null,
    userEmail: context.email || null,
    userIp: context.ip || null,
    userAgent: context.userAgent || null,
    action: context.action || 'unknown',
    amount: context.amount || null,
    currency: context.currency || 'usd',
    score: finalScore,
    modelScore,
    ruleScores: results,
    rulesFired,
    decision,
    createdAt: new Date().toISOString()
  };

  return incident;
}

module.exports = {
  runChecks,
  computeModelProb,
  _internal: { velocityCheck, shippingBillingMismatch, emailRisk, ipRisk, paymentPatternRisk }
};
