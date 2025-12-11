/**
 * Trend Service
 * Wrapper service to interact with the Python FastAPI trend service
 */

import { ExternalServiceError } from '../lib/errors.js';
import env from '../config/env.js';

export interface TrendScores {
  [keyword: string]: number;
}

export interface TrendResponse {
  source: 'pytrends' | 'mock' | 'fallback_pytrends_error';
  timeframe?: string;
  scores: TrendScores;
  error?: string;
}

export interface MockTrend {
  category: string;
  score: number;
  note: string;
}

export interface MockTrendsResponse {
  generated_at: string;
  reference_asset?: string;
  trends: MockTrend[];
}

export interface ClusterInfo {
  cluster_id: number;
  count: number;
  sample_indices: number[];
  label_hint?: string;
  centroid_norm?: number;
}

export interface ClustersResponse {
  meta: {
    n_clusters: number;
    source: string;
    sampled?: number;
  };
  clusters: ClusterInfo[];
}

export interface CombinedTrendCluster {
  cluster_id: number;
  category: string;
  cluster_pop_score: number;
  trend_score: number;
  combined_score: number;
  sample_indices: number[];
}

export interface CombinedResponse {
  clusters: CombinedTrendCluster[];
  extra_trends: Array<{ category: string; trend_score: number }>;
  generated_at: string;
  reference_asset?: string;
}

export interface DemoProduct {
  id: string;
  title: string;
  price: number;
  image: string | null;
  sizeRecommendation: string;
  sizeConfidence: number;
  returnRiskScore: number;
  returnRiskLabel: string;
  trendCategory: string;
  trendScore: number;
}

export interface DemoRecommendationResponse {
  generated_at: string;
  products: DemoProduct[];
  reference_asset?: string;
}

class TrendService {
  private readonly baseURL: string;
  private readonly timeout: number = 30000; // 30 seconds

  constructor() {
    // Default to localhost:8000 if not configured
    this.baseURL = process.env.TREND_SERVICE_URL || env.TREND_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Check if the trend service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get trend scores for keywords using Google Trends (or mock fallback)
   */
  async getTrends(
    keywords: string[],
    timeframe: string = 'today 12-m'
  ): Promise<TrendResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const keywordsParam = keywords.join(',');
      const url = `${this.baseURL}/api/trends?keywords=${encodeURIComponent(keywordsParam)}&timeframe=${encodeURIComponent(timeframe)}`;

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError(
          'TrendService',
          `Failed to fetch trends: ${response.statusText}`,
          undefined,
          { status: response.status }
        );
      }

      return await response.json() as TrendResponse;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        'TrendService',
        'Failed to fetch trends',
        error
      );
    }
  }

  /**
   * Get curated mock trends (useful for demos)
   */
  async getMockTrends(): Promise<MockTrendsResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/api/mock-trends`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError(
          'TrendService',
          `Failed to fetch mock trends: ${response.statusText}`,
          undefined,
          { status: response.status }
        );
      }

      return await response.json() as MockTrendsResponse;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        'TrendService',
        'Failed to fetch mock trends',
        error
      );
    }
  }

  /**
   * Get Fashion-MNIST clusters
   */
  async getClusters(nClusters: number = 8, sampleLimit: number = 5000): Promise<ClustersResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const url = `${this.baseURL}/api/clusters?n_clusters=${nClusters}&sample_limit=${sampleLimit}`;

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError(
          'TrendService',
          `Failed to fetch clusters: ${response.statusText}`,
          undefined,
          { status: response.status }
        );
      }

      return await response.json() as ClustersResponse;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        'TrendService',
        'Failed to fetch clusters',
        error
      );
    }
  }

  /**
   * Get combined trends and clusters
   */
  async getCombined(
    keywords?: string[],
    nClusters: number = 8
  ): Promise<CombinedResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      let url = `${this.baseURL}/api/combined?n_clusters=${nClusters}`;
      if (keywords && keywords.length > 0) {
        url += `&keywords=${encodeURIComponent(keywords.join(','))}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError(
          'TrendService',
          `Failed to fetch combined trends: ${response.statusText}`,
          undefined,
          { status: response.status }
        );
      }

      return await response.json() as CombinedResponse;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        'TrendService',
        'Failed to fetch combined trends',
        error
      );
    }
  }

  /**
   * Get demo recommendations based on trends
   */
  async getDemoRecommendations(
    keywords?: string[],
    limit: number = 5
  ): Promise<DemoRecommendationResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      let url = `${this.baseURL}/api/demo-recommendation?limit=${limit}`;
      if (keywords && keywords.length > 0) {
        url += `&keywords=${encodeURIComponent(keywords.join(','))}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExternalServiceError(
          'TrendService',
          `Failed to fetch demo recommendations: ${response.statusText}`,
          undefined,
          { status: response.status }
        );
      }

      return await response.json() as DemoRecommendationResponse;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError(
        'TrendService',
        'Failed to fetch demo recommendations',
        error
      );
    }
  }
}

export const trendService = new TrendService();
