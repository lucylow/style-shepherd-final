/**
 * Model Ranker Loader
 * Loads and applies the trained ML model for risk scoring
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface RankerModel {
  feature_names: string[];
  means: number[];
  stds: number[];
  coefs: number[];
  intercept: number;
  meta?: {
    trained_at?: string;
    n_samples?: number;
  };
}

export function loadModelJSON(filePath: string): RankerModel {
  const s = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(s);
}

export interface ModelFeatures {
  price?: number;
  returnsProb?: number;
  userReturnRate?: number;
  brandTrustScore?: number;
  anomalyFlagsCount?: number;
  score_js?: number;
  [key: string]: number | undefined; // for action type one-hot features
}

/**
 * computeModelProb
 * - model: JSON (feature_names, means, stds, coefs, intercept)
 * - x: object mapping feature name -> numeric value
 */
export function computeModelProb(
  model: RankerModel,
  x: ModelFeatures
): number {
  const { feature_names, means, stds, coefs, intercept } = model;
  const vals: number[] = [];
  for (let i = 0; i < feature_names.length; i++) {
    const k = feature_names[i];
    const raw = x[k] != null ? Number(x[k]) : 0.0;
    const mean = means[i] != null ? Number(means[i]) : 0.0;
    const std = stds[i] != null && Number(stds[i]) !== 0 ? Number(stds[i]) : 1.0;
    vals.push((raw - mean) / std);
  }
  // dot product
  let dot = 0.0;
  for (let i = 0; i < coefs.length; i++) {
    dot += Number(coefs[i]) * vals[i];
  }
  dot += Number(intercept || 0.0);
  return sigmoid(dot);
}

let MODEL_RANKER: RankerModel | null = null;

export function loadRankerModel(): RankerModel | null {
  if (MODEL_RANKER) return MODEL_RANKER;

  const MODEL_PATH =
    process.env.RANKER_MODEL_PATH ||
    path.join(process.cwd(), 'model_ranker.json');
  try {
    if (fs.existsSync(MODEL_PATH)) {
      MODEL_RANKER = loadModelJSON(MODEL_PATH);
      console.log('Loaded ranker model from', MODEL_PATH);
      return MODEL_RANKER;
    } else {
      console.log('Ranker model not found at', MODEL_PATH);
      return null;
    }
  } catch (e: any) {
    console.warn('Failed loading ranker model:', e?.message);
    return null;
  }
}

export interface CombineWithModelContext {
  user?: {
    history?: {
      returnRate?: number;
    };
  };
  product?: {
    price?: number;
    brandTrustScore?: number;
  };
  returnsPrediction?: {
    probability?: number;
  };
  otherSignals?: {
    anomalyFlags?: string[];
  };
}

/**
 * Combine original risk score with ML model prediction
 */
export function combineWithModel(
  originalScore: number,
  context: CombineWithModelContext
): number {
  const model = loadRankerModel();
  if (!model) return originalScore;

  const features: ModelFeatures = {
    price:
      context.product && context.product.price
        ? context.product.price / 100.0
        : 0.0, // convert cents to dollars
    returnsProb:
      context.returnsPrediction && context.returnsPrediction.probability
        ? context.returnsPrediction.probability
        : 0.0,
    userReturnRate:
      context.user && context.user.history && context.user.history.returnRate
        ? context.user.history.returnRate
        : 0.0,
    brandTrustScore:
      context.product && context.product.brandTrustScore
        ? context.product.brandTrustScore
        : 0.5,
    anomalyFlagsCount:
      context.otherSignals && context.otherSignals.anomalyFlags
        ? context.otherSignals.anomalyFlags.length
        : 0,
    score_js: originalScore,
  };

  const p_model = computeModelProb(model, features);
  // Weighted combination - configurable via env
  const alpha = Number(process.env.RANKER_ALPHA || 0.5);
  const combined = alpha * originalScore + (1 - alpha) * p_model;
  return combined;
}

