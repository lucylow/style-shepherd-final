/**
 * useAgentOrchestration Hook
 * 
 * Manages agent orchestration state and provides methods to:
 * - Send user queries to orchestrator
 * - Call individual agents directly
 * - Subscribe to realtime agent responses via Supabase
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentResponse, UserQuery } from '@/types/agent-orchestration';
import { callOrchestrator, callAgentDirect, subscribeToSession } from '@/services/agents';

export function useAgentOrchestration(initialSessionId?: string) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [messages, setMessages] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  const pushMessage = useCallback((m: AgentResponse) => {
    setMessages((prev) => {
      // Avoid duplicates based on message id
      if (prev.some((msg) => msg.id === m.id)) {
        return prev;
      }
      return [...prev, m];
    });
  }, []);

  // (re)subscribe when sessionId changes
  useEffect(() => {
    if (!sessionId) return;

    // Unsubscribe old subscription
    subRef.current?.unsubscribe();

    const sub = subscribeToSession(sessionId, (msg) => {
      pushMessage(msg);
    });

    subRef.current = sub;

    return () => {
      subRef.current?.unsubscribe();
    };
  }, [sessionId, pushMessage]);

  /**
   * Send a query to the orchestrator
   * The orchestrator will route to appropriate agents and broadcast responses
   */
  async function orchestrate(query: UserQuery) {
    setLoading(true);
    try {
      const finalSessionId = query.sessionId ?? sessionId ?? `s-${Date.now()}`;
      const payload = await callOrchestrator({ ...query, sessionId: finalSessionId });

      if (payload?.ok && payload.sessionId) {
        setSessionId(payload.sessionId);
        return { ok: true, sessionId: payload.sessionId };
      }

      return { ok: false, message: payload?.message ?? 'orchestrator-failed' };
    } catch (error: any) {
      console.error('Orchestrate error:', error);
      return { ok: false, message: error.message || 'unknown-error' };
    } finally {
      setLoading(false);
    }
  }

  /**
   * Call a specific agent directly (bypasses orchestrator)
   * Useful for testing individual agents or direct interactions
   */
  async function callAgent(agentName: string, q: UserQuery) {
    setLoading(true);
    try {
      const finalSessionId = q.sessionId ?? sessionId ?? `s-${Date.now()}`;
      const result = await callAgentDirect(agentName as any, {
        ...q,
        sessionId: finalSessionId,
      });

      if (result.ok && result.response) {
        pushMessage(result.response);
        if (!sessionId && result.response.sessionId) {
          setSessionId(result.response.sessionId);
        }
        return { ok: true, response: result.response };
      }

      return { ok: false, message: result.message ?? 'agent-failed' };
    } catch (error: any) {
      console.error('Call agent error:', error);
      return { ok: false, message: error.message || 'unknown-error' };
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear all messages (useful for starting a new conversation)
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Manually set session ID (useful for resuming a previous session)
   */
  const setSession = useCallback((id: string | null) => {
    setSessionId(id);
  }, []);

  return {
    sessionId,
    setSessionId: setSession,
    messages,
    loading,
    orchestrate,
    callAgent,
    pushMessage,
    clearMessages,
  };
}

