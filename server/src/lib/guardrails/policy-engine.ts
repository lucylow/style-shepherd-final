/**
 * Guardrails Policy Enforcement Engine
 * Multi-layered validation system for agent actions
 */

import type {
  AgentType,
  AgentAction,
  GuardrailResult,
  GuardrailCheck,
  UserProfile,
  GuardrailViolation,
  AuditLog,
} from './types.js';
import { GuardrailError, GuardrailViolationError } from './errors.js';
import { vultrPostgres } from '../vultr-postgres.js';

export class GuardrailEngine {
  private checks: Map<AgentType, GuardrailCheck[]> = new Map();
  private violationHistory: GuardrailViolation[] = [];
  private auditLogs: AuditLog[] = [];
  private circuitBreakers: Map<AgentType, { isOpen: boolean; failureCount: number; openedAt?: Date }> = new Map();

  constructor() {
    this.initializeCircuitBreakers();
  }

  /**
   * Register guardrail checks for an agent
   */
  registerChecks(agent: AgentType, checks: GuardrailCheck[]): void {
    this.checks.set(agent, checks);
  }

  /**
   * Validate an agent action through all registered checks
   */
  async validateAgentAction(
    agent: AgentType,
    action: AgentAction,
    user: UserProfile
  ): Promise<GuardrailResult> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(agent)) {
      throw new GuardrailError(
        `Agent ${agent} is temporarily suspended due to high violation rate`,
        'CIRCUIT_BREAKER_OPEN',
        'critical',
        { agent }
      );
    }

    const checks = this.checks.get(agent) || [];
    const warnings: string[] = [];
    let modifiedPayload = action.payload;

    // Run all checks
    for (const check of checks) {
      try {
        const isValid = await check.validate(action.payload, user);
        
        if (!isValid) {
          // Try auto-correction if available
          if (check.autoCorrect) {
            try {
              modifiedPayload = await check.autoCorrect(action.payload, user);
              warnings.push(`Auto-corrected: ${check.reason}`);
              continue;
            } catch (autoCorrectError) {
              // Auto-correction failed, log violation
              await this.logViolation(agent, action, check, user);
              
              return {
                approved: false,
                reason: check.reason,
                warnings,
              };
            }
          } else {
            // No auto-correction, block the action
            await this.logViolation(agent, action, check, user);
            
            return {
              approved: false,
              reason: check.reason,
              warnings,
            };
          }
        }
      } catch (error) {
        // Check validation threw an error - treat as failure
        await this.logViolation(agent, action, check, user);
        
        if (error instanceof GuardrailError) {
          throw error;
        }
        
        return {
          approved: false,
          reason: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          warnings,
        };
      }
    }

    // All checks passed
    const result: GuardrailResult = {
      approved: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      modified: modifiedPayload !== action.payload ? modifiedPayload : undefined,
    };

    // Log successful validation
    await this.logAudit(agent, action, result, user);

    return result;
  }

  /**
   * Log a guardrail violation
   */
  private async logViolation(
    agent: AgentType,
    action: AgentAction,
    check: GuardrailCheck,
    user: UserProfile
  ): Promise<void> {
    const violation: GuardrailViolation = {
      agent,
      action: action.type,
      userId: user.userId,
      reason: check.reason,
      severity: check.severity,
      timestamp: new Date(),
      payload: action.payload,
      checkName: check.name,
    };

    this.violationHistory.push(violation);

    // Update circuit breaker
    this.updateCircuitBreaker(agent, true);

    // Persist to database (Supabase/Vultr PostgreSQL)
    try {
      await this.persistViolation(violation);
    } catch (error) {
      console.error('Failed to persist violation to database:', error);
      // Continue execution - logging failure shouldn't block
    }
  }

  /**
   * Log audit entry
   */
  private async logAudit(
    agent: AgentType,
    action: AgentAction,
    result: GuardrailResult,
    user: UserProfile
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent,
      action: action.type,
      userId: user.userId,
      result,
      timestamp: new Date(),
      payload: action.payload,
    };

    this.auditLogs.push(auditLog);

    // Persist to database
    try {
      await this.persistAuditLog(auditLog);
    } catch (error) {
      console.error('Failed to persist audit log to database:', error);
      // Continue execution
    }
  }

  /**
   * Persist violation to database
   */
  private async persistViolation(violation: GuardrailViolation): Promise<void> {
    try {
      await vultrPostgres.query(
        `INSERT INTO guardrail_violations 
         (agent, action, user_id, reason, severity, payload, check_name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          violation.agent,
          violation.action,
          violation.userId || null,
          violation.reason,
          violation.severity,
          JSON.stringify(violation.payload || {}),
          violation.checkName,
          violation.timestamp.toISOString(),
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay for now
      console.warn('Guardrail violations table may not exist:', error);
    }
  }

  /**
   * Persist audit log to database
   */
  private async persistAuditLog(auditLog: AuditLog): Promise<void> {
    try {
      await vultrPostgres.query(
        `INSERT INTO guardrail_audit_logs
         (id, agent, action, user_id, approved, reason, warnings, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          auditLog.id,
          auditLog.agent,
          auditLog.action,
          auditLog.userId || null,
          auditLog.result.approved,
          auditLog.result.reason || null,
          JSON.stringify(auditLog.result.warnings || []),
          JSON.stringify(auditLog.payload || {}),
          auditLog.timestamp.toISOString(),
        ]
      );
    } catch (error) {
      // Table might not exist yet - that's okay for now
      console.warn('Guardrail audit logs table may not exist:', error);
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(agent: AgentType, violation: boolean): void {
    const breaker = this.circuitBreakers.get(agent);
    if (!breaker) return;

    if (violation) {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      // Open circuit breaker if violation rate > 5%
      const recentViolations = this.getRecentViolations(agent, 100); // Last 100 actions
      const violationRate = recentViolations.length / 100;

      if (violationRate > 0.05 && !breaker.isOpen) {
        breaker.isOpen = true;
        breaker.openedAt = new Date();
        console.warn(`🚨 Circuit breaker opened for agent ${agent} - violation rate: ${(violationRate * 100).toFixed(1)}%`);
      }
    } else {
      // Reset on success (exponential backoff)
      if (breaker.isOpen) {
        const timeSinceOpen = breaker.openedAt 
          ? Date.now() - breaker.openedAt.getTime() 
          : Infinity;
        
        // Auto-close after 1 hour
        if (timeSinceOpen > 3600000) {
          breaker.isOpen = false;
          breaker.failureCount = 0;
          breaker.openedAt = undefined;
          console.info(`✅ Circuit breaker closed for agent ${agent}`);
        }
      } else {
        // Gradually reduce failure count on success
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(agent: AgentType): boolean {
    const breaker = this.circuitBreakers.get(agent);
    return breaker?.isOpen === true;
  }

  /**
   * Get recent violations for an agent
   */
  private getRecentViolations(agent: AgentType, limit: number): GuardrailViolation[] {
    return this.violationHistory
      .filter(v => v.agent === agent)
      .slice(-limit);
  }

  /**
   * Initialize circuit breakers for all agents
   */
  private initializeCircuitBreakers(): void {
    const agents: AgentType[] = [
      'personalShopper',
      'makeupArtist',
      'sizePredictor',
      'returnsPredictor',
      'cartAgent',
      'searchAgent',
    ];

    for (const agent of agents) {
      this.circuitBreakers.set(agent, {
        isOpen: false,
        failureCount: 0,
      });
    }
  }

  /**
   * Get violation statistics
   */
  getViolationStats(): {
    totalViolations: number;
    byAgent: Record<AgentType, number>;
    bySeverity: Record<string, number>;
    violationRate: number;
  } {
    const total = this.violationHistory.length;
    const byAgent: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const violation of this.violationHistory) {
      byAgent[violation.agent] = (byAgent[violation.agent] || 0) + 1;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
    }

    // Calculate violation rate (last 1000 actions)
    const recentActions = Math.max(1000, this.auditLogs.length);
    const violationRate = total / recentActions;

    return {
      totalViolations: total,
      byAgent: byAgent as Record<AgentType, number>,
      bySeverity,
      violationRate: Math.min(1, violationRate),
    };
  }

  /**
   * Emergency kill switch - suspend all agents
   */
  emergencyKillSwitch(): void {
    for (const [agent, breaker] of this.circuitBreakers.entries()) {
      breaker.isOpen = true;
      breaker.openedAt = new Date();
    }
    console.error('🚨 EMERGENCY KILL SWITCH ACTIVATED - All agents suspended');
  }

  /**
   * Reset circuit breaker for an agent (admin function)
   */
  resetCircuitBreaker(agent: AgentType): void {
    const breaker = this.circuitBreakers.get(agent);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      breaker.openedAt = undefined;
      console.info(`✅ Circuit breaker manually reset for agent ${agent}`);
    }
  }
}

// Singleton instance
export const guardrailEngine = new GuardrailEngine();
