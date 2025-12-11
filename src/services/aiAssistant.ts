import { supabase } from '@/integrations/supabase/client';
import { getApiBaseUrl } from '@/lib/api-config';

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
  try {
    const { data, error } = await supabase.functions.invoke('fashion-assistant', {
      body: { messages },
    });

    if (error) throw error;

    // For streaming, we need to handle the response differently
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fashion-assistant`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok || !resp.body) {
      throw new Error('Failed to start chat stream');
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
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    onDone();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (onError) {
      onError(errorObj);
    } else {
      // Fallback error handling if onError not provided
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
