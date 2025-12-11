/**
 * PostgreSQL Vector DB Adapter (using pgvector extension)
 * Simple adapter for PostgreSQL with vector similarity search
 */

import { VectorDBAdapter, VectorDBUpsertItem, VectorDBQueryOptions, VectorDBQueryResult } from '../providers.js';
import { vultrPostgres } from '../vultr-postgres.js';

export class PostgresVectorDBAdapter implements VectorDBAdapter {
  meta = {
    id: 'postgres-vectordb',
    kind: 'vectordb' as const,
    name: 'PostgreSQL (pgvector)',
    priority: 10,
  };

  private tableName: string;
  private vultrPostgres: any;

  constructor(options?: { tableName?: string; priority?: number }) {
    this.tableName = options?.tableName || 'product_embeddings';
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
    // Lazy import to avoid circular dependencies
    this.initPostgres();
  }

  private async initPostgres() {
    if (!this.vultrPostgres) {
      const { vultrPostgres } = await import('../vultr-postgres.js');
      this.vultrPostgres = vultrPostgres;
    }
  }

  async upsert(vectors: VectorDBUpsertItem[]): Promise<void> {
    if (vectors.length === 0) return;

    try {
      await this.initPostgres();
      // Ensure table exists with pgvector extension
      await this.ensureTable();

      // Batch upsert
      for (const vec of vectors) {
        await this.vultrPostgres.query(
          `INSERT INTO ${this.tableName} (id, embedding, metadata)
           VALUES ($1, $2::vector, $3::jsonb)
           ON CONFLICT (id) DO UPDATE SET
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             updated_at = CURRENT_TIMESTAMP`,
          [vec.id, JSON.stringify(vec.values), JSON.stringify(vec.metadata || {})]
        );
      }
    } catch (error: any) {
      throw new Error(`PostgreSQL vector DB upsert error: ${error.message || error}`);
    }
  }

  async query(
    embedding: number[],
    topK: number,
    opts: VectorDBQueryOptions = {}
  ): Promise<VectorDBQueryResult[]> {
    try {
      await this.ensureTable();

      // Build filter clause if provided
      let filterClause = '';
      const filterParams: any[] = [JSON.stringify(embedding), topK];
      let paramIndex = 3;

      if (opts.filter) {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(opts.filter)) {
          conditions.push(`metadata->>$${paramIndex} = $${paramIndex + 1}`);
          filterParams.push(key, value);
          paramIndex += 2;
        }
        if (conditions.length > 0) {
          filterClause = `WHERE ${conditions.join(' AND ')}`;
        }
      }

      // Use cosine similarity (pgvector)
      const query = `
        SELECT 
          id,
          1 - (embedding <=> $1::vector) as score,
          ${opts.includeMetadata !== false ? 'metadata' : "'{}'::jsonb as metadata"}
        FROM ${this.tableName}
        ${filterClause}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `;

      const result = await vultrPostgres.query<any>(query, filterParams);
      return result.map((row: any) => ({
        id: row.id,
        score: parseFloat(row.score) || 0,
        metadata: opts.includeMetadata !== false ? row.metadata : undefined,
      }));
    } catch (error: any) {
      throw new Error(`PostgreSQL vector DB query error: ${error.message || error}`);
    }
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    try {
      await this.initPostgres();
      await this.vultrPostgres.query(
        `DELETE FROM ${this.tableName} WHERE id = ANY($1::text[])`,
        [ids]
      );
    } catch (error: any) {
      throw new Error(`PostgreSQL vector DB delete error: ${error.message || error}`);
    }
  }

  private async ensureTable(): Promise<void> {
    try {
      // Check if pgvector extension exists
      await vultrPostgres.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Create table if it doesn't exist
      await vultrPostgres.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          embedding vector(1536), -- Default dimension, adjust as needed
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for vector similarity search
      await this.vultrPostgres.query(`
        CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx 
        ON ${this.tableName} 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    } catch (error: any) {
      // Table might already exist or pgvector not available
      console.warn('Table creation/check warning:', error.message);
    }
  }
}
