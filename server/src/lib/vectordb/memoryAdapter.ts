/**
 * In-Memory Vector DB Adapter
 * Simple in-memory implementation for development/testing
 * Not suitable for production - use for local dev only
 */

import {
  VectorDBAdapter,
  VectorDBUpsertItem,
  VectorDBQueryOptions,
  VectorDBQueryResult,
} from '../providers.js';

function cosineSimilarity(a: number[], b: number[]): number {
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
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class MemoryVectorDBAdapter implements VectorDBAdapter {
  meta = {
    id: 'memory-vectordb',
    kind: 'vectordb' as const,
    name: 'In-Memory Vector DB',
    priority: 50, // Lower priority - only for dev
  };

  private vectors: Map<string, { values: number[]; metadata?: Record<string, any> }> =
    new Map();

  constructor(options?: { priority?: number }) {
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
    console.warn('⚠️ Using in-memory vector DB - data will be lost on restart');
  }

  async upsert(items: VectorDBUpsertItem[]): Promise<void> {
    for (const item of items) {
      this.vectors.set(item.id, {
        values: item.values,
        metadata: item.metadata || {},
      });
    }
  }

  async query(
    embedding: number[],
    topK: number,
    opts: VectorDBQueryOptions = {}
  ): Promise<VectorDBQueryResult[]> {
    const results: Array<{ id: string; score: number; metadata?: Record<string, any> }> = [];

    for (const [id, vec] of this.vectors.entries()) {
      // Apply filter if provided
      if (opts.filter) {
        let matches = true;
        for (const [key, value] of Object.entries(opts.filter)) {
          if (vec.metadata?.[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      const score = cosineSimilarity(embedding, vec.values);
      results.push({
        id,
        score,
        metadata: opts.includeMetadata !== false ? vec.metadata : undefined,
      });
    }

    // Sort by score descending and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }
}
