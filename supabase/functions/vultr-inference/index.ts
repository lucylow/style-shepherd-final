import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VULTR_API_KEY = Deno.env.get("VULTR_API_KEY") || "";
const VULTR_URL = "https://api.vultrinference.com/v1/chat/completions";

// Supported models for different use cases
const SUPPORTED_MODELS = {
  chat: "llama2-7b-chat-Q5_K_M",
  sizePrediction: "llama2-7b-chat-Q5_K_M",
  returnRisk: "llama2-7b-chat-Q5_K_M",
  trendAnalysis: "llama2-7b-chat-Q5_K_M",
} as const;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface VultrResponse {
  success: boolean;
  source: "vultr" | "mock";
  status?: number;
  error?: string;
  model?: string;
  choices?: Array<{ index: number; message: { role: string; content: string } }>;
  cached?: boolean;
}

// Simple in-memory cache
const cache = new Map<string, { value: VultrResponse; expiresAt: number }>();

function getCached(key: string): VultrResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: VultrResponse, ttlMs = 30000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = 3,
  baseDelay = 300
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const delay = baseDelay * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      model = SUPPORTED_MODELS.chat, 
      messages,
      useCase,
      temperature = 0.7,
      maxTokens = 1000,
    } = body;

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "messages array is required and must not be empty" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Each message must have 'role' and 'content' fields" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Select model based on use case if provided
    const selectedModel = useCase && SUPPORTED_MODELS[useCase as keyof typeof SUPPORTED_MODELS]
      ? SUPPORTED_MODELS[useCase as keyof typeof SUPPORTED_MODELS]
      : model;

    // Cache key based on request (exclude temperature for caching)
    const cacheKey = `vultr:${btoa(JSON.stringify({ model: selectedModel, messages, useCase }))}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mock fallback when API key not configured
    if (!VULTR_API_KEY) {
      const userMsg = messages?.slice(-1)[0]?.content ?? "Hello";
      const mockResponse: VultrResponse = {
        success: true,
        source: "mock",
        model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Fashioni (demo mode): For "${userMsg}" — I recommend Size M with a relaxed fit. This style pairs beautifully with white sneakers and minimalist accessories for a polished look.`,
            },
          },
        ],
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Vultr Inference API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const requestBody = {
        model: selectedModel,
        messages,
        temperature: Math.max(0, Math.min(2, temperature)), // Clamp between 0 and 2
        max_tokens: Math.max(1, Math.min(4000, maxTokens)), // Clamp between 1 and 4000
      };

      const response = await fetchWithRetry(
        VULTR_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VULTR_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        },
        3,
        300
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Vultr API error:", response.status, errorText);
        return new Response(
          JSON.stringify({
            success: false,
            source: "vultr",
            status: response.status,
            error: errorText || `Vultr error ${response.status}`,
          }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const result: VultrResponse = { 
        success: true, 
        source: "vultr", 
        model: selectedModel,
        ...data 
      };

      // Cache successful responses (longer TTL for deterministic requests)
      const cacheTTL = temperature === 0 ? 60000 : 30000; // 60s for deterministic, 30s for creative
      setCache(cacheKey, result, cacheTTL);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("vultr-inference error:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Request timeout - Vultr Inference API did not respond in time",
            timeout: true,
          }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (error.message.includes('fetch')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Network error - Unable to reach Vultr Inference API",
            networkError: true,
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
