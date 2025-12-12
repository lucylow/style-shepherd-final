/**
 * Policy Engine
 * Maps risk score + autonomy level + context => decision: allow / require_approval / deny
 */

import { assessRisk, RiskAssessmentParams, RiskContribution } from './riskScorer.js';

const ALLOW_THRESHOLD = Number(process.env.RISK_THRESHOLD_ALLOW || 0.2);
const APPROVAL_THRESHOLD = Number(process.env.RISK_THRESHOLD_APPROVAL || 0.5);

export type AutonomyLevel = 'manual' | 'hybrid' | 'autonomous';

export interface PolicyOverrides {
  maxAllowThreshold?: number;
  maxApprovalThreshold?: number;
}

export interface PolicyEvaluationParams extends RiskAssessmentParams {
  autonomy?: AutonomyLevel;
  policyOverrides?: PolicyOverrides;
}

export interface PolicyEvaluationResult {
  score: number;
  reasons: RiskContribution[];
  decision: 'allow' | 'require_approval' | 'deny';
  rawDecision: 'allow' | 'require_approval' | 'deny';
  autopolicy: {
    allowT: number;
    approvalT: number;
    autonomy: AutonomyLevel;
  };
}

/**
 * evaluateAction
 * @param params - Policy evaluation parameters
 * @returns Policy evaluation result with decision
 */
export function evaluateAction(
  params: PolicyEvaluationParams = {}
): PolicyEvaluationResult {
  const { autonomy = 'hybrid', policyOverrides = {} } = params;
  const res = assessRisk(params);

  const score = res.score;
  const reasons = res.contributions;

  // thresholds may be overridden
  const allowT =
    policyOverrides.maxAllowThreshold != null
      ? policyOverrides.maxAllowThreshold
      : ALLOW_THRESHOLD;
  const approvalT =
    policyOverrides.maxApprovalThreshold != null
      ? policyOverrides.maxApprovalThreshold
      : APPROVAL_THRESHOLD;

  let decision: 'allow' | 'require_approval' | 'deny' = 'deny';
  if (score <= allowT) decision = 'allow';
  else if (score <= approvalT) decision = 'require_approval';
  else decision = 'deny';

  // Autonomy governor: if autonomy is 'autonomous', allow only if decision === 'allow'
  // if autonomy is 'hybrid', allow require_approval and allow depending on policy
  // if autonomy is 'manual', always require approval
  let effectiveDecision: 'allow' | 'require_approval' | 'deny' = decision;
  if (autonomy === 'manual') {
    effectiveDecision = 'require_approval';
  } else if (autonomy === 'hybrid') {
    // leave decision as-is
  } else if (autonomy === 'autonomous') {
    // only allow strict allows
    if (decision !== 'allow') effectiveDecision = 'require_approval';
  }

  return {
    score,
    reasons,
    decision: effectiveDecision,
    rawDecision: decision,
    autopolicy: { allowT, approvalT, autonomy },
  };
}

