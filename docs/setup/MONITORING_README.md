# Monitoring & Observability Platform

Comprehensive monitoring infrastructure for Style Shepherd AI agents in production.

## Overview

This monitoring platform provides:

- **OpenTelemetry Tracing**: Distributed tracing across all services and agents
- **Prometheus Metrics**: Operational metrics (latency, throughput, errors, etc.)
- **Structured Logging**: JSON logs with Winston for audit trails
- **Agent-Specific Metrics**: Task execution, token usage, costs, tool calls
- **Real-time Dashboard**: Web UI for monitoring agent health and performance

## Architecture

### Components

1. **Core Monitoring Module** (`server/src/lib/monitoring.ts`)
   - OpenTelemetry SDK initialization
   - Prometheus metrics registry
   - Winston logger configuration
   - Helper functions for logging and metrics

2. **Monitoring Middleware** (`server/src/middleware/monitoring.ts`)
   - Automatic HTTP request instrumentation
   - Route normalization for metrics
   - Request/response size tracking
   - Error tracking

3. **Agent Executor** (`server/src/lib/agentExecutor.ts`)
   - Wrapper for agent task execution
   - Automatic metrics collection
   - Token usage and cost tracking
   - Tool call monitoring

4. **Monitoring Routes** (`server/src/routes/monitoring.ts`)
   - `/api/monitoring/metrics` - Prometheus metrics endpoint
   - `/api/monitoring/metrics/json` - JSON metrics
   - `/api/monitoring/stats` - Human-readable statistics
   - `/api/monitoring/health` - Health check with metrics

5. **Dashboard UI** (`src/pages/MonitoringDashboard.tsx`)
   - Real-time metrics visualization
   - System health status
   - Agent performance metrics
   - HTTP request statistics

## Metrics Collected

### HTTP Metrics
- `style_shepherd_http_requests_total` - Total HTTP requests
- `style_shepherd_http_request_duration_seconds` - Request latency
- `style_shepherd_http_request_size_bytes` - Request size
- `style_shepherd_http_response_size_bytes` - Response size

### Agent Metrics
- `style_shepherd_agent_tasks_total` - Total agent tasks executed
- `style_shepherd_agent_task_latency_seconds` - Task execution latency
- `style_shepherd_agent_tokens_total` - Token usage (input/output/total)
- `style_shepherd_agent_cost_usd` - Estimated cost per task
- `style_shepherd_agent_tool_calls_total` - Tool call counts

### LLM Metrics
- `style_shepherd_llm_calls_total` - LLM API call counts
- `style_shepherd_llm_call_latency_seconds` - LLM call latency

### Error Metrics
- `style_shepherd_errors_total` - Error counts by type and component

### System Metrics
- Default Node.js process metrics (CPU, memory, event loop, etc.)

## Usage

### Accessing Metrics

**Prometheus Format:**
```bash
curl http://localhost:3001/api/monitoring/metrics
```

**JSON Format:**
```bash
curl http://localhost:3001/api/monitoring/metrics/json
```

**Statistics Summary:**
```bash
curl http://localhost:3001/api/monitoring/stats
```

**Health Check:**
```bash
curl http://localhost:3001/api/monitoring/health
```

### Using Agent Executor

Wrap agent tasks with monitoring:

```typescript
import { executeAgentTask } from '../lib/agentExecutor.js';

const result = await executeAgentTask(
  'processQuery',
  async () => {
    // Your agent logic here
    return await myAgent.process(query);
  },
  {
    agentName: 'MyAgent',
    userId: 'user123',
    intent: 'search',
    metadata: { /* custom metadata */ },
  }
);
```

### Using Tool Call Monitoring

```typescript
import { executeToolCall } from '../lib/agentExecutor.js';

const result = await executeToolCall(
  'MyAgent',
  'searchProducts',
  async () => {
    return await searchTool.execute(query);
  }
);
```

### Using LLM Call Monitoring

```typescript
import { executeLLMCall } from '../lib/agentExecutor.js';

const result = await executeLLMCall(
  'openai',
  'gpt-4',
  async () => {
    return await openai.chat.completions.create({ /* ... */ });
  },
  {
    extractTokenUsage: (result) => ({
      input: result.usage?.prompt_tokens,
      output: result.usage?.completion_tokens,
    }),
    extractCost: (result) => {
      // Calculate cost based on token usage
      return calculateCost(result.usage);
    },
  }
);
```

### Manual Logging

```typescript
import { logger, logAgentTask, logError } from '../lib/monitoring.js';

// Structured logging
logger.info('user_action', {
  userId: 'user123',
  action: 'purchase',
  productId: 'prod456',
});

// Agent task logging
logAgentTask({
  requestId: 'req123',
  agentName: 'MyAgent',
  userId: 'user123',
  durationMs: 1500,
  success: true,
  tokenUsage: { input: 100, output: 50, total: 150 },
  cost: 0.002,
});

// Error logging
logError(new Error('Something went wrong'), {
  component: 'MyAgent',
  userId: 'user123',
});
```

## Dashboard

Access the monitoring dashboard at:
```
http://localhost:5173/monitoring
```

The dashboard shows:
- System health status
- HTTP request metrics
- Agent task metrics
- System resource usage
- Real-time updates (refreshes every 5 seconds)

## Integration with Prometheus & Grafana

### Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'style-shepherd'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/monitoring/metrics'
```

### Grafana Dashboards

Import the Prometheus data source and create dashboards for:
- HTTP request rates and latencies
- Agent task success rates
- Token usage and costs
- Error rates by component
- System resource utilization

## Best Practices

1. **Always use the agent executor** for agent tasks to ensure metrics are collected
2. **Include request IDs** in logs for traceability
3. **Normalize route paths** to avoid high cardinality in metrics
4. **Set appropriate log levels** (debug in dev, info in prod)
5. **Monitor token usage and costs** to optimize agent efficiency
6. **Set up alerts** for error rates and latency spikes

## Environment Variables

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Node environment
NODE_ENV=production
```

## Future Enhancements

- [ ] OTLP exporter for traces (Jaeger, Tempo, etc.)
- [ ] Alerting rules for Prometheus
- [ ] Custom Grafana dashboards
- [ ] Drift detection for ML models
- [ ] Cost tracking and budgeting alerts
- [ ] Performance regression detection
- [ ] A/B testing metrics for agent variants

## Troubleshooting

### Metrics not appearing
- Check that monitoring middleware is mounted before routes
- Verify OpenTelemetry SDK is initialized
- Check logs for initialization errors

### High cardinality warnings
- Ensure route normalization is working
- Avoid including user IDs or other high-cardinality data in metric labels
- Use metadata fields for detailed information instead

### Performance impact
- Monitoring has minimal overhead (<1% typically)
- Use batch span processors in production
- Consider sampling for high-traffic scenarios

