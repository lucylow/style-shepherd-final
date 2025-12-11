/**
 * Cerebras LLM Adapter
 * Wraps Cerebras API as a provider adapter
 * Uses OpenAI-compatible API endpoint
 */

import { LLMAdapter, LLMGenerateOptions, LLMResponse } from '../providers.js';

interface CerebrasMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CerebrasChatCompletionRequest {
  model: string;
  messages: CerebrasMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface CerebrasChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface CerebrasStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class CerebrasAdapter implements LLMAdapter {
  meta = {
    id: 'cerebras',
    kind: 'llm' as const,
    name: 'Cerebras',
    priority: 5, // Higher priority than OpenAI (lower number = preferred)
  };

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(
    apiKey: string,
    options?: {
      model?: string;
      priority?: number;
      baseUrl?: string;
    }
  ) {
    if (!apiKey) {
      throw new Error('Cerebras API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || 'https://api.cerebras.ai/v1';
    this.defaultModel = options?.model || 'llama-3.3-70b';
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
  }

  async generate(prompt: string, opts: LLMGenerateOptions = {}): Promise<LLMResponse> {
    const model = opts.model || this.defaultModel;
    const maxTokens = opts.maxTokens || 500;
    const temperature = opts.temperature ?? 0.7;

    const messages: CerebrasMessage[] = [];
    if (opts.system) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: CerebrasChatCompletionRequest = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cerebras API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as CerebrasChatCompletionResponse;

      const choice = data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from Cerebras');
      }

      return {
        text: choice.message.content || '',
        tokens: data.usage?.total_tokens,
        model: data.model,
        finishReason: choice.finish_reason || undefined,
      };
    } catch (error: any) {
      throw new Error(`Cerebras API error: ${error.message || error}`);
    }
  }

  async stream(
    prompt: string,
    opts: LLMGenerateOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    const model = opts.model || this.defaultModel;
    const maxTokens = opts.maxTokens || 500;
    const temperature = opts.temperature ?? 0.7;

    const messages: CerebrasMessage[] = [];
    if (opts.system) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: CerebrasChatCompletionRequest = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cerebras API error: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Cerebras');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const chunk: CerebrasStreamChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              if (content && onChunk) {
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Cerebras streaming error: ${error.message || error}`);
    }
  }
}
