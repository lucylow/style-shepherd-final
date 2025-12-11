/**
 * Test script for risk scoring and policy evaluation
 * Run: npx tsx scripts/test-risk.ts
 */

import { assessRisk } from '../server/src/lib/riskScorer.js';
import { evaluateAction } from '../server/src/lib/policyEngine.js';

async function run() {
  const user = {
    id: 'u1',
    history: { totalOrders: 5, returnRate: 0.2 },
  };
  const product = {
    sku: 'sku-123',
    price: 18500, // in cents
    brandTrustScore: 0.4,
  };
  const action = {
    type: 'checkout' as const,
    details: { amount: 18500 },
  };
  const returnsPrediction = { probability: 0.15 };
  const res = assessRisk({
    user,
    product,
    action,
    returnsPrediction,
    otherSignals: { anomalyFlags: [] },
  });
  console.log('assessRisk', JSON.stringify(res, null, 2));
  const evalRes = evaluateAction({
    user,
    product,
    action,
    returnsPrediction,
    otherSignals: {},
    autonomy: 'hybrid',
  });
  console.log('evaluateAction', JSON.stringify(evalRes, null, 2));
}

run().catch(console.error);
