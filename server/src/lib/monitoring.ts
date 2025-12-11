/**
 * Monitoring & Observability Infrastructure
 * 
 * Provides:
 * - OpenTelemetry tracing for distributed tracing
 * - Prometheus metrics for operational metrics
 * - Winston structured logging for audit trails
 * - Agent-specific metrics and traces
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { SimpleSpanProcessor, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import promClient from 'prom-client';
import winston from 'winston';
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';

// ===== OpenTelemetry Initialization =====

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'style-shepherd',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
  spanProcessor: process.env.NODE_ENV === 'production'
    ? new BatchSpanProcessor(new ConsoleSpanExporter()) // In production, you'd use OTLP exporter
    : new SimpleSpanProcessor(new ConsoleSpanExporter()),
});

// Start SDK
sdk.start();

// ===== Prometheus Metrics Registry =====

const register = new promClient.Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'style_shepherd_',
});

// HTTP Request Metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'style_shepherd_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'style_shepherd_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestSize = new promClient.Histogram({
  name: 'style_shepherd_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

export const httpResponseSize = new promClient.Histogram({
  name: 'style_shepherd_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// Agent Task Metrics
export const agentTasksTotal = new promClient.Counter({
  name: 'style_shepherd_agent_tasks_total',
  help: 'Total number of agent tasks executed',
  labelNames: ['agent_name', 'status', 'intent'],
  registers: [register],
});

export const agentTaskLatency = new promClient.Histogram({
  name: 'style_shepherd_agent_task_latency_seconds',
  help: 'Latency of agent tasks in seconds',
  labelNames: ['agent_name', 'intent'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const agentTaskTokens = new promClient.Histogram({
  name: 'style_shepherd_agent_tokens_total',
  help: 'Total tokens used by agent tasks',
  labelNames: ['agent_name', 'type'], // type: input, output, total
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

export const agentTaskCost = new promClient.Histogram({
  name: 'style_shepherd_agent_cost_usd',
  help: 'Estimated cost of agent tasks in USD',
  labelNames: ['agent_name', 'model'],
  buckets: [0.001, 0.01, 0.1, 1, 10, 100],
  registers: [register],
});

export const agentToolCalls = new promClient.Counter({
  name: 'style_shepherd_agent_tool_calls_total',
  help: 'Total number of tool calls made by agents',
  labelNames: ['agent_name', 'tool_name', 'status'],
  registers: [register],
});

// LLM Call Metrics
export const llmCallsTotal = new promClient.Counter({
  name: 'style_shepherd_llm_calls_total',
  help: 'Total number of LLM API calls',
  labelNames: ['provider', 'model', 'status'],
  registers: [register],
});

export const llmCallLatency = new promClient.Histogram({
  name: 'style_shepherd_llm_call_latency_seconds',
  help: 'Latency of LLM API calls in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Business Metrics
export const businessMetrics = new promClient.Gauge({
  name: 'style_shepherd_business_metric',
  help: 'Business metrics (conversions, revenue, etc.)',
  labelNames: ['metric_type', 'user_id'],
  registers: [register],
});

export const agentSuccessRate = new promClient.Gauge({
  name: 'style_shepherd_agent_success_rate',
  help: 'Success rate of agent tasks (0-1)',
  labelNames: ['agent_name'],
  registers: [register],
});

// Error Metrics
export const errorsTotal = new promClient.Counter({
  name: 'style_shepherd_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'error_code', 'component'],
  registers: [register],
});

// ===== Winston Logger =====

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: {
    service: 'style-shepherd',
    version: '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? logFormat
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
    }),
  ],
});

// ===== Helper Functions =====

/**
 * Create a span for agent task execution
 */
export function createAgentSpan(agentName: string, operation: string): Span {
  const tracer = trace.getTracer('style-shepherd-agents');
  return tracer.startSpan(`agent.${agentName}.${operation}`, {
    attributes: {
      'agent.name': agentName,
      'agent.operation': operation,
    },
  });
}

/**
 * Log agent task execution
 */
export function logAgentTask(params: {
  requestId: string;
  agentName: string;
  userId?: string;
  intent?: string;
  durationMs: number;
  success: boolean;
  tokenUsage?: { input?: number; output?: number; total?: number };
  cost?: number;
  model?: string;
  toolsUsed?: string[];
  error?: Error;
  metadata?: Record<string, any>;
}) {
  const {
    requestId,
    agentName,
    userId,
    intent,
    durationMs,
    success,
    tokenUsage,
    cost,
    model,
    toolsUsed,
    error,
    metadata,
  } = params;

  const logLevel = success ? 'info' : 'error';
  const logData: any = {
    requestId,
    agentName,
    durationMs,
    success,
    ...(userId && { userId }),
    ...(intent && { intent }),
    ...(tokenUsage && { tokenUsage }),
    ...(cost !== undefined && { cost }),
    ...(model && { model }),
    ...(toolsUsed && { toolsUsed }),
    ...(error && { error: error.message, stack: error.stack }),
    ...(metadata && { metadata }),
  };

  logger[logLevel]('agent_task_executed', logData);

  // Update metrics
  agentTasksTotal.inc({
    agent_name: agentName,
    status: success ? 'success' : 'error',
    intent: intent || 'unknown',
  });

  agentTaskLatency.observe({ agent_name: agentName, intent: intent || 'unknown' }, durationMs / 1000);

  if (tokenUsage) {
    if (tokenUsage.input) {
      agentTaskTokens.observe({ agent_name: agentName, type: 'input' }, tokenUsage.input);
    }
    if (tokenUsage.output) {
      agentTaskTokens.observe({ agent_name: agentName, type: 'output' }, tokenUsage.output);
    }
    if (tokenUsage.total) {
      agentTaskTokens.observe({ agent_name: agentName, type: 'total' }, tokenUsage.total);
    }
  }

  if (cost !== undefined) {
    agentTaskCost.observe({ agent_name: agentName, model: model || 'unknown' }, cost);
  }
}

/**
 * Log LLM call
 */
export function logLLMCall(params: {
  provider: string;
  model: string;
  durationMs: number;
  success: boolean;
  tokenUsage?: { input?: number; output?: number };
  cost?: number;
  error?: Error;
}) {
  const { provider, model, durationMs, success, tokenUsage, cost, error } = params;

  const logLevel = success ? 'info' : 'error';
  logger[logLevel]('llm_call', {
    provider,
    model,
    durationMs,
    success,
    ...(tokenUsage && { tokenUsage }),
    ...(cost !== undefined && { cost }),
    ...(error && { error: error.message }),
  });

  // Update metrics
  llmCallsTotal.inc({
    provider,
    model,
    status: success ? 'success' : 'error',
  });

  llmCallLatency.observe({ provider, model }, durationMs / 1000);
}

/**
 * Log tool call
 */
export function logToolCall(params: {
  agentName: string;
  toolName: string;
  success: boolean;
  durationMs?: number;
  error?: Error;
}) {
  const { agentName, toolName, success, durationMs, error } = params;

  logger.info('tool_call', {
    agentName,
    toolName,
    success,
    ...(durationMs && { durationMs }),
    ...(error && { error: error.message }),
  });

  agentToolCalls.inc({
    agent_name: agentName,
    tool_name: toolName,
    status: success ? 'success' : 'error',
  });
}

/**
 * Log error
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error('error_occurred', {
    error: error.message,
    stack: error.stack,
    ...context,
  });

  errorsTotal.inc({
    error_type: error.constructor.name,
    error_code: (error as any).code || 'unknown',
    component: context?.component || 'unknown',
  });
}

/**
 * Expose metrics endpoint handler
 */
export async function metricsHandler(_req: any, res: any) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
}

/**
 * Get current metrics as JSON (for dashboard)
 */
export async function getMetricsJSON() {
  const metrics = await register.getMetricsAsJSON();
  return metrics;
}

/**
 * Shutdown monitoring (cleanup)
 */
export async function shutdown() {
  await sdk.shutdown();
  logger.info('Monitoring shutdown complete');
}

// Export register for custom metrics
export { register };
