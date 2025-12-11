/**
 * Personalization Engine
 * Provider-agnostic personalization that uses the provider registry
 * Combines semantic search, user preferences, and re-ranking
 */

import providerRegistry from '../providerRegistry.js';
import { vultrPostgres } from '../vultr-postgres.js';

export interface PersonalizedRecommendation {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  explanation?: string;
}

export interface PersonalizationContext {
  query?: string;
  intent?: string;
  occasion?: string;
  budget?: number;
  userId?: string;
}

export interface PersonalizationOptions {
  topK?: number;
  rerankTop?: number;
  useSemanticSearch?: boolean;
  usePreferences?: boolean;
}

/**
 * Generate personalized recommendations
 */
export async function personalizedRecommendations(
  userId: string,
  context: PersonalizationContext = {},
  opts: PersonalizationOptions = {}
): Promise<PersonalizedRecommendation[]> {
  const topK = opts.topK || 50;
  const rerankTop = opts.rerankTop || 10;
  const useSemanticSearch = opts.useSemanticSearch !== false;
  const usePreferences = opts.usePreferences !== false;

  try {
    // 1) Get user profile & preferences
    let userProfile: any = null;
    let preferences: any[] = [];

    if (usePreferences) {
      try {
        const userResult = await vultrPostgres.query<{
          id: string;
          email: string;
          preferences: any;
          size: string;
          budget: number;
        }>(
          `SELECT id, email, preferences, size, budget FROM users WHERE id = $1`,
          [userId]
        );
        userProfile = userResult[0] || null;

        // Get preferences from interactions/preferences table if exists
        const prefsResult = await vultrPostgres.query<{ key: string; value: any }>(
          `SELECT key, value FROM preferences WHERE user_id = $1`,
          [userId]
        ).catch(() => []);
        preferences = prefsResult || [];
      } catch (error) {
        console.warn('Failed to fetch user profile:', error);
      }
    }

    // 2) Get embedding for query (if present and semantic search enabled)
    let qemb: number[] | null = null;
    if (context.query && useSemanticSearch) {
      try {
        const embAdapter = providerRegistry.selectEmbeddings();
        if (embAdapter) {
          const result = await embAdapter.embed(context.query);
          qemb = Array.isArray(result) && typeof result[0] === 'number' ? result as number[] : (result as number[][])[0];
        }
      } catch (error) {
        console.warn('Failed to generate query embedding:', error);
      }
    }

    // 3) Candidate generation via vector DB semantic search or database
    let candidates: Array<{ id: string; score: number; metadata?: any }> = [];

    if (qemb && useSemanticSearch) {
      const vdb = providerRegistry.selectVectorDB();
      if (vdb) {
        try {
          const hits = await vdb.query(qemb, topK);
          candidates = hits.map((h) => ({
            id: h.id,
            score: h.score || 0,
            metadata: h.metadata,
          }));
        } catch (error) {
          console.warn('Vector DB query failed, falling back to database:', error);
        }
      }
    }

    // Fallback: fetch products from database
    if (candidates.length === 0) {
      try {
        const productResult = await vultrPostgres.query<any>(
          `SELECT id, name, price, category, brand, color, style, rating, reviews_count, stock, description
           FROM catalog
           WHERE stock > 0
           ORDER BY rating DESC, reviews_count DESC
           LIMIT $1`,
          [topK]
        );
        candidates = productResult.map((p: any) => ({
          id: p.id,
          score: 0,
          metadata: p,
        }));
      } catch (error) {
        console.error('Failed to fetch products from database:', error);
        return [];
      }
    }

    // 4) Re-rank candidates using user preferences and heuristics
    const scored = await Promise.all(
      candidates.map(async (c) => {
        const product = c.metadata?.id
          ? c.metadata
          : await getProductById(c.id);

        if (!product) {
          return null;
        }

        let score = (c.score || 0) * 1.0; // Start with semantic similarity score

        // Preference matching
        if (userProfile && preferences.length > 0) {
          // Brand match
          const preferredBrand = preferences.find((p) => p.key === 'preferred_brand');
          if (preferredBrand && product.brand === preferredBrand.value) {
            score += 0.4;
          }

          // Color match
          const preferredColor = preferences.find((p) => p.key === 'preferred_color');
          if (preferredColor && product.color === preferredColor.value) {
            score += 0.3;
          }

          // Size match
          if (userProfile.size && product.sizes) {
            const sizes = Array.isArray(product.sizes)
              ? product.sizes
              : JSON.parse(product.sizes || '[]');
            if (sizes.includes(userProfile.size)) {
              score += 0.3;
            }
          }
        }

        // Price match
        if (context.budget && userProfile?.budget) {
          const budget = context.budget || userProfile.budget;
          const price = product.price || 0;
          if (price <= budget) {
            score += 0.2;
          } else if (price <= budget * 1.2) {
            score += 0.1;
          }
        }

        // Rating boost
        const rating = product.rating || 0;
        if (rating >= 4.5) score += 0.15;
        else if (rating >= 4.0) score += 0.1;
        else if (rating >= 3.5) score += 0.05;

        // Recency boost (if product has created_at)
        if (product.created_at) {
          const ageDays =
            (Date.now() - new Date(product.created_at).getTime()) / (1000 * 3600 * 24);
          score += Math.max(0, 0.1 - ageDays / 365);
        }

        return {
          id: product.id || c.id,
          score: Math.min(1, score), // Cap at 1.0
          metadata: product,
          explanation: generateExplanation(product, score, userProfile, preferences),
        };
      })
    );

    // Filter out nulls and sort by score
    const valid = scored.filter((s): s is PersonalizedRecommendation => {
      return s !== null && typeof s === 'object' && 'id' in s && 'score' in s;
    });
    valid.sort((a, b) => b.score - a.score);

    // Return top N
    return valid.slice(0, rerankTop);
  } catch (error: any) {
    console.error('Personalization error:', error);
    throw new Error(`Personalization failed: ${error.message || error}`);
  }
}

/**
 * Get product by ID from database
 */
async function getProductById(id: string): Promise<any> {
  try {
    const result = await vultrPostgres.query<any>(
      `SELECT id, name, price, category, brand, color, style, rating, reviews_count, stock, description, sizes, created_at
       FROM catalog WHERE id = $1`,
      [id]
    );
    return result[0] || null;
  } catch (error) {
    console.warn('Failed to fetch product:', error);
    return null;
  }
}

/**
 * Generate explanation for recommendation
 */
function generateExplanation(
  product: any,
  score: number,
  userProfile: any,
  preferences: any[]
): string {
  const reasons: string[] = [];

  if (score > 0.7) {
    reasons.push('Highly personalized match');
  }

  if (userProfile) {
    const brandPref = preferences.find((p) => p.key === 'preferred_brand');
    if (brandPref && product.brand === brandPref.value) {
      reasons.push(`Matches your preferred brand: ${product.brand}`);
    }
  }

  if (product.rating >= 4.5) {
    reasons.push('Highly rated product');
  }

  if (product.reviews_count > 100) {
    reasons.push('Popular choice');
  }

  return reasons.length > 0 ? reasons.join('. ') : 'Recommended for you';
}
