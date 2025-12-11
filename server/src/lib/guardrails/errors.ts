/**
 * Guardrails Framework - Custom Errors
 */

import { AppError, ErrorCode } from '../errors.js';

export class GuardrailError extends AppError {
  constructor(
    message: string,
    public readonly guardrailName: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      { ...details, guardrailName, severity },
      true
    );
    this.name = 'GuardrailError';
  }
}

export class GuardrailViolationError extends GuardrailError {
  constructor(
    message: string,
    guardrailName: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    public readonly agent: string,
    details?: any
  ) {
    super(message, guardrailName, severity, { ...details, agent });
    this.name = 'GuardrailViolationError';
  }
}

export class BudgetExceededError extends GuardrailError {
  constructor(requested: number, limit: number) {
    super(
      `Budget exceeded: requested $${requested.toFixed(2)} exceeds limit of $${limit.toFixed(2)}`,
      'BUDGET_EXCEEDED',
      'high',
      { requested, limit }
    );
    this.name = 'BudgetExceededError';
  }
}

export class PermissionDeniedError extends GuardrailError {
  constructor(
    action: string,
    requiredTier: string,
    userTier: string
  ) {
    super(
      `Permission denied: ${action} requires ${requiredTier} tier, but user has ${userTier}`,
      'PERMISSION_DENIED',
      'high',
      { action, requiredTier, userTier }
    );
    this.name = 'PermissionDeniedError';
  }
}
