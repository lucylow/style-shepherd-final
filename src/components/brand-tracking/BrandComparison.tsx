/**
 * Brand Comparison Component
 * 
 * Compare SEO metrics and performance across multiple fashion brands
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { compareBrandSEO, type BrandMonitoringResult } from '@/services/integrations';
import { getTrackedBrands } from '@/services/integrations';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

export default function BrandComparison() {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandMonitoringResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allBrands = getTrackedBrands();

  const handleBrandToggle = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((name) => name !== brandName)
        : [...prev, brandName]
    );
  };

  const handleCompare = async () => {
    if (selectedBrands.length < 2) {
      setError('Please select at least 2 brands to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const comparisonResults = await compareBrandSEO(selectedBrands);
      setResults(comparisonResults);
    } catch (err: any) {
      setError(err.message || 'Failed to compare brands');
    } finally {
      setLoading(false);
    }
  };

  const getBestBrand = (metric: 'seoScore' | 'responseTime' | 'pageLoadTime') => {
    if (results.length === 0) return null;

    const validResults = results.filter(
      (r) => r.metrics[metric] !== undefined
    );

    if (validResults.length === 0) return null;

    if (metric === 'seoScore') {
      return validResults.reduce((best, current) =>
        (current.metrics.seoScore || 0) > (best.metrics.seoScore || 0)
          ? current
          : best
      );
    } else {
      // For responseTime and pageLoadTime, lower is better
      return validResults.reduce((best, current) =>
        (current.metrics[metric] || Infinity) < (best.metrics[metric] || Infinity)
          ? current
          : best
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Brand Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Compare SEO metrics and performance across fashion brands
        </p>
      </div>

      {/* Brand Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Brands to Compare</CardTitle>
          <CardDescription>
            Choose 2 or more brands to compare their SEO metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {allBrands.map((brand) => (
              <div
                key={brand.name}
                className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                onClick={() => handleBrandToggle(brand.name)}
              >
                <Checkbox
                  checked={selectedBrands.includes(brand.name)}
                  onCheckedChange={() => handleBrandToggle(brand.name)}
                />
                <label className="text-sm font-medium cursor-pointer">
                  {brand.name}
                </label>
              </div>
            ))}
          </div>
          <Button
            onClick={handleCompare}
            disabled={loading || selectedBrands.length < 2}
            className="w-full"
          >
            {loading ? 'Comparing...' : `Compare ${selectedBrands.length} Brands`}
          </Button>
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Comparison Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result) => {
                  const { brand, metrics } = result;
                  const isBestSEO = getBestBrand('seoScore')?.brand.name === brand.name;
                  const isBestResponse = getBestBrand('responseTime')?.brand.name === brand.name;
                  const isBestLoad = getBestBrand('pageLoadTime')?.brand.name === brand.name;

                  return (
                    <div
                      key={brand.name}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{brand.name}</h3>
                          <Badge variant={metrics.status === 'online' ? 'default' : 'destructive'}>
                            {metrics.status}
                          </Badge>
                        </div>
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Visit Site →
                        </a>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metrics.seoScore !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">SEO Score</span>
                              {isBestSEO && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-2xl font-bold">
                              {metrics.seoScore.toFixed(1)}
                            </p>
                          </div>
                        )}

                        {metrics.responseTime !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Response Time</span>
                              {isBestResponse && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-2xl font-bold">
                              {metrics.responseTime}ms
                            </p>
                          </div>
                        )}

                        {metrics.pageLoadTime !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Page Load</span>
                              {isBestLoad && (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-2xl font-bold">
                              {metrics.pageLoadTime}ms
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Mobile Friendly</span>
                          <p className="text-2xl font-bold">
                            {metrics.mobileFriendly ? '✓' : '✗'}
                          </p>
                        </div>
                      </div>

                      {metrics.metaTitle && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Meta Title</p>
                          <p className="text-sm">{metrics.metaTitle}</p>
                        </div>
                      )}

                      {metrics.errors && metrics.errors.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Issues Found</span>
                          </div>
                          <ul className="mt-1 space-y-1">
                            {metrics.errors.map((error, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground">
                                • {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
