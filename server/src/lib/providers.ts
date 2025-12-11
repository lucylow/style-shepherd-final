/**
 * Provider Abstraction Layer
 * Defines interfaces for pluggable providers (LLM, embeddings, TTS, vector DBs)
 * Enables vendor-agnostic personalization without lock-in
 */

export type ProviderKind = 'llm' | 'embeddings' | 'tts' | 'vectordb';

export interface ProviderMeta {
  id: string;           // e.g. "openai-prod", "eleven-demo", "pinecone-us"
  kind: ProviderKind;
  name?: string;
  priority?: number;    // lower = prefer first
  region?: string;
  enabled?: boolean;   // can be toggled at runtime
  // other metadata for routing decisions
}

export interface LLMAdapter {
  meta: ProviderMeta;
  generate(prompt: string, opts?: LLMGenerateOptions): Promise<LLMResponse>;
  stream?(prompt: string, opts?: LLMGenerateOptions, onChunk?: (chunk: string) => void): Promise<void>;
}

export interface LLMGenerateOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  [key: string]: any; // allow provider-specific options
}

export interface LLMResponse {
  text: string;
  tokens?: number;
  model?: string;
  finishReason?: string;
}

export interface EmbeddingsAdapter {
  meta: ProviderMeta;
  embed(texts: string[] | string): Promise<number[][] | number[]>;
  dimension(): number;
}

export interface TTSAdapter {
  meta: ProviderMeta;
  synthesize(text: string, opts?: TTSSynthesizeOptions): Promise<TTSResult>;
}

export interface TTSSynthesizeOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  useCache?: boolean;
  [key: string]: any;
}

export interface TTSResult {
  url?: string;        // URL to audio file
  audio?: Buffer;      // Audio buffer
  cached?: boolean;
  contentType?: string;
}

export interface VectorDBAdapter {
  meta: ProviderMeta;
  upsert(vectors: VectorDBUpsertItem[]): Promise<void>;
  query(embedding: number[], topK: number, opts?: VectorDBQueryOptions): Promise<VectorDBQueryResult[]>;
  delete(ids: string[]): Promise<void>;
}

export interface VectorDBUpsertItem {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface VectorDBQueryOptions {
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  namespace?: string;
  [key: string]: any;
}

export interface VectorDBQueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}
