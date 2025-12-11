/**
 * OpenAI Embeddings Adapter
 * Wraps OpenAI embeddings API as a provider adapter
 */

import { EmbeddingsAdapter } from '../providers.js';

export class OpenAIEmbeddingsAdapter implements EmbeddingsAdapter {
  meta = {
    id: 'openai-emb',
    kind: 'embeddings' as const,
    name: 'OpenAI Embeddings',
    priority: 10,
  };

  private apiKey: string;
  private model: string;
  private _dimension: number;

  constructor(
    apiKey: string,
    options?: { model?: string; priority?: number }
  ) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.model = options?.model || 'text-embedding-3-small';
    this._dimension = this.model.includes('3-small') ? 1536 : 3072; // text-embedding-3-small = 1536, text-embedding-3-large = 3072
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
  }

  async embed(texts: string[] | string): Promise<number[][] | number[]> {
    const inputs = Array.isArray(texts) ? texts : [texts];
    const isSingle = !Array.isArray(texts);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: inputs,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`OpenAI embedding error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const embeddings = data.data.map((item: any) => item.embedding as number[]);

      return isSingle ? embeddings[0] : embeddings;
    } catch (error: any) {
      throw new Error(`OpenAI embeddings error: ${error.message || error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }
}
