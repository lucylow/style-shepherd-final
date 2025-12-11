/**
 * Guardrails Integration Helpers
 * Utilities for integrating guardrails into existing agents
 */

import type {
  AgentType,
  AgentAction,
  UserProfile,
  GuardrailResult,
  OutfitBundle,
} from './types.js';
import { guardrailEngine } from './policy-engine.js';
import { permissionManager } from './permissions.js';
import { InputValidator, OutputSanitizer } from './validation.js';
import { GuardrailError } from './errors.js';

/**
 * Wrap an agent action with guardrails validation
 */
export async function withGuardrails<T>(
  agent: AgentType,
  actionType: string,
  payload: any,
  userId?: string,
  actionFn?: (validatedPayload: any) => Promise<T>
): Promise<T & { guardrailWarnings?: string[] }> {
  // Get user profile with permissions
  let user: UserProfile;
  if (userId) {
    user = await permissionManager.getUserProfileWithPermissions(userId);
  } else {
    user = {
      userId: 'anonymous',
      permissions: permissionManager.getPermissionsForTier('FREE'),
    };
  }

  // Create agent action
  const action: AgentAction = {
    type: actionType,
    payload,
    agent,
    userId: user.userId,
    timestamp: new Date(),
  };

  // Validate through guardrails
  const result = await guardrailEngine.validateAgentAction(agent, action, user);

  if (!result.approved) {
    throw new GuardrailError(
      result.reason || 'Action blocked by guardrails',
      'GUARDRAIL_BLOCKED',
      'high',
      { agent, actionType, userId }
    );
  }

  // Use modified payload if auto-corrected
  const validatedPayload = result.modified || payload;

  // Execute action if function provided
  let output: T;
  if (actionFn) {
    output = await actionFn(validatedPayload);
  } else {
    output = validatedPayload as T;
  }

  // Add warnings to output if any
  if (result.warnings && result.warnings.length > 0) {
    return {
      ...output,
      guardrailWarnings: result.warnings,
    } as T & { guardrailWarnings?: string[] };
  }

  return output;
}

/**
 * Validate and sanitize outfit bundle
 */
export async function validateOutfitBundle(
  bundle: OutfitBundle,
  userId?: string
): Promise<OutfitBundle> {
  // Get user profile
  let user: UserProfile;
  if (userId) {
    user = await permissionManager.getUserProfileWithPermissions(userId);
  } else {
    user = {
      userId: 'anonymous',
      permissions: permissionManager.getPermissionsForTier('FREE'),
    };
  }

  // Validate through guardrails
  const action: AgentAction = {
    type: 'create_bundle',
    payload: bundle,
    agent: 'personalShopper',
    userId: user.userId,
    timestamp: new Date(),
  };

  const result = await guardrailEngine.validateAgentAction(
    'personalShopper',
    action,
    user
  );

  if (!result.approved) {
    throw new GuardrailError(
      result.reason || 'Bundle validation failed',
      'BUNDLE_VALIDATION_FAILED',
      'high',
      { bundle, userId }
    );
  }

  // Return validated (and potentially auto-corrected) bundle
  return (result.modified || bundle) as OutfitBundle;
}

/**
 * Validate input before agent processing
 */
export function validateInput(
  inputType: 'selfie' | 'budget' | 'measurements' | 'query' | 'age',
  value: any
): { valid: boolean; reason?: string; sanitized?: any } {
  switch (inputType) {
    case 'selfie':
      return InputValidator.validateSelfie(value);
    case 'budget':
      return InputValidator.validateBudget(value);
    case 'measurements':
      return InputValidator.validateMeasurements(value);
    case 'query':
      return InputValidator.validateQuery(value);
    case 'age':
      return InputValidator.validateAge(value);
    default:
      return { valid: true };
  }
}

/**
 * Sanitize output before returning to user
 */
export function sanitizeOutput(
  outputType: 'recommendations' | 'prices' | 'colors' | 'returnReasons' | 'bodyLanguage',
  value: any,
  context?: any
): any {
  switch (outputType) {
    case 'recommendations':
      return OutputSanitizer.sanitizeRecommendations(value);
    case 'prices':
      return OutputSanitizer.ensurePriceTransparency(value, context?.fees);
    case 'colors':
      return OutputSanitizer.ensureColorblindAccessibility(value);
    case 'returnReasons':
      return OutputSanitizer.anonymizeReturnReasons(value);
    case 'bodyLanguage':
      return OutputSanitizer.filterBodyNegativeLanguage(value);
    default:
      return value;
  }
}

/**
 * Check user permission before action
 */
export async function requirePermission(
  userId: string,
  action: string,
  requiredTier?: 'FREE' | 'PREMIUM' | 'VIP'
): Promise<void> {
  await permissionManager.requirePermission(userId, action, requiredTier);
}
