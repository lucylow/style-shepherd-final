/**
 * useWorkflowProgress Hook
 * Real-time subscription to workflow progress via Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowState {
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

export interface UseWorkflowProgressReturn {
  workflow: WorkflowState | null;
  messages: AgentMessage[];
  isLoading: boolean;
  error: Error | null;
  progress: {
    stage: string;
    percentage: number;
    agentsComplete: string[];
    agentsPending: string[];
  };
}

/**
 * Hook to track workflow progress in real-time
 */
export function useWorkflowProgress(workflowId: string | null): UseWorkflowProgressReturn {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workflowId) {
      setIsLoading(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchInitialData = async () => {
      try {
        // Fetch initial workflow state
        const { data: workflowData, error: workflowError } = await supabase
          .from('shopping_workflows')
          .select('*')
          .eq('id', workflowId)
          .single();

        if (workflowError) {
          throw workflowError;
        }

        setWorkflow(workflowData as WorkflowState);

        // Fetch initial messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('agent_messages')
          .select('*')
          .eq('workflow_id', workflowId)
          .order('timestamp', { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        setMessages((messagesData || []) as AgentMessage[]);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    channel = supabase
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
            setWorkflow(payload.new as WorkflowState);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `workflow_id=eq.${workflowId}`,
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => [...prev, payload.new as AgentMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [workflowId]);

  // Calculate progress
  const progress = (() => {
    if (!workflow) {
      return {
        stage: 'initializing',
        percentage: 0,
        agentsComplete: [],
        agentsPending: ['personal-shopper', 'size-predictor', 'returns-predictor', 'aggregator'],
      };
    }

    const allAgents = ['personal-shopper', 'size-predictor', 'returns-predictor', 'aggregator'];
    const optionalAgents = ['makeup-artist'];
    
    // Get completed agents from messages
    const completedAgents = messages
      .filter((m) => m.message_type === 'output')
      .map((m) => m.agent_type)
      .filter((v, i, a) => a.indexOf(v) === i);

    const pendingAgents = allAgents.filter((agent) => !completedAgents.includes(agent));

    // Calculate percentage based on status
    let percentage = 0;
    let stage = workflow.current_stage || 'initializing';

    switch (workflow.status) {
      case 'pending':
        percentage = 0;
        stage = 'initializing';
        break;
      case 'running':
        if (completedAgents.includes('personal-shopper')) {
          percentage = 25;
          stage = 'discovery';
        }
        if (completedAgents.includes('size-predictor')) {
          percentage = 50;
          stage = 'validation';
        }
        if (completedAgents.includes('returns-predictor')) {
          percentage = 75;
          stage = 'risk-assessment';
        }
        break;
      case 'agents_complete':
        percentage = 85;
        stage = 'aggregation';
        break;
      case 'aggregated':
        percentage = 95;
        stage = 'finalizing';
        break;
      case 'delivered':
        percentage = 100;
        stage = 'complete';
        break;
      case 'error':
        percentage = 0;
        stage = 'error';
        break;
      case 'cancelled':
        percentage = 0;
        stage = 'cancelled';
        break;
    }

    return {
      stage,
      percentage,
      agentsComplete: completedAgents,
      agentsPending: pendingAgents,
    };
  })();

  return {
    workflow,
    messages,
    isLoading,
    error,
    progress,
  };
}

/**
 * Hook to start a new workflow
 */
export function useStartWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const startWorkflow = async (intent: {
    userId: string;
    budget?: number;
    occasion?: string;
    style?: string;
    preferences?: {
      colors?: string[];
      brands?: string[];
      styles?: string[];
    };
    selfieUrl?: string;
    skinTone?: {
      undertone?: 'warm' | 'cool' | 'neutral';
      depth?: 'light' | 'medium' | 'tan' | 'deep';
    };
    measurements?: {
      height?: number;
      weight?: number;
      chest?: number;
      waist?: number;
      hips?: number;
      inseam?: number;
      shoeSize?: number;
    };
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workflows/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start workflow');
      }

      const data = await response.json();
      setWorkflowId(data.workflowId);
      return data.workflowId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    startWorkflow,
    isLoading,
    error,
    workflowId,
  };
}
