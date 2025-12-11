/**
 * Agent Executor Wrapper
 * Wraps agent execution with monitoring, metrics, and tracing
 */

import {
  createAgentSpan,
  logAgentTask,
  logToolCall,
  logLLMCall,
  agentTaskLatency,
} from './monitoring.js';
import { context, Span, SpanStatusCode } from '@opentelemetry/api';

export interface AgentExecutionOptions {
  agentName: string;
  userId?: string;
  intent?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AgentExecutionResult<T> {
  result: T;
  durationMs: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  cost?: number;
  model?: string;
  toolsUsed?: string[];
}

/**
 * Execute an agent task with full monitoring
 */
export async function executeAgentTask<T>(
  operation: string,
  task: () => Promise<T>,
  options: AgentExecutionOptions
): Promise<AgentExecutionResult<T>> {
  const {
    agentName,
    userId,
    intent,
    requestId = crypto.randomUUID(),
    metadata,
  } = options;

  const startTime = Date.now();
  const span = createAgentSpan(agentName, operation);
  const toolsUsed: string[] = [];

  // Add attributes to span
  span.setAttributes({
    'agent.name': agentName,
    'agent.operation': operation,
    'agent.request_id': requestId,
    ...(userId && { 'user.id': userId }),
    ...(intent && { 'agent.intent': intent }),
    ...(metadata && Object.entries(metadata).reduce((acc, [k, v]) => {
      acc[`agent.metadata.${k}`] = String(v);
      return acc;
    }, {} as Record<string, string>)),
  });

  try {
    // Execute task within span context
    const result = await context.with(trace.setSpan(context.active(), span), async () => {
      return await task();
    });

    const durationMs = Date.now() - startTime;

    // Extract token usage and cost from result if available
    const tokenUsage = (result as any)?.tokenUsage;
    const cost = (result as any)?.cost;
    const model = (result as any)?.model;
    const resultToolsUsed = (result as any)?.toolsUsed || [];

    toolsUsed.push(...resultToolsUsed);

    span.setAttributes({
      'agent.duration_ms': durationMs,
      'agent.success': true,
      ...(tokenUsage?.total && { 'agent.tokens.total': tokenUsage.total }),
      ...(tokenUsage?.input && { 'agent.tokens.input': tokenUsage.input }),
      ...(tokenUsage?.output && { 'agent.tokens.output': tokenUsage.output }),
      ...(cost !== undefined && { 'agent.cost_usd': cost }),
      ...(model && { 'agent.model': model }),
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    // Log successful execution
    logAgentTask({
      requestId,
      agentName,
      userId,
      intent,
      durationMs,
      success: true,
      tokenUsage,
      cost,
      model,
      toolsUsed,
      metadata,
    });

    return {
      result,
      durationMs,
      tokenUsage,
      cost,
      model,
      toolsUsed,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const err = error as Error;

    span.setAttributes({
      'agent.duration_ms': durationMs,
      'agent.success': false,
      'error.message': err.message,
      'error.type': err.constructor.name,
    });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    });
    span.recordException(err);
    span.end();

    // Log failed execution
    logAgentTask({
      requestId,
      agentName,
      userId,
      intent,
      durationMs,
      success: false,
      error: err,
      metadata,
    });

    throw error;
  }
}

/**
 * Wrap a tool call with monitoring
 */
export async function executeToolCall<T>(
  agentName: string,
  toolName: string,
  toolCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await toolCall();
    const durationMs = Date.now() - startTime;

    logToolCall({
      agentName,
      toolName,
      success: true,
      durationMs,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const err = error as Error;

    logToolCall({
      agentName,
      toolName,
      success: false,
      durationMs,
      error: err,
    });

    throw error;
  }
}

/**
 * Wrap an LLM call with monitoring
 */
export async function executeLLMCall<T>(
  provider: string,
  model: string,
  llmCall: () => Promise<T>,
  options?: {
    extractTokenUsage?: (result: T) => { input?: number; output?: number };
    extractCost?: (result: T) => number;
  }
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await llmCall();
    const durationMs = Date.now() - startTime;

    const tokenUsage = options?.extractTokenUsage?.(result);
    const cost = options?.extractCost?.(result);

    logLLMCall({
      provider,
      model,
      durationMs,
      success: true,
      tokenUsage,
      cost,
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const err = error as Error;

    logLLMCall({
      provider,
      model,
      durationMs,
      success: false,
      error: err,
    });

    throw error;
  }
}
