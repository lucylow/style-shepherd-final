/**
 * Monitoring Routes
 * Exposes metrics, health checks, and monitoring endpoints
 */

import { Router, Request, Response } from 'express';
import { metricsHandler, getMetricsJSON, logger } from '../lib/monitoring.js';
import { agentTasksTotal, agentTaskLatency, httpRequestTotal, httpRequestDuration } from '../lib/monitoring.js';

const router = Router();

/**
 * GET /api/monitoring/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', metricsHandler);

/**
 * GET /api/monitoring/metrics/json
 * Metrics as JSON (for dashboards)
 */
router.get('/metrics/json', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetricsJSON();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics JSON', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/monitoring/stats
 * Human-readable statistics summary
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetricsJSON();
    
    // Extract key metrics
    const stats: any = {
      timestamp: new Date().toISOString(),
      http: {},
      agents: {},
      system: {},
    };

    // Parse HTTP metrics
    for (const metric of metrics) {
      if (metric.name === 'style_shepherd_http_requests_total') {
        const total = metric.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
        stats.http.totalRequests = total;
      }
      if (metric.name === 'style_shepherd_http_request_duration_seconds') {
        const durations = metric.values?.map((v: any) => v.value) || [];
        if (durations.length > 0) {
          stats.http.avgLatencyMs = (durations.reduce((a: number, b: number) => a + b, 0) / durations.length) * 1000;
        }
      }
      if (metric.name === 'style_shepherd_agent_tasks_total') {
        const total = metric.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
        stats.agents.totalTasks = total;
      }
      if (metric.name === 'style_shepherd_agent_task_latency_seconds') {
        const latencies = metric.values?.map((v: any) => v.value) || [];
        if (latencies.length > 0) {
          stats.agents.avgLatencyMs = (latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) * 1000;
        }
      }
      if (metric.name.startsWith('style_shepherd_process_')) {
        if (!stats.system.process) stats.system.process = {};
        stats.system.process[metric.name.replace('style_shepherd_process_', '')] = metric.values?.[0]?.value;
      }
    }

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/monitoring/health
 * Detailed health check with metrics
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetricsJSON();
    
    // Check for recent errors
    const errorMetrics = metrics.find((m: any) => m.name === 'style_shepherd_errors_total');
    const recentErrors = errorMetrics?.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;

    // Check agent success rate
    const agentMetrics = metrics.find((m: any) => m.name === 'style_shepherd_agent_tasks_total');
    const successCount = agentMetrics?.values?.filter((v: any) => v.labels?.status === 'success').reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;
    const errorCount = agentMetrics?.values?.filter((v: any) => v.labels?.status === 'error').reduce((sum: number, v: any) => v.value || 0, 0) || 0;
    const totalTasks = successCount + errorCount;
    const successRate = totalTasks > 0 ? successCount / totalTasks : 1;

    const health = {
      status: recentErrors < 100 && successRate > 0.9 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics: {
        recentErrors,
        agentSuccessRate: successRate,
        totalAgentTasks: totalTasks,
      },
    };

    res.json(health);
  } catch (error) {
    logger.error('Failed to get health', { error });
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Failed to check health',
    });
  }
});

export default router;
