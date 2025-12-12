/**
 * Orchestrator Client Service
 * Handles communication with backend orchestrator and Supabase realtime subscriptions
 */

import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '@/lib/api-config';
import type { UserQuery, AgentResponse, AgentType } from '@/types/agent-orchestration';

const API_BASE = getApiBaseUrl();

/**
 * Call the orchestrator endpoint to route user queries to appropriate agents
 */
export async function callOrchestrator(
  query: UserQuery
): Promise<{ ok: boolean; sessionId?: string; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/agents/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return { ok: false, message: errorText || `HTTP ${res.status}` };
    }

    const json = await res.json().catch(() => ({ ok: false, message: 'invalid-json' }));
    return json;
  } catch (error: any) {
    console.error('Orchestrator call failed:', error);
    return { ok: false, message: error.message || 'network-error' };
  }
}

/**
 * Call a specific agent directly (bypasses orchestrator)
 */
export async function callAgentDirect(
  agent: AgentType,
  query: UserQuery
): Promise<{ ok: boolean; response?: AgentResponse; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/agents/${agent}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return { ok: false, message: errorText || `HTTP ${res.status}` };
    }

    const json = await res.json().catch(() => ({ ok: false, message: 'invalid-json' }));
    
    if (json.ok && json.response) {
      return { ok: true, response: json.response };
    }
    
    return { ok: false, message: json.message || 'agent-failed' };
  } catch (error: any) {
    console.error(`Agent ${agent} call failed:`, error);
    return { ok: false, message: error.message || 'network-error' };
  }
}

/**
 * Subscribe to Supabase realtime channel for agent responses
 * Returns an unsubscribe function
 */
export function subscribeToSession(
  sessionId: string,
  onMessage: (msg: AgentResponse) => void
): { unsubscribe: () => void } {
  if (!supabase) {
    console.warn('Supabase client not available, realtime subscriptions disabled');
    return { unsubscribe: () => {} };
  }

  const channel = supabase.channel(`agents:session:${sessionId}`, {
    config: { broadcast: { self: true }, presence: false },
  });

  channel.on('broadcast', { event: 'agent_response' }, (payload) => {
    try {
      const ar = payload.payload?.data as AgentResponse;
      if (ar && ar.sessionId === sessionId) {
        onMessage(ar);
      }
    } catch (e) {
      console.warn('Bad payload received from Supabase channel:', payload, e);
    }
  });

  channel
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to session channel: agents:session:${sessionId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to session channel: agents:session:${sessionId}`);
      }
    })
    .catch((err) => console.error('Subscribe error:', err));

  return {
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

/**
 * Get message history for a session (optional endpoint)
 */
export async function getSessionHistory(
  sessionId: string
): Promise<{ ok: boolean; messages?: AgentResponse[]; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/agents/session/${sessionId}/history`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }

    const json = await res.json().catch(() => ({ ok: false, message: 'invalid-json' }));
    return json;
  } catch (error: any) {
    console.error('Get session history failed:', error);
    return { ok: false, message: error.message || 'network-error' };
  }
}

