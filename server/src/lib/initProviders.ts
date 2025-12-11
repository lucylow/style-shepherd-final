/**
 * Provider Initialization
 * Registers default providers at server startup
 */

import providerRegistry from './providerRegistry.js';
import { OpenAIAdapter } from './llm/openaiAdapter.js';
import { OpenAIEmbeddingsAdapter } from './embeddings/openaiEmbeddings.js';
import { ElevenLabsAdapter } from './tts/elevenlabsAdapter.js';
import { PostgresVectorDBAdapter } from './vectordb/postgresAdapter.js';
import { MemoryVectorDBAdapter } from './vectordb/memoryAdapter.js';
import env from '../config/env.js';

/**
 * Initialize default providers from environment variables
 */
export async function initProviders(): Promise<void> {
  console.log('🔧 Initializing provider registry...');

  // Register OpenAI LLM if API key is available
  if (env.OPENAI_API_KEY) {
    try {
      const llmAdapter = new OpenAIAdapter(env.OPENAI_API_KEY, {
        priority: 10,
      });
      providerRegistry.register(llmAdapter);
      console.log('✅ Registered OpenAI LLM provider');
    } catch (error: any) {
      console.warn('⚠️ Failed to register OpenAI LLM:', error.message);
    }
  }

  // Register OpenAI Embeddings if API key is available
  if (env.OPENAI_API_KEY) {
    try {
      const embAdapter = new OpenAIEmbeddingsAdapter(env.OPENAI_API_KEY, {
        model: 'text-embedding-3-small',
        priority: 10,
      });
      providerRegistry.register(embAdapter);
      console.log('✅ Registered OpenAI Embeddings provider');
    } catch (error: any) {
      console.warn('⚠️ Failed to register OpenAI Embeddings:', error.message);
    }
  }

  // Register ElevenLabs TTS if API key is available
  const elevenLabsKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
  if (elevenLabsKey) {
    try {
      const ttsAdapter = new ElevenLabsAdapter(elevenLabsKey, {
        priority: 10,
      });
      providerRegistry.register(ttsAdapter);
      console.log('✅ Registered ElevenLabs TTS provider');
    } catch (error: any) {
      console.warn('⚠️ Failed to register ElevenLabs TTS:', error.message);
    }
  }

  // Register PostgreSQL Vector DB (always available if postgres is configured)
  try {
    const pgAdapter = new PostgresVectorDBAdapter({
      tableName: 'product_embeddings',
      priority: 10,
    });
    providerRegistry.register(pgAdapter);
    console.log('✅ Registered PostgreSQL Vector DB provider');
  } catch (error: any) {
    console.warn('⚠️ Failed to register PostgreSQL Vector DB:', error.message);
  }

  // Register in-memory vector DB as fallback (dev only)
  if (env.NODE_ENV === 'development') {
    try {
      const memoryAdapter = new MemoryVectorDBAdapter({
        priority: 50, // Lower priority - only used if postgres fails
      });
      providerRegistry.register(memoryAdapter);
      console.log('✅ Registered In-Memory Vector DB provider (dev fallback)');
    } catch (error: any) {
      console.warn('⚠️ Failed to register In-Memory Vector DB:', error.message);
    }
  }

  const allProviders = providerRegistry.getAllProviders();
  const totalCount =
    allProviders.llm.length +
    allProviders.embeddings.length +
    allProviders.tts.length +
    allProviders.vectordb.length;

  console.log(`✅ Provider initialization complete: ${totalCount} providers registered`);
  console.log(`   - LLM: ${allProviders.llm.length}`);
  console.log(`   - Embeddings: ${allProviders.embeddings.length}`);
  console.log(`   - TTS: ${allProviders.tts.length}`);
  console.log(`   - Vector DB: ${allProviders.vectordb.length}`);
}
