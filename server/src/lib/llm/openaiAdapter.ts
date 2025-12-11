/**
 * OpenAI LLM Adapter
 * Wraps OpenAI API as a provider adapter
 */

import { LLMAdapter, LLMGenerateOptions, LLMResponse } from '../providers.js';
import OpenAI from 'openai';

export class OpenAIAdapter implements LLMAdapter {
  meta = {
    id: 'openai',
    kind: 'llm' as const,
    name: 'OpenAI',
    priority: 10,
  };

  private client: OpenAI;

  constructor(apiKey: string, options?: { model?: string; priority?: number }) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
  }

  async generate(prompt: string, opts: LLMGenerateOptions = {}): Promise<LLMResponse> {
    const model = opts.model || 'gpt-4o-mini';
    const maxTokens = opts.maxTokens || 500;
    const temperature = opts.temperature ?? 0.7;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        text: choice.message.content || '',
        tokens: response.usage?.total_tokens,
        model: response.model,
        finishReason: choice.finish_reason || undefined,
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message || error}`);
    }
  }

  async stream(
    prompt: string,
    opts: LLMGenerateOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    const model = opts.model || 'gpt-4o-mini';
    const maxTokens = opts.maxTokens || 500;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content && onChunk) {
          onChunk(content);
        }
      }
    } catch (error: any) {
      throw new Error(`OpenAI streaming error: ${error.message || error}`);
    }
  }
}
