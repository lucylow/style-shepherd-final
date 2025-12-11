import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '@/lib/api-config';

// Streaming AI chat for real-time fashion advice using Lovable AI

type Message = { role: 'user' | 'assistant'; content: string };

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

export async function streamFashionChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}) {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fashion-assistant`;

  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    // Handle rate limiting and payment errors
    if (resp.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (resp.status === 402) {
      throw new Error('AI credits depleted. Please add credits in Settings.');
    }
    if (!resp.ok || !resp.body) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to start chat stream');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // Incomplete JSON, put back and wait for more data
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    // Final flush for remaining buffer
    if (buffer.trim()) {
      for (let raw of buffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore partial leftovers */ }
      }
    }

    onDone();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (onError) {
      onError(errorObj);
    } else {
      console.error('Fashion chat error:', errorObj);
      throw errorObj;
    }
  }
}

/**
 * Get Fashioni response using RAG (Retrieval-Augmented Generation)
 * This uses the new /api/fashioni/respond endpoint with RAG, prompt templates, and field extraction
 */
export async function getFashioniResponse(
  message: string,
  userId: string = 'demo_user',
  model?: string
): Promise<FashioniResponse> {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/fashioni/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, message, model }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fashioni RAG response error:', error);
    throw error;
  }
}

export async function getStyleRecommendations({
  userProfile,
  preferences,
  context,
}: {
  userProfile?: {
    bodyType?: string;
    height?: string;
    sizePreferences?: string;
  };
  preferences?: {
    style?: string;
    budgetRange?: string;
  };
  context?: {
    occasion?: string;
  };
}) {
  const { data, error } = await supabase.functions.invoke('style-recommendations', {
    body: { userProfile, preferences, context },
  });

  if (error) {
    throw new Error(error.message || 'Failed to get style recommendations');
  }
  return data;
}
