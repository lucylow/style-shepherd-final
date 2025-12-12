import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30000;

// Simple in-memory cache (per instance)
const audioCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiter (token bucket)
let tokens = 8;
const MAX_TOKENS = 8;
const TOKEN_REFILL_MS = 1000;
setInterval(() => { tokens = Math.min(MAX_TOKENS, tokens + 1); }, TOKEN_REFILL_MS);

function acquireToken(): boolean {
  if (tokens <= 0) return false;
  tokens--;
  return true;
}

function hashKey(text: string, voiceId: string, opts: Record<string, unknown>): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ text, voiceId, opts }));
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function getCached(key: string): string | null {
  const entry = audioCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    audioCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: string): void {
  // Limit cache size
  if (audioCache.size > 100) {
    const oldest = audioCache.keys().next().value;
    if (oldest) audioCache.delete(oldest);
  }
  audioCache.set(key, { data, timestamp: Date.now() });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function retryFetch(url: string, opts: RequestInit): Promise<Response> {
  let attempt = 0;
  let lastErr: Error | null = null;
  while (attempt < MAX_RETRIES) {
    try {
      return await fetchWithTimeout(url, opts, REQUEST_TIMEOUT_MS);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const delay = 200 * Math.pow(2, attempt);
      await sleep(delay);
      attempt++;
    }
  }
  throw lastErr;
}

interface TTSResponse {
  success: boolean;
  source: "eleven" | "mock" | "cache" | "rate_limit";
  audioBase64?: string;
  mimeType?: string;
  cached?: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId = DEFAULT_VOICE_ID, stability = 0.5, similarity_boost = 0.75, model = "eleven_multilingual_v2" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ success: false, message: "text (string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncatedText = text.slice(0, 500);
    const cacheKey = hashKey(truncatedText, voiceId, { stability, similarity_boost, model });

    // Check cache first
    const cachedAudio = getCached(cacheKey);
    if (cachedAudio) {
      console.log("Returning cached audio for key:", cacheKey);
      const result: TTSResponse = {
        success: true,
        source: "cache",
        audioBase64: cachedAudio,
        mimeType: "audio/mpeg",
        cached: true,
      };
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mock fallback when API key not configured
    if (!ELEVENLABS_API_KEY) {
      console.log("ElevenLabs API key not configured, returning mock response");
      const mockResponse: TTSResponse = {
        success: true,
        source: "mock",
        audioBase64: "",
        mimeType: "audio/mpeg",
        cached: false,
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    if (!acquireToken()) {
      const rateLimitResponse: TTSResponse = {
        success: false,
        source: "rate_limit",
        error: "Rate limit reached. Try again shortly.",
      };
      return new Response(
        JSON.stringify(rateLimitResponse),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call ElevenLabs TTS API with retry
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await retryFetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          source: "eleven",
          error: errorText || `ElevenLabs error ${response.status}`,
          cached: false,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const audioBase64 = btoa(binary);

    // Cache the result
    setCache(cacheKey, audioBase64);

    const result: TTSResponse = {
      success: true,
      source: "eleven",
      audioBase64,
      mimeType: "audio/mpeg",
      cached: false,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("elevenlabs-tts error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
