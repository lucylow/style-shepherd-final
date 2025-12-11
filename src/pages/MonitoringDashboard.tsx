/**
 * Monitoring Dashboard
 * Real-time monitoring and observability dashboard for AI agents
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, Server, Zap, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface Metrics {
  http?: {
    totalRequests?: number;
    avgLatencyMs?: number;
  };
  agents?: {
    totalTasks?: number;
    avgLatencyMs?: number;
  };
  system?: {
    process?: Record<string, number>;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: {
    recentErrors: number;
    agentSuccessRate: number;
    totalAgentTasks: number;
  };
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({});
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch('/api/monitoring/stats'),
        fetch('/api/monitoring/health'),
      ]);

      if (!statsRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const statsData = await statsRes.json();
      const healthData = await healthRes.json();

      setMetrics(statsData);
      setHealth(healthData);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time observability for AI agents and services
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last update: {lastUpdate.toLocaleTimeString()}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall system status and key metrics</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(health.status)}`} />
                <span className="font-semibold capitalize">{health.status}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Recent Errors</p>
                <p className="text-2xl font-bold">{health.metrics.recentErrors}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Agent Success Rate</p>
                <p className="text-2xl font-bold">
                  {(health.metrics.agentSuccessRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Agent Tasks</p>
                <p className="text-2xl font-bold">{formatNumber(health.metrics.totalAgentTasks)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="http">HTTP Metrics</TabsTrigger>
          <TabsTrigger value="agents">Agent Metrics</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">HTTP Requests</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.http?.totalRequests)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(metrics.http?.avgLatencyMs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">HTTP requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Tasks</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.agents?.totalTasks)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total executed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Latency</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(metrics.agents?.avgLatencyMs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average task time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="http" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HTTP Request Metrics</CardTitle>
              <CardDescription>Performance metrics for HTTP endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Requests</span>
                  <span className="text-lg font-bold">{formatNumber(metrics.http?.totalRequests)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Latency</span>
                  <span className="text-lg font-bold">{formatDuration(metrics.http?.avgLatencyMs)}</span>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  View detailed metrics at{' '}
                  <a
                    href="/api/monitoring/metrics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    /api/monitoring/metrics
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Task Metrics</CardTitle>
              <CardDescription>Performance and usage metrics for AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Tasks Executed</span>
                  <span className="text-lg font-bold">{formatNumber(metrics.agents?.totalTasks)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Task Latency</span>
                  <span className="text-lg font-bold">{formatDuration(metrics.agents?.avgLatencyMs)}</span>
                </div>
                {health && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-lg font-bold">
                      {(health.metrics.agentSuccessRate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>Process and resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.system?.process ? (
                <div className="space-y-2">
                  {Object.entries(metrics.system.process).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{key}</span>
                      <span className="text-lg font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No system metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/api/monitoring/metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Prometheus Metrics</div>
              <div className="text-sm text-muted-foreground mt-1">
                Raw metrics in Prometheus format
              </div>
            </a>
            <a
              href="/api/monitoring/metrics/json"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">JSON Metrics</div>
              <div className="text-sm text-muted-foreground mt-1">
                Metrics in JSON format
              </div>
            </a>
            <a
              href="/api/monitoring/stats"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <div className="font-semibold">Statistics API</div>
              <div className="text-sm text-muted-foreground mt-1">
                Human-readable statistics
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

