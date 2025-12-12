/**
 * Trend Adapter
 * Provides a unified interface to the trend microservice with deterministic mock fallback
 */

import fetch from 'node-fetch';
import { MOCK_COMBINED } from './mocks.js';

const BASE = process.env.TREND_SERVICE_BASE_URL || 'http://localhost:8000';
const ENABLE = process.env.ENABLE_TREND_SERVICE === 'true';

interface TrendScores {
  source?: string;
  scores?: Record<string, number>;
  [key: string]: any;
}

interface ClusterData {
  meta?: {
    n_clusters: number;
    source: string;
  };
  clusters: Array<{
    cluster_id: number;
    category?: string;
    count?: number;
    cluster_pop_score?: number;
    trend_score?: number;
    combined_score?: number;
    [key: string]: any;
  }>;
}

interface CombinedResponse {
  clusters: Array<{
    cluster_id: number;
    category: string;
    cluster_pop_score: number;
    trend_score: number;
    combined_score: number;
    sample_indices?: number[];
  }>;
  extra_trends: Array<{
    category: string;
    trend_score: number;
  }>;
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

interface DemoRecommendationResponse {
  generated_at: string;
  products: DemoProduct[];
  reference_asset?: string;
}

/**
 * Safe fetch wrapper with timeout and error handling
 */
async function safeFetch(path: string, opts: any = {}): Promise<any> {
  const url = `${BASE}${path}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, {
      signal: controller.signal,
      timeout: 5000,
      ...opts,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`trend service ${res.status}`);
    }
    
    return await res.json();
  } catch (err: any) {
    // Deterministic fallback
    const errorMsg = err?.message || String(err);
    console.warn(`[trendAdapter] safeFetch failed - using mock: ${errorMsg}`);
    return null;
  }
}

/**
 * Get trend scores for keywords
 */
export async function getTrends(keywords: string[] = []): Promise<TrendScores> {
  if (!ENABLE) {
    console.warn('[trendAdapter] ENABLE_TREND_SERVICE=false, using mock data');
    return { source: 'mock', scores: MOCK_COMBINED.trendScores };
  }

  if (keywords.length === 0) {
    return { source: 'mock', scores: MOCK_COMBINED.trendScores };
  }

  const q = keywords.join(',');
  const resp = await safeFetch(`/api/trends?keywords=${encodeURIComponent(q)}`);
  
  if (resp && resp.scores) {
    return resp;
  }
  
  // Fallback to deterministic mock
  return { source: 'mock', scores: MOCK_COMBINED.trendScores };
}

/**
 * Get fashion clusters
 */
export async function getClusters(n_clusters: number = 8): Promise<ClusterData> {
  if (!ENABLE) {
    console.warn('[trendAdapter] ENABLE_TREND_SERVICE=false, using mock clusters');
    return MOCK_COMBINED.clusters;
  }

  const resp = await safeFetch(`/api/clusters?n_clusters=${n_clusters}`);
  
  if (resp) {
    return resp;
  }
  
  return MOCK_COMBINED.clusters;
}

/**
 * Get combined trend and cluster data
 */
export async function getCombined(
  keywords: string[] = [],
  n_clusters: number = 8
): Promise<CombinedResponse> {
  if (!ENABLE) {
    console.warn('[trendAdapter] ENABLE_TREND_SERVICE=false, using mock combined data');
    return MOCK_COMBINED.combined;
  }

  const q = keywords.length > 0 ? keywords.join(',') : '';
  const path = q
    ? `/api/combined?keywords=${encodeURIComponent(q)}&n_clusters=${n_clusters}`
    : `/api/combined?n_clusters=${n_clusters}`;
  
  const resp = await safeFetch(path);
  
  if (resp) {
    return resp;
  }
  
  return MOCK_COMBINED.combined;
}

/**
 * Get demo product recommendations with trend scoring
 */
export async function demoRecommendation(
  keywords: string[] = [],
  limit: number = 6
): Promise<DemoRecommendationResponse> {
  if (!ENABLE) {
    console.warn('[trendAdapter] ENABLE_TREND_SERVICE=false, using mock demo products');
    return MOCK_COMBINED.demoProducts;
  }

  const q = keywords.length > 0 ? keywords.join(',') : '';
  const path = q
    ? `/api/demo-recommendation?keywords=${encodeURIComponent(q)}&limit=${limit}`
    : `/api/demo-recommendation?limit=${limit}`;
  
  const resp = await safeFetch(path);
  
  if (resp) {
    return resp;
  }
  
  return MOCK_COMBINED.demoProducts;
}

export type { TrendScores, ClusterData, CombinedResponse, DemoProduct, DemoRecommendationResponse };
