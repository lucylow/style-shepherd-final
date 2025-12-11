/**
 * Embeddings Utility Service
 * Handles text embeddings using OpenAI API with caching
 */

import env from '../config/env.js';
import { vultrValkey } from './vultr-valkey.js';
import { createHash } from 'crypto';

const OPENAI_API_KEY = env.OPENAI_API_KEY;
const EMBEDDINGS_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimension

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
}

/**
 * Generate embeddings for text(s) using OpenAI API
 */
export async function embedOpenAI(texts: string | string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const textArray = Array.isArray(texts) ? texts : [texts];

  // Check cache for each text
  const results: number[][] = [];
  const textsToEmbed: string[] = [];
  const textIndices: number[] = [];

  for (let i = 0; i < textArray.length; i++) {
    const text = textArray[i];
    const cacheKey = `embedding:${hashText(text)}`;

    try {
      const cached = await vultrValkey.get<number[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length === EMBEDDING_DIMENSION) {
        results[i] = cached;
        continue;
      }
    } catch (error) {
      // Cache miss or error, continue to API call
    }

    textsToEmbed.push(text);
    textIndices.push(i);
  }

  // If all texts were cached, return results
  if (textsToEmbed.length === 0) {
    return Array.isArray(texts) ? results : results[0] ? [results[0]] : [];
  }

  // Call OpenAI API for uncached texts
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDINGS_MODEL,
        input: textsToEmbed,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenAI embedding error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    const embeddings = data.data.map((item: any) => item.embedding as number[]);

    // Cache embeddings and populate results
    for (let i = 0; i < embeddings.length; i++) {
      const embedding = embeddings[i];
      const originalIndex = textIndices[i];
      const text = textsToEmbed[i];
      const cacheKey = `embedding:${hashText(text)}`;

      // Cache for 7 days
      try {
        await vultrValkey.set(cacheKey, embedding, 7 * 24 * 60 * 60);
      } catch (error) {
        // Cache error is non-critical
        console.warn('Failed to cache embedding:', error);
      }

      results[originalIndex] = embedding;
    }

    return Array.isArray(texts) ? results : results[0] ? [results[0]] : [];
  } catch (error: any) {
    console.error('OpenAI embedding API error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Hash text for cache key
 */
function hashText(text: string): string {
  return createHash('sha256').update(text.toLowerCase().trim()).digest('hex').substring(0, 16);
}

/**
 * Ensure product has embedding (generate if missing)
 */
export async function ensureProductEmbedding(
  product: {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    category?: string;
  }
): Promise<number[]> {
  // Build text representation for embedding
  const textParts: string[] = [product.name];
  
  if (product.description) {
    textParts.push(product.description);
  }
  
  if (product.brand) {
    textParts.push(`Brand: ${product.brand}`);
  }
  
  if (product.category) {
    textParts.push(`Category: ${product.category}`);
  }

  const text = textParts.join('. ');
  const [embedding] = await embedOpenAI([text]);
  
  return embedding;
}
