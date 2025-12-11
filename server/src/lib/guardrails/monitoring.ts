/**
 * Guardrails Monitoring and Dashboard
 * Real-time monitoring of guardrail violations and circuit breakers
 */

import type { AgentType, GuardrailViolation, CircuitBreakerState } from './types.js';
import { guardrailEngine } from './policy-engine.js';
import { vultrPostgres } from '../vultr-postgres.js';

export interface MonitoringDashboard {
  violationRate: number;
  totalViolations: number;
  violationsByAgent: Record<AgentType, number>;
  violationsBySeverity: Record<string, number>;
  topViolations: Array<{
    agent: AgentType;
    checkName: string;
    count: number;
    lastOccurred: Date;
  }>;
  circuitBreakers: CircuitBreakerState[];
  autoBlockedSessions: number;
  killSwitchActive: boolean;
  recentViolations: GuardrailViolation[];
}

export class GuardrailMonitor {
  private readonly VIOLATION_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private autoBlockedSessions = 0;

  /**
   * Get real-time dashboard data
   */
  async getDashboard(): Promise<MonitoringDashboard> {
    const stats = guardrailEngine.getViolationStats();
    
    // Get circuit breaker states
    const circuitBreakers = await this.getCircuitBreakerStates();
    
    // Get top violations
    const topViolations = await this.getTopViolations();
    
    // Get recent violations
    const recentViolations = await this.getRecentViolations(50);
    
    // Check if kill switch is active
    const killSwitchActive = circuitBreakers.every(cb => cb.isOpen);

    return {
      violationRate: stats.violationRate,
      totalViolations: stats.totalViolations,
      violationsByAgent: stats.byAgent,
      violationsBySeverity: stats.bySeverity,
      topViolations,
      circuitBreakers,
      autoBlockedSessions: this.autoBlockedSessions,
      killSwitchActive,
      recentViolations,
    };
  }

  /**
   * Get circuit breaker states
   */
  private async getCircuitBreakerStates(): Promise<CircuitBreakerState[]> {
    const agents: AgentType[] = [
      'personalShopper',
      'makeupArtist',
      'sizePredictor',
      'returnsPredictor',
      'cartAgent',
      'searchAgent',
    ];

    const states: CircuitBreakerState[] = [];

    for (const agent of agents) {
      // Get violation rate for this agent
      const violations = await this.getViolationsForAgent(agent, 1000);
      const violationRate = violations.length / 1000;

      states.push({
        agent,
        isOpen: false, // Would get from circuit breaker state
        failureCount: violations.length,
        violationRate,
      });
    }

    return states;
  }

  /**
   * Get top violations
   */
  private async getTopViolations(): Promise<Array<{
    agent: AgentType;
    checkName: string;
    count: number;
    lastOccurred: Date;
  }>> {
    try {
      const result = await vultrPostgres.query(
        `SELECT agent, check_name, COUNT(*) as count, MAX(created_at) as last_occurred
         FROM guardrail_violations
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY agent, check_name
         ORDER BY count DESC
         LIMIT 10`
      );

      return result.rows.map(row => ({
        agent: row.agent as AgentType,
        checkName: row.check_name,
        count: parseInt(row.count, 10),
        lastOccurred: new Date(row.last_occurred),
      }));
    } catch (error) {
      console.warn('Failed to get top violations from database:', error);
      return [];
    }
  }

  /**
   * Get recent violations
   */
  private async getRecentViolations(limit: number): Promise<GuardrailViolation[]> {
    try {
      const result = await vultrPostgres.query(
        `SELECT agent, action, user_id, reason, severity, payload, check_name, created_at
         FROM guardrail_violations
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        agent: row.agent as AgentType,
        action: row.action,
        userId: row.user_id,
        reason: row.reason,
        severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
        timestamp: new Date(row.created_at),
        payload: row.payload ? JSON.parse(row.payload) : undefined,
        checkName: row.check_name,
      }));
    } catch (error) {
      console.warn('Failed to get recent violations from database:', error);
      return [];
    }
  }

  /**
   * Get violations for a specific agent
   */
  private async getViolationsForAgent(
    agent: AgentType,
    windowSize: number
  ): Promise<GuardrailViolation[]> {
    try {
      const result = await vultrPostgres.query(
        `SELECT agent, action, user_id, reason, severity, payload, check_name, created_at
         FROM guardrail_violations
         WHERE agent = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [agent, windowSize]
      );

      return result.rows.map(row => ({
        agent: row.agent as AgentType,
        action: row.action,
        userId: row.user_id,
        reason: row.reason,
        severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
        timestamp: new Date(row.created_at),
        payload: row.payload ? JSON.parse(row.payload) : undefined,
        checkName: row.check_name,
      }));
    } catch (error) {
      console.warn('Failed to get violations for agent:', error);
      return [];
    }
  }

  /**
   * Record auto-blocked session
   */
  recordAutoBlockedSession(): void {
    this.autoBlockedSessions++;
  }

  /**
   * Get violation statistics for a time period
   */
  async getViolationStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    byAgent: Record<AgentType, number>;
    bySeverity: Record<string, number>;
    trend: Array<{ date: string; count: number }>;
  }> {
    try {
      const result = await vultrPostgres.query(
        `SELECT 
           COUNT(*) as total,
           agent,
           severity,
           DATE(created_at) as date
         FROM guardrail_violations
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY agent, severity, DATE(created_at)
         ORDER BY date ASC`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      const byAgent: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const trendMap = new Map<string, number>();

      for (const row of result.rows) {
        byAgent[row.agent] = (byAgent[row.agent] || 0) + parseInt(row.total, 10);
        bySeverity[row.severity] = (bySeverity[row.severity] || 0) + parseInt(row.total, 10);
        
        const date = row.date;
        trendMap.set(date, (trendMap.get(date) || 0) + parseInt(row.total, 10));
      }

      const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
        date,
        count,
      }));

      return {
        total: result.rows.reduce((sum, row) => sum + parseInt(row.total, 10), 0),
        byAgent: byAgent as Record<AgentType, number>,
        bySeverity,
        trend,
      };
    } catch (error) {
      console.warn('Failed to get violation stats:', error);
      return {
        total: 0,
        byAgent: {} as Record<AgentType, number>,
        bySeverity: {},
        trend: [],
      };
    }
  }
}

// Singleton instance
export const guardrailMonitor = new GuardrailMonitor();
