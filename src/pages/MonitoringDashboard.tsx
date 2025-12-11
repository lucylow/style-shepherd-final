/**
 * Monitoring Dashboard
 * Comprehensive monitoring and observability dashboard for Style Shepherd
 * Includes: Dashboard overview, Deployment, Monitoring, Analytics, Logs, Health checks
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, Server, Zap, AlertTriangle, TrendingUp, Clock, Cloud, BarChart3, FileText, Heart } from 'lucide-react';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import DeploymentStatus from '@/components/admin/DeploymentStatus';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import LogsViewer from '@/components/admin/LogsViewer';
import HealthChecks from '@/components/admin/HealthChecks';
import SystemMetrics from '@/components/admin/SystemMetrics';

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
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Style Shepherd Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive monitoring, deployment, and analytics for Style Shepherd
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

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="deployment" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Deployment
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Health
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview Tab */}
          <TabsContent value="dashboard" className="space-y-6">
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
          </TabsContent>

          {/* Deployment Tab */}
          <TabsContent value="deployment">
            <DeploymentStatus />
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <SystemMetrics />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <LogsViewer />
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health">
            <HealthChecks />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

