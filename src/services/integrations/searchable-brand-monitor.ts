/**
 * Searchable Brand Monitoring Service
 * 
 * Monitors fashion brand websites for SEO metrics, availability, and changes
 */

import { getApiBaseUrl } from '@/lib/api-config';
import { TrackedBrand, getTrackedBrands } from './brand-tracking-service';

export interface BrandSEOMetrics {
  brandName: string;
  website: string;
  status: 'online' | 'offline' | 'unknown';
  lastChecked: string;
  responseTime?: number;
  seoScore?: number;
  metaTitle?: string;
  metaDescription?: string;
  hasStructuredData?: boolean;
  pageLoadTime?: number;
  mobileFriendly?: boolean;
  errors?: string[];
}

export interface BrandMonitoringResult {
  brand: TrackedBrand;
  metrics: BrandSEOMetrics;
  timestamp: string;
}

/**
 * Check if a brand website is online and get basic metrics
 */
export async function checkBrandWebsite(brand: TrackedBrand): Promise<BrandSEOMetrics> {
  const startTime = Date.now();
  const metrics: BrandSEOMetrics = {
    brandName: brand.name,
    website: brand.website,
    status: 'unknown',
    lastChecked: new Date().toISOString(),
  };

  try {
    // Use backend API to check website (avoids CORS issues)
    const response = await fetch(`${getApiBaseUrl()}/brands/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website: brand.website }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      ...metrics,
      status: data.status || 'online',
      responseTime,
      seoScore: data.seoScore,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      hasStructuredData: data.hasStructuredData,
      pageLoadTime: data.pageLoadTime,
      mobileFriendly: data.mobileFriendly,
      errors: data.errors || [],
    };
  } catch (error: any) {
    return {
      ...metrics,
      status: 'offline',
      errors: [error.message || 'Failed to check website'],
    };
  }
}

/**
 * Monitor all tracked brands
 */
export async function monitorAllBrands(): Promise<BrandMonitoringResult[]> {
  const brands = getTrackedBrands();
  const results: BrandMonitoringResult[] = [];

  // Check brands in parallel (with rate limiting)
  const batchSize = 3;
  for (let i = 0; i < brands.length; i += batchSize) {
    const batch = brands.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (brand) => {
        const metrics = await checkBrandWebsite(brand);
        return {
          brand,
          metrics,
          timestamp: new Date().toISOString(),
        };
      })
    );
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < brands.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Get SEO metrics for a specific brand
 */
export async function getBrandSEOMetrics(brandName: string): Promise<BrandSEOMetrics | null> {
  const brands = getTrackedBrands();
  const brand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());

  if (!brand) {
    return null;
  }

  return checkBrandWebsite(brand);
}

/**
 * Compare SEO metrics across multiple brands
 */
export async function compareBrandSEO(brandNames: string[]): Promise<BrandMonitoringResult[]> {
  const brands = getTrackedBrands();
  const selectedBrands = brands.filter(brand =>
    brandNames.some(name => brand.name.toLowerCase() === name.toLowerCase())
  );

  const results = await Promise.all(
    selectedBrands.map(async (brand) => {
      const metrics = await checkBrandWebsite(brand);
      return {
        brand,
        metrics,
        timestamp: new Date().toISOString(),
      };
    })
  );

  return results;
}

/**
 * Track brand website changes over time
 */
export async function trackBrandChanges(
  brandName: string,
  days: number = 7
): Promise<BrandMonitoringResult[]> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/brands/history?brand=${encodeURIComponent(brandName)}&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error: any) {
    console.error('Failed to fetch brand history:', error);
    return [];
  }
}

/**
 * Get brand monitoring dashboard data
 */
export async function getBrandDashboardData(): Promise<{
  totalBrands: number;
  onlineBrands: number;
  averageSEOScore: number;
  recentChecks: BrandMonitoringResult[];
}> {
  const results = await monitorAllBrands();

  const onlineBrands = results.filter(r => r.metrics.status === 'online').length;
  const seoScores = results
    .map(r => r.metrics.seoScore)
    .filter((score): score is number => score !== undefined);
  const averageSEOScore = seoScores.length > 0
    ? seoScores.reduce((a, b) => a + b, 0) / seoScores.length
    : 0;

  return {
    totalBrands: results.length,
    onlineBrands,
    averageSEOScore: Math.round(averageSEOScore * 100) / 100,
    recentChecks: results.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
  };
}
