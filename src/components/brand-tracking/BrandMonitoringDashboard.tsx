/**
 * Brand Monitoring Dashboard Component
 * 
 * Displays real-time monitoring of tracked fashion brand websites
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getBrandDashboardData, 
  monitorAllBrands, 
  type BrandMonitoringResult 
} from '@/services/integrations';
import { getTrackedBrands } from '@/services/integrations';
import { RefreshCw, Globe, AlertCircle, CheckCircle2, TrendingUp, Clock } from 'lucide-react';

export default function BrandMonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<{
    totalBrands: number;
    onlineBrands: number;
    averageSEOScore: number;
    recentChecks: BrandMonitoringResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const data = await getBrandDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load brand monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading brand monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { totalBrands, onlineBrands, averageSEOScore, recentChecks } = dashboardData;
  const offlineBrands = totalBrands - onlineBrands;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brand Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track fashion e-commerce websites for SEO and availability
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBrands}</div>
            <p className="text-xs text-muted-foreground">
              Tracked fashion websites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineBrands}</div>
            <p className="text-xs text-muted-foreground">
              {offlineBrands > 0 && `${offlineBrands} offline`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SEO Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageSEOScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Out of 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Check</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentChecks.length > 0
                ? new Date(recentChecks[0].timestamp).toLocaleTimeString()
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time monitoring
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Brand Status List */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Status</CardTitle>
          <CardDescription>
            Current status and SEO metrics for tracked fashion brands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChecks.map((result) => {
              const { brand, metrics } = result;
              const isOnline = metrics.status === 'online';

              return (
                <div
                  key={brand.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {isOnline ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{brand.name}</h3>
                        <Badge variant={isOnline ? 'default' : 'destructive'}>
                          {metrics.status}
                        </Badge>
                        {metrics.seoScore !== undefined && (
                          <Badge variant="outline">
                            SEO: {metrics.seoScore.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {brand.website}
                        </a>
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {metrics.responseTime && (
                          <span>Response: {metrics.responseTime}ms</span>
                        )}
                        {metrics.pageLoadTime && (
                          <span>Load: {metrics.pageLoadTime}ms</span>
                        )}
                        {metrics.mobileFriendly !== undefined && (
                          <span>
                            Mobile: {metrics.mobileFriendly ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
