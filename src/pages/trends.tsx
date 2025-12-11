/**
 * Trends Debug Page
 * Developer/judge UI to view trending categories and demo items
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Package } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';
import { SearchableSEO } from '@/components/seo/SearchableSEO';

interface Cluster {
  cluster_id: number;
  category: string;
  cluster_pop_score: number;
  trend_score: number;
  combined_score: number;
  sample_indices?: number[];
}

interface ExtraTrend {
  category: string;
  trend_score: number;
}

interface CombinedData {
  clusters: Cluster[];
  extra_trends: ExtraTrend[];
  generated_at: string;
  reference_asset?: string;
}

interface DemoProduct {
  id: string;
  title: string;
  price: number;
  image?: string | null;
  sizeRecommendation: string;
  sizeConfidence: number;
  returnRiskScore: number;
  returnRiskLabel: string;
  trendCategory: string;
  trendScore: number;
}

interface DemoRecommendation {
  generated_at: string;
  products: DemoProduct[];
  reference_asset?: string;
}

export default function TrendsPage() {
  const [keywords, setKeywords] = useState('linen,denim,blazer');
  const [loading, setLoading] = useState(false);
  const [combinedData, setCombinedData] = useState<CombinedData | null>(null);
  const [demoProducts, setDemoProducts] = useState<DemoProduct[]>([]);
  const [isMockMode, setIsMockMode] = useState(false);

  const fetchCombined = async () => {
    setLoading(true);
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      const query = keywordList.length > 0 ? `?keywords=${encodeURIComponent(keywordList.join(','))}&n_clusters=8` : '?n_clusters=8';
      
      const response = await fetch(`${getApiBaseUrl()}/functions/combined${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // If service unavailable, check if we're in mock mode
        if (response.status === 503) {
          setIsMockMode(true);
          toast.warning('Trend service unavailable - using mock data');
          // Use mock data from adapter
          const mockResponse = await import('@/lib/trends/mocks');
          setCombinedData(mockResponse.MOCK_COMBINED.combined);
          return;
        }
        throw new Error(`Failed to fetch trends: ${response.status}`);
      }

      const data: CombinedData = await response.json();
      setCombinedData(data);
      setIsMockMode(false);
      toast.success('Trend data loaded successfully');
    } catch (error) {
      console.error('Trend fetch error:', error);
      toast.error('Failed to load trend data');
      // Fallback to mock
      setIsMockMode(true);
      const mockResponse = await import('@/lib/trends/mocks');
      setCombinedData(mockResponse.MOCK_COMBINED.combined);
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoProducts = async () => {
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      const query = keywordList.length > 0 ? `?keywords=${encodeURIComponent(keywordList.join(','))}&limit=6` : '?limit=6';
      
      const response = await fetch(`${getApiBaseUrl()}/functions/demo-recommendations${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Use mock data
          const mockResponse = await import('@/lib/trends/mocks');
          setDemoProducts(mockResponse.MOCK_COMBINED.demoProducts.products);
          return;
        }
        throw new Error(`Failed to fetch demo products: ${response.status}`);
      }

      const data: DemoRecommendation = await response.json();
      setDemoProducts(data.products);
    } catch (error) {
      console.error('Demo products fetch error:', error);
      // Fallback to mock
      const mockResponse = await import('@/lib/trends/mocks');
      setDemoProducts(mockResponse.MOCK_COMBINED.demoProducts.products);
    }
  };

  useEffect(() => {
    fetchCombined();
    fetchDemoProducts();
  }, []);

  const sortedClusters = combinedData?.clusters
    ? [...combinedData.clusters].sort((a, b) => b.combined_score - a.combined_score)
    : [];

  const sortedExtraTrends = combinedData?.extra_trends
    ? [...combinedData.extra_trends].sort((a, b) => b.trend_score - a.trend_score)
    : [];

  // Convert demo products to Product format for SEO
  const seoProducts = demoProducts.map(p => ({
    id: p.id,
    name: p.title,
    title: p.title,
    description: `${p.trendCategory} - Trending fashion item`,
    category: p.trendCategory,
    price: p.price,
    brand: 'Style Shepherd',
    images: p.image ? [p.image] : [],
  }));

  return (
    <>
      <SearchableSEO
        title="Fashion Trend Analysis - Current Trends & Style Predictions | Style Shepherd"
        description="Discover the latest fashion trends, trending styles, and seasonal fashion predictions. Analyze fashion trends with AI-powered trend analysis. Get personalized fashion recommendations based on current trends."
        products={seoProducts}
        searchQuery={keywords}
        totalResults={demoProducts.length}
      />
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8" />
              Trend Analysis Dashboard
            </h1>
            <p className="text-muted-foreground">
              View trending categories, clusters, and demo product recommendations
            </p>
          </div>
          {isMockMode && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              Mock Mode
            </Badge>
          )}
        </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="linen,denim,blazer"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchCombined} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh Trends'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clusters Grid */}
      {combinedData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Style Clusters (Trend + Popularity Combined)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sortedClusters.map((cluster) => (
                  <Card key={cluster.cluster_id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {cluster.category}
                        </CardTitle>
                        <Badge variant="secondary">
                          #{cluster.cluster_id}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Combined:</span>
                          <span className="font-semibold">
                            {(cluster.combined_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trend:</span>
                          <span>{(cluster.trend_score * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Popularity:</span>
                          <span>{(cluster.cluster_pop_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Extra Trends */}
          {sortedExtraTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Trending Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sortedExtraTrends.map((trend) => (
                    <Badge
                      key={trend.category}
                      variant="outline"
                      className="text-sm py-1 px-3"
                    >
                      {trend.category}
                      <span className="ml-2 font-semibold">
                        {(trend.trend_score * 100).toFixed(0)}%
                      </span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Demo Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Demo Product Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demoProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {demoProducts.map((product) => (
                    <Card key={product.id} className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{product.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">${product.price}</span>
                          <Badge variant="outline">{product.trendCategory}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trend Score:</span>
                            <span className="font-semibold">
                              {(product.trendScore * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Size:</span>
                            <span>{product.sizeRecommendation}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Size Confidence:</span>
                            <span>{product.sizeConfidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Return Risk:</span>
                            <Badge
                              variant={
                                product.returnRiskLabel === 'low' ? 'default' : 'destructive'
                              }
                            >
                              {(product.returnRiskScore * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No demo products available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Generated at:</span>{' '}
                  {new Date(combinedData.generated_at).toLocaleString()}
                </div>
                {combinedData.reference_asset && (
                  <div>
                    <span className="font-semibold">Reference asset:</span>{' '}
                    {combinedData.reference_asset}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Clusters:</span> {combinedData.clusters.length}
                </div>
                <div>
                  <span className="font-semibold">Extra trends:</span>{' '}
                  {combinedData.extra_trends.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </>
  );
}
