/**
 * Unit tests for trendAdapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node-fetch before importing trendAdapter
const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({
  default: (...args: any[]) => mockFetch(...args),
}));

describe('trendAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getTrends', () => {
    it('should return mock data when ENABLE_TREND_SERVICE is false', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      delete process.env.TREND_SERVICE_BASE_URL;
      
      // Re-import to pick up new env vars
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getTrends(['linen', 'denim']);
      
      expect(result.source).toBe('mock');
      expect(result.scores).toBeDefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call microservice when ENABLE_TREND_SERVICE is true', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'pytrends',
          scores: { linen: 0.85, denim: 0.72 },
        }),
      });

      // Re-import to pick up new env vars
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getTrends(['linen', 'denim']);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/trends'),
        expect.any(Object)
      );
      expect(result.source).toBe('pytrends');
      expect(result.scores).toEqual({ linen: 0.85, denim: 0.72 });
    });

    it('should fallback to mock when fetch fails', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getTrends(['linen', 'denim']);
      
      expect(result.source).toBe('mock');
      expect(result.scores).toBeDefined();
    });

    it('should fallback to mock when response is not ok', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getTrends(['linen', 'denim']);
      
      expect(result.source).toBe('mock');
    });
  });

  describe('getClusters', () => {
    it('should return mock clusters when ENABLE_TREND_SERVICE is false', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getClusters(8);
      
      expect(result.meta).toBeDefined();
      expect(result.clusters).toBeDefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call microservice when enabled', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      const mockClusters = {
        meta: { n_clusters: 8, source: 'fashion-mnist' },
        clusters: [{ cluster_id: 0, count: 100 }],
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClusters,
      });

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getClusters(8);
      
      expect(mockFetch).toHaveBeenCalled();
      expect(result.meta.n_clusters).toBe(8);
    });
  });

  describe('getCombined', () => {
    it('should return mock combined data when disabled', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getCombined(['linen'], 8);
      
      expect(result.clusters).toBeDefined();
      expect(result.extra_trends).toBeDefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call microservice with keywords', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      const mockCombined = {
        clusters: [{ cluster_id: 0, category: 'tops', combined_score: 0.8 }],
        extra_trends: [{ category: 'linen', trend_score: 0.92 }],
        generated_at: new Date().toISOString(),
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCombined,
      });

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getCombined(['linen'], 8);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('keywords=linen'),
        expect.any(Object)
      );
      expect(result.clusters).toBeDefined();
    });

    it('should handle timeout gracefully', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getCombined(['linen'], 8);
      
      // Should fallback to mock
      expect(result.clusters).toBeDefined();
    });
  });

  describe('demoRecommendation', () => {
    it('should return mock products when disabled', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.demoRecommendation(['linen'], 6);
      
      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
    });

    it('should call microservice when enabled', async () => {
      process.env.ENABLE_TREND_SERVICE = 'true';
      process.env.TREND_SERVICE_BASE_URL = 'http://localhost:8000';
      
      const mockProducts = {
        generated_at: new Date().toISOString(),
        products: [
          {
            id: 'demo-1',
            title: 'Test Product',
            price: 100,
            trendScore: 0.9,
          },
        ],
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProducts,
      });

      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.demoRecommendation(['linen'], 6);
      
      expect(result.products).toBeDefined();
      expect(result.products.length).toBeGreaterThan(0);
    });
  });

  describe('deterministic mocks', () => {
    it('should return consistent mock data across calls', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      
      const trendAdapter = await import('../trendAdapter.js');
      const result1 = await trendAdapter.getTrends(['linen']);
      const result2 = await trendAdapter.getTrends(['linen']);
      
      expect(result1.scores).toEqual(result2.scores);
    });

    it('should return mock combined data with expected structure', async () => {
      process.env.ENABLE_TREND_SERVICE = 'false';
      
      const trendAdapter = await import('../trendAdapter.js');
      const result = await trendAdapter.getCombined([], 8);
      
      expect(result).toHaveProperty('clusters');
      expect(result).toHaveProperty('extra_trends');
      expect(result).toHaveProperty('generated_at');
      expect(Array.isArray(result.clusters)).toBe(true);
      expect(Array.isArray(result.extra_trends)).toBe(true);
    });
  });
});
