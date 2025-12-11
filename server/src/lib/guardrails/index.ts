/**
 * Guardrails Framework - Main Export
 * Centralized guardrails system for Style Shepherd agents
 */

export * from './types.js';
export * from './errors.js';
export * from './policy-engine.js';
export * from './agent-guardrails.js';
export * from './permissions.js';
export * from './validation.js';
export * from './monitoring.js';

import { initializeAgentGuardrails } from './agent-guardrails.js';

/**
 * Initialize the guardrails framework
 * Call this during application startup
 */
export function initializeGuardrails(): void {
  initializeAgentGuardrails();
  console.log('✅ Guardrails framework initialized');
}
