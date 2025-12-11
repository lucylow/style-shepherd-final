/**
 * Retrieval-augmented generation helper:
 * 1) search Raindrop SmartMemory for relevant context
 * 2) build prompt via promptTemplates
 * 3) call Vultr LLM (via existing lib/vultrClient.ts)
 * 4) post-process response and extract structured fields
 */

import { buildPrompt } from './promptTemplates.js';
import { callVultrInference } from './vultrClient.js';
import { searchMemory } from './raindropClient.js';
import { extractStructuredFields } from './fieldExtractor.js';

interface GenerateFashioniResponseOptions {
  userId?: string;
  userMessage?: string;
  model?: string;
  topK?: number;
  timeoutMs?: number;
}

interface FashioniResponse {
  success: boolean;
  source: string;
  assistantText: string;
  fields: {
    raw: string;
    size: string | null;
    fabrics: string[];
    colors: string[];
  };
  raw?: any;
}

/**
 * Get relevant memories from Raindrop SmartMemory
 */
async function getRelevantMemories(userId: string, query: string, topK: number = 5): Promise<any[]> {
  try {
    const result = await searchMemory(userId, query, topK);
    if (result && result.success) {
      // Normalize shape: prefer results else resp
      return result.results || (result.resp && Array.isArray(result.resp) ? result.resp : []) || [];
    }
  } catch (e) {
    console.warn('Raindrop memory search error, continuing without memories:', e);
  }
  
  // Fallback: no raindrop -> return []
  return [];
}

/**
 * Generate Fashioni response with RAG
 */
export async function generateFashioniResponse({
  userId = 'demo_user',
  userMessage = '',
  model = 'gpt-3.5-turbo',
  topK = 5,
  timeoutMs = 25000
}: GenerateFashioniResponseOptions = {}): Promise<FashioniResponse> {
  // 1) retrieve memories relevant to user message
  const memories = await getRelevantMemories(userId, userMessage, topK);
  const shortMemories = (memories || []).slice(0, topK).map(m => ({
    text: m.text || (m.resp && m.resp.text) || JSON.stringify(m)
  }));

  // 2) build prompt
  const prompt = buildPrompt({ userMessage, memories: shortMemories });

  // 3) call the LLM (Vultr wrapper expects messages chat format; reuse prompt as a single 'user' message)
  // Some providers expect chat messages; here we'll pass system + user messages for better control:
  const messages = [
    { role: 'system', content: 'You are Fashioni, a concise stylist assistant. Follow instructions strictly.' },
    { role: 'user', content: prompt }
  ];

  const result = await callVultrInference({ model, messages, timeoutMs });

  // 4) normalize output
  let assistantText = '';
  if (result && result.success) {
    if (Array.isArray(result.choices) && result.choices.length) {
      assistantText = result.choices[0].message?.content || String(result.choices[0]);
    } else if (typeof result.choices === 'string') {
      assistantText = result.choices;
    } else if (result.source === 'mock' && result.choices && result.choices[0]) {
      assistantText = result.choices[0].message?.content || JSON.stringify(result.choices[0]);
    }
  } else {
    assistantText = `Sorry — I couldn't reach the model. (${result?.error || 'unknown'})`;
  }

  // 5) extract structured fields heuristically
  const fields = extractStructuredFields(assistantText);

  return {
    success: !!(result && result.success),
    source: result?.source || 'unknown',
    assistantText,
    fields,
    raw: result
  };
}

export { extractStructuredFields };
