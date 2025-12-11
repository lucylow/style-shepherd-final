/**
 * Provider Registry
 * Manages provider registration, selection, and failover logic
 */

import {
  LLMAdapter,
  EmbeddingsAdapter,
  TTSAdapter,
  VectorDBAdapter,
  ProviderMeta,
  ProviderKind,
} from './providers.js';

type AnyAdapter = LLMAdapter | EmbeddingsAdapter | TTSAdapter | VectorDBAdapter;

class ProviderRegistry {
  private llms: Map<string, LLMAdapter> = new Map();
  private embs: Map<string, EmbeddingsAdapter> = new Map();
  private tts: Map<string, TTSAdapter> = new Map();
  private vdbs: Map<string, VectorDBAdapter> = new Map();

  /**
   * Register a provider adapter
   */
  register(adapter: AnyAdapter): void {
    const meta = (adapter as any).meta as ProviderMeta;
    if (!meta || !meta.id) {
      throw new Error('Provider must include meta.id');
    }
    switch (meta.kind) {
      case 'llm':
        this.llms.set(meta.id, adapter as LLMAdapter);
        break;
      case 'embeddings':
        this.embs.set(meta.id, adapter as EmbeddingsAdapter);
        break;
      case 'tts':
        this.tts.set(meta.id, adapter as TTSAdapter);
        break;
      case 'vectordb':
        this.vdbs.set(meta.id, adapter as VectorDBAdapter);
        break;
      default:
        throw new Error(`Unknown provider kind: ${meta.kind}`);
    }
    console.log(`✅ Registered ${meta.kind} provider: ${meta.id}`);
  }

  /**
   * Unregister a provider
   */
  unregister(kind: ProviderKind, id: string): boolean {
    switch (kind) {
      case 'llm':
        return this.llms.delete(id);
      case 'embeddings':
        return this.embs.delete(id);
      case 'tts':
        return this.tts.delete(id);
      case 'vectordb':
        return this.vdbs.delete(id);
      default:
        return false;
    }
  }

  /**
   * List all registered providers of a kind
   */
  list(kind: ProviderKind): ProviderMeta[] {
    let adapters: AnyAdapter[] = [];
    switch (kind) {
      case 'llm':
        adapters = Array.from(this.llms.values());
        break;
      case 'embeddings':
        adapters = Array.from(this.embs.values());
        break;
      case 'tts':
        adapters = Array.from(this.tts.values());
        break;
      case 'vectordb':
        adapters = Array.from(this.vdbs.values());
        break;
    }
    return adapters
      .filter((a) => a.meta.enabled !== false)
      .map((a) => a.meta)
      .sort((a, b) => (a.priority || 50) - (b.priority || 50));
  }

  /**
   * Select provider by priority (lowest priority number = preferred)
   */
  selectLLM(policy?: any): LLMAdapter | null {
    const arr = Array.from(this.llms.values())
      .filter((a) => a.meta.enabled !== false)
      .sort((a, b) => (a.meta.priority || 50) - (b.meta.priority || 50));
    return arr[0] || null;
  }

  selectEmbeddings(): EmbeddingsAdapter | null {
    const arr = Array.from(this.embs.values())
      .filter((a) => a.meta.enabled !== false)
      .sort((a, b) => (a.meta.priority || 50) - (b.meta.priority || 50));
    return arr[0] || null;
  }

  selectTTS(): TTSAdapter | null {
    const arr = Array.from(this.tts.values())
      .filter((a) => a.meta.enabled !== false)
      .sort((a, b) => (a.meta.priority || 50) - (b.meta.priority || 50));
    return arr[0] || null;
  }

  selectVectorDB(): VectorDBAdapter | null {
    const arr = Array.from(this.vdbs.values())
      .filter((a) => a.meta.enabled !== false)
      .sort((a, b) => (a.meta.priority || 50) - (b.meta.priority || 50));
    return arr[0] || null;
  }

  /**
   * Try call with failover: attempt providers in priority order, returning first success
   */
  async failoverCall<T>(
    kind: ProviderKind,
    fnName: string,
    args: any[]
  ): Promise<T> {
    let candidates: AnyAdapter[] = [];
    switch (kind) {
      case 'llm':
        candidates = Array.from(this.llms.values());
        break;
      case 'embeddings':
        candidates = Array.from(this.embs.values());
        break;
      case 'tts':
        candidates = Array.from(this.tts.values());
        break;
      case 'vectordb':
        candidates = Array.from(this.vdbs.values());
        break;
    }

    // Filter enabled and sort by priority
    candidates = candidates
      .filter((a) => a.meta.enabled !== false)
      .sort((a: any, b: any) => (a.meta.priority || 50) - (b.meta.priority || 50));

    let lastErr: any;
    for (const c of candidates) {
      try {
        const res = await (c as any)[fnName](...args);
        // Optionally update metrics: success
        return res;
      } catch (err: any) {
        lastErr = err;
        // Log error and continue; mark provider as degraded if needed
        console.warn(
          `[provider failover] ${c.meta.id} error:`,
          err.message || err
        );
      }
    }
    throw lastErr ?? new Error(`No ${kind} providers configured or available`);
  }

  /**
   * Get all providers (for admin UI)
   */
  getAllProviders(): {
    llm: ProviderMeta[];
    embeddings: ProviderMeta[];
    tts: ProviderMeta[];
    vectordb: ProviderMeta[];
  } {
    return {
      llm: this.list('llm'),
      embeddings: this.list('embeddings'),
      tts: this.list('tts'),
      vectordb: this.list('vectordb'),
    };
  }

  /**
   * Get provider by ID
   */
  getProvider(kind: ProviderKind, id: string): AnyAdapter | null {
    switch (kind) {
      case 'llm':
        return this.llms.get(id) || null;
      case 'embeddings':
        return this.embs.get(id) || null;
      case 'tts':
        return this.tts.get(id) || null;
      case 'vectordb':
        return this.vdbs.get(id) || null;
      default:
        return null;
    }
  }
}

export const providerRegistry = new ProviderRegistry();
export default providerRegistry;
