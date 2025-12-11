/**
 * Risk Scoring Engine
 * Computes a 0..1 risk score for actions based on user, product, and context
 */

const DEFAULTS = {
  baseWeight: Number(process.env.RISK_BASELINE_WEIGHT || 1.0),
  valueMultiplier: Number(process.env.RISK_VALUE_MULTIPLIER || 0.0001),
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function scoreByValue(amount: number): number {
  // larger purchases scale risk linearly via multiplier
  return clamp01(amount * DEFAULTS.valueMultiplier);
}

function scoreByReturnRisk(predictedReturnProbability: number): number {
  // predictedReturnProbability is 0..1 from returns-predictor tool
  // map to contribution (e.g. 0.0 => 0, 1.0 => 0.6)
  return clamp01(predictedReturnProbability * 0.6);
}

function scoreByUserHistory(history: {
  totalOrders?: number;
  returnRate?: number;
  fraudFlags?: boolean;
} = {}): number {
  // history: {totalOrders, returnRate, fraudFlags}
  let score = 0;
  if (history.returnRate != null) {
    score += clamp01(history.returnRate) * 0.4; // up to 0.4
  }
  if (history.fraudFlags) {
    score += 0.6; // large penalty
  }
  return clamp01(score);
}

function scoreByBrandTrust(brandTrustScore?: number): number {
  // brandTrustScore: 0..1 (higher = more trusted)
  // invert: lower trust increases risk
  return clamp01((1 - (brandTrustScore ?? 0.5)) * 0.3);
}

function scoreByAnomalyFlags(flags: string[] = []): number {
  // flags: array of strings from anomaly detector
  if (!flags || flags.length === 0) return 0;
  // simple scheme: each flag adds 0.15 up to 1.0
  return clamp01(flags.length * 0.15);
}

export interface RiskAssessmentParams {
  user?: {
    id?: string;
    email?: string;
    history?: {
      totalOrders?: number;
      returnRate?: number;
      fraudFlags?: boolean;
    };
  };
  product?: {
    sku?: string;
    price?: number;
    brand?: string;
    brandTrustScore?: number;
  };
  action?: {
    type?: 'checkout' | 'cart' | 'auto-buy' | 'invoice' | 'refund';
    details?: Record<string, any>;
  };
  returnsPrediction?: {
    probability?: number;
  };
  otherSignals?: {
    anomalyFlags?: string[];
    merchantRules?: Record<string, any>;
  };
}

export interface RiskContribution {
  key: string;
  weight: number;
  contribution: number;
  note: string;
}

export interface RiskAssessmentResult {
  score: number;
  contributions: RiskContribution[];
  meta: {
    price: number;
    userId?: string;
    sku?: string;
    actionType?: string;
  };
}

/**
 * assessRisk
 * @param params - Risk assessment parameters
 * @returns Risk assessment result with score and contributions
 */
export function assessRisk(params: RiskAssessmentParams = {}): RiskAssessmentResult {
  const {
    user = {},
    product = {},
    action = {},
    returnsPrediction = {},
    otherSignals = {},
  } = params;

  const contributions: RiskContribution[] = [];

  // baseline
  contributions.push({
    key: 'baseline',
    weight: DEFAULTS.baseWeight,
    contribution: DEFAULTS.baseWeight,
    note: 'baseline',
  });

  // price/value
  const price =
    product.price || (action.details && action.details.amount) || 0;
  const valueScore = scoreByValue(price);
  contributions.push({
    key: 'value',
    weight: 1.0,
    contribution: valueScore,
    note: `price ${price}`,
  });

  // returns prediction
  const retProb =
    returnsPrediction.probability != null
      ? returnsPrediction.probability
      : 0;
  const retScore = scoreByReturnRisk(retProb);
  contributions.push({
    key: 'return_risk',
    weight: 1.0,
    contribution: retScore,
    note: `predicted_return_prob ${retProb}`,
  });

  // user history
  const histScore = scoreByUserHistory(user.history || {});
  contributions.push({
    key: 'user_history',
    weight: 1.0,
    contribution: histScore,
    note: 'user return/fraud history',
  });

  // brand trust
  const brandScore = scoreByBrandTrust(product.brandTrustScore);
  contributions.push({
    key: 'brand_trust',
    weight: 1.0,
    contribution: brandScore,
    note: `brandTrust ${product.brandTrustScore}`,
  });

  // anomaly flags
  const anScore = scoreByAnomalyFlags(otherSignals.anomalyFlags || []);
  contributions.push({
    key: 'anomaly_flags',
    weight: 1.0,
    contribution: anScore,
    note: `flags ${JSON.stringify(otherSignals.anomalyFlags || [])}`,
  });

  // combine: weighted average (simple)
  const raw = contributions.reduce((s, c) => s + (c.contribution || 0), 0);
  // normalize - heuristic: divide by number of contributors (so bounded)
  const norm = raw / Math.max(1, contributions.length);

  const finalScore = clamp01(norm);

  return {
    score: finalScore,
    contributions,
    meta: {
      price,
      userId: user.id,
      sku: product.sku,
      actionType: action.type,
    },
  };
}
