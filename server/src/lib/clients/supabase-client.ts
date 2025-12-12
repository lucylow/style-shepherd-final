/**
 * Supabase Client for Backend
 * Provides access to Supabase database for workflow orchestration
 */

import { createClient } from '@supabase/supabase-js';
import env from '../config/env.js';

// Extend env to include Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Supabase credentials not configured. Workflow features will be limited.');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Workflow types
export interface ShoppingWorkflow {
  id: string;
  user_id: string;
  status: 'pending' | 'running' | 'agents_complete' | 'aggregated' | 'delivered' | 'error' | 'cancelled';
  current_stage?: string;
  user_intent?: any;
  agent_results?: any[];
  final_result?: any;
  error_message?: string;
  retry_count?: number;
  max_retries?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AgentMessage {
  id: string;
  workflow_id: string;
  agent_type: 'personal-shopper' | 'makeup-artist' | 'size-predictor' | 'returns-predictor' | 'aggregator';
  message_type: 'input' | 'output' | 'error' | 'status';
  payload: any;
  timestamp: string;
  retry_count?: number;
}

export interface WorkflowAnalytics {
  id: string;
  workflow_id: string;
  agent_type?: string;
  duration_ms?: number;
  success?: boolean;
  error_type?: string;
  created_at: string;
}

/**
 * Supabase Workflow Service
 */
export class SupabaseWorkflowService {
  /**
   * Create a new workflow
   */
  async createWorkflow(userId: string, userIntent: any): Promise<ShoppingWorkflow> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('shopping_workflows')
      .insert({
        user_id: userId,
        status: 'pending',
        current_stage: 'initialization',
        user_intent: userIntent,
        agent_results: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    return data as ShoppingWorkflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<ShoppingWorkflow | null> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('shopping_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get workflow: ${error.message}`);
    }

    return data as ShoppingWorkflow;
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string,
    status: ShoppingWorkflow['status'],
    updates?: Partial<ShoppingWorkflow>
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const updateData: any = { status, ...updates };
    if (status === 'delivered' || status === 'error') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('shopping_workflows')
      .update(updateData)
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Add agent result to workflow
   */
  async addAgentResult(workflowId: string, agentType: AgentMessage['agent_type'], result: any): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get current workflow
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update agent_results array
    const agentResults = workflow.agent_results || [];
    agentResults.push({
      agent_type: agentType,
      result,
      timestamp: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('shopping_workflows')
      .update({ agent_results: agentResults })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to add agent result: ${error.message}`);
    }
  }

  /**
   * Create agent message
   */
  async createAgentMessage(
    workflowId: string,
    agentType: AgentMessage['agent_type'],
    messageType: AgentMessage['message_type'],
    payload: any
  ): Promise<AgentMessage> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        workflow_id: workflowId,
        agent_type: agentType,
        message_type: messageType,
        payload,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent message: ${error.message}`);
    }

    return data as AgentMessage;
  }

  /**
   * Get agent messages for workflow
   */
  async getAgentMessages(workflowId: string, agentType?: AgentMessage['agent_type']): Promise<AgentMessage[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    let query = supabase
      .from('agent_messages')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('timestamp', { ascending: true });

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get agent messages: ${error.message}`);
    }

    return (data || []) as AgentMessage[];
  }

  /**
   * Record workflow analytics
   */
  async recordAnalytics(
    workflowId: string,
    agentType: string,
    durationMs: number,
    success: boolean,
    errorType?: string
  ): Promise<void> {
    if (!supabase) {
      return; // Silently fail if Supabase not configured
    }

    try {
      const { error } = await supabase
        .from('workflow_analytics')
        .insert({
          workflow_id: workflowId,
          agent_type: agentType,
          duration_ms: durationMs,
          success,
          error_type: errorType,
        });
      if (error) {
        console.warn('Failed to record analytics:', error);
      }
    } catch (err) {
      console.warn('Failed to record analytics:', err);
    }
  }

  /**
   * Subscribe to workflow changes (for real-time updates)
   */
  subscribeToWorkflow(
    workflowId: string,
    callback: (workflow: ShoppingWorkflow) => void
  ): { unsubscribe: () => void } {
    if (!supabase) {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(`workflow-${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_workflows',
          filter: `id=eq.${workflowId}`,
        },
        (payload) => {
          if (payload.new) {
            callback(payload.new as ShoppingWorkflow);
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  }
}

export const supabaseWorkflowService = new SupabaseWorkflowService();
