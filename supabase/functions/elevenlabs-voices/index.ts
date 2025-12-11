import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

// ============================================================================
// TYPE DEFINITIONS - Matches ElevenLabs API Response
// ============================================================================

interface ElevenLabsVoiceSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
}

interface ElevenLabsVoiceFineTuning {
  is_allowed_to_fine_tune: boolean;
  state: Record<string, string>;
  verification_failures: string[];
  verification_attempts_count: number;
  manual_verification_requested: boolean;
  language?: string;
  progress?: Record<string, unknown>;
}

interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface ElevenLabsVoiceSharing {
  voice_mixing_allowed: boolean;
  featured: boolean;
  category: "generated" | "professional" | "high_quality" | "famous";
  reader_app_enabled: boolean;
  image_url: string;
  ban_reason?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples: ElevenLabsVoiceSample[];
  category: string;
  fine_tuning: ElevenLabsVoiceFineTuning;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: ElevenLabsVoiceSettings;
  sharing: ElevenLabsVoiceSharing;
  high_quality_base_model_ids: string[];
  safety_control?: "NONE" | "BAN" | "CAPTCHA" | "CAPTCHA_AND_MODERATION";
  labels?: { language?: string; accent?: string; gender?: string; age?: string; use_case?: string };
}

interface EnhancedVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  image_url?: string;
  language?: string;
  accent?: string;
  gender?: string;
  optimized_for_fashion?: boolean;
  category_display?: string;
  stability?: number;
  similarity_boost?: number;
  use_cases?: string[];
  popularity?: number;
}

interface VoicesResponse {
  success: boolean;
  source: "eleven" | "mock";
  voices: EnhancedVoice[];
  total_count: number;
  execution_time_ms: number;
  optimized_voices?: EnhancedVoice[];
  error?: string;
}

// ============================================================================
// STYLE SHEPHERD VOICE RECOMMENDATIONS
// ============================================================================

const FASHION_VOICE_RECOMMENDATIONS = {
  // Professional & Elegant Voices for Style Advice
  professional: [
    { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "professional" },
    { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Antoni", category: "professional" },
    { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Bella", category: "professional" },
  ],
  
  // Warm & Approachable for Personal Shopping
  friendly: [
    { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Bella", category: "professional" },
    { voice_id: "JBFqnCBsd6RMkjVDRZSQ", name: "Dom", category: "professional" },
  ],
  
  // Trendy & Youthful for Fashion Trends
  trendy: [
    { voice_id: "VR6AewLTigWG4xSOukaG", name: "Elli", category: "professional" },
    { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "professional" },
  ],
};

// Default voices list (used as fallback)
const DEFAULT_VOICES: EnhancedVoice[] = [
  { 
    voice_id: "9BWtsMINqrJLrRacOk9x", 
    name: "Aria", 
    category: "professional",
    description: "Professional female voice",
    preview_url: `${ELEVENLABS_API_BASE}/voices/9BWtsMINqrJLrRacOk9x/preview`,
    language: "en",
    category_display: "Professional",
    popularity: 0.9,
  },
  { 
    voice_id: "EXAVITQu4vr4xnSDxMaL", 
    name: "Antoni", 
    category: "professional",
    description: "Sophisticated male voice for luxury fashion",
    preview_url: `${ELEVENLABS_API_BASE}/voices/EXAVITQu4vr4xnSDxMaL/preview`,
    language: "en",
    optimized_for_fashion: true,
    category_display: "Professional",
    use_cases: ["luxury", "formal", "consultations"],
    popularity: 0.95,
  },
  { 
    voice_id: "21m00Tcm4TlvDq8ikWAM", 
    name: "Bella", 
    category: "professional",
    description: "Warm, approachable female voice for personal shopping",
    preview_url: `${ELEVENLABS_API_BASE}/voices/21m00Tcm4TlvDq8ikWAM/preview`,
    language: "en",
    optimized_for_fashion: true,
    category_display: "Professional",
    use_cases: ["personal-shopping", "friendly-advice", "casual"],
    popularity: 0.92,
  },
  { 
    voice_id: "VR6AewLTigWG4xSOukaG", 
    name: "Elli", 
    category: "professional",
    description: "Youthful, energetic voice for fashion trend updates",
    preview_url: `${ELEVENLABS_API_BASE}/voices/VR6AewLTigWG4xSOukaG/preview`,
    language: "en",
    optimized_for_fashion: true,
    category_display: "Professional",
    use_cases: ["trends", "social-media", "youthful"],
    popularity: 0.88,
  },
  { 
    voice_id: "JBFqnCBsd6RMkjVDRZzb", 
    name: "George", 
    category: "professional",
    description: "Professional male voice",
    preview_url: `${ELEVENLABS_API_BASE}/voices/JBFqnCBsd6RMkjVDRZzb/preview`,
    language: "en",
    category_display: "Professional",
    popularity: 0.85,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get voice preview audio URL
 */
function getVoicePreviewUrl(voice: ElevenLabsVoice | EnhancedVoice): string {
  if (voice.preview_url) {
    return voice.preview_url;
  }
  return `${ELEVENLABS_API_BASE}/voices/${voice.voice_id}/preview`;
}

/**
 * Categorize voices for fashion use cases
 */
function categorizeFashionVoices(voices: EnhancedVoice[]): {
  professional: EnhancedVoice[];
  friendly: EnhancedVoice[];
  trendy: EnhancedVoice[];
  all: EnhancedVoice[];
} {
  const professional: EnhancedVoice[] = [];
  const friendly: EnhancedVoice[] = [];
  const trendy: EnhancedVoice[] = [];
  
  voices.forEach(voice => {
    const nameLower = voice.name.toLowerCase();
    const isProfessional = voice.category === "professional" || 
                          nameLower.includes("professional") ||
                          FASHION_VOICE_RECOMMENDATIONS.professional.some(v => v.name === voice.name);
    
    const isFriendly = voice.category === "professional" && 
                       (nameLower.includes("bella") || nameLower.includes("dom") ||
                        FASHION_VOICE_RECOMMENDATIONS.friendly.some(v => v.name === voice.name));
    
    const isTrendy = voice.category === "professional" && 
                     (nameLower.includes("elli") || nameLower.includes("josh") ||
                      FASHION_VOICE_RECOMMENDATIONS.trendy.some(v => v.name === voice.name));

    if (isProfessional) professional.push(voice);
    if (isFriendly) friendly.push(voice);
    if (isTrendy) trendy.push(voice);
  });

  return {
    professional,
    friendly,
    trendy,
    all: voices
  };
}

/**
 * Recommend voices for specific fashion scenarios
 */
function recommendVoicesForStyleShepherd(voices: EnhancedVoice[]): EnhancedVoice[] {
  const recommendations = voices.filter(voice => 
    FASHION_VOICE_RECOMMENDATIONS.professional.some(v => v.name === voice.name) ||
    FASHION_VOICE_RECOMMENDATIONS.friendly.some(v => v.name === voice.name) ||
    FASHION_VOICE_RECOMMENDATIONS.trendy.some(v => v.name === voice.name) ||
    voice.category === "professional"
  ).slice(0, 8);

  return recommendations;
}

/**
 * Enhance voice with additional metadata
 */
function enhanceVoice(voice: ElevenLabsVoice): EnhancedVoice {
  const nameLower = voice.name.toLowerCase();
  const isFashionOptimized = FASHION_VOICE_RECOMMENDATIONS.professional.some(v => v.name === voice.name) ||
                             FASHION_VOICE_RECOMMENDATIONS.friendly.some(v => v.name === voice.name) ||
                             FASHION_VOICE_RECOMMENDATIONS.trendy.some(v => v.name === voice.name);

  const useCases: string[] = [];
  if (isFashionOptimized) {
    if (FASHION_VOICE_RECOMMENDATIONS.professional.some(v => v.name === voice.name)) {
      useCases.push("style-advice", "consultations", "professional");
    }
    if (FASHION_VOICE_RECOMMENDATIONS.friendly.some(v => v.name === voice.name)) {
      useCases.push("personal-shopping", "friendly-advice", "casual");
    }
    if (FASHION_VOICE_RECOMMENDATIONS.trendy.some(v => v.name === voice.name)) {
      useCases.push("trends", "social-media", "youthful");
    }
  }

  return {
    voice_id: voice.voice_id,
    name: voice.name,
    category: voice.category,
    description: voice.description || `${voice.name} voice`,
    preview_url: getVoicePreviewUrl(voice),
    image_url: voice.sharing?.image_url,
    language: voice.labels?.language || "en",
    accent: voice.labels?.accent || "american",
    gender: voice.labels?.gender || "neutral",
    optimized_for_fashion: isFashionOptimized,
    category_display: voice.category === "professional" ? "Professional" : 
                     voice.category === "high_quality" ? "High Quality" : "Standard",
    stability: voice.settings?.stability,
    similarity_boost: voice.settings?.similarity_boost,
    use_cases: useCases.length > 0 ? useCases : undefined,
    popularity: isFashionOptimized ? 0.9 + Math.random() * 0.1 : 0.7 + Math.random() * 0.2,
  };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ 
        success: false, 
        voices: [],
        total_count: 0,
        execution_time_ms: Date.now() - startTime,
        error: "Method not allowed. Use GET only." 
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const recommend = url.searchParams.get("recommend") === "true";

    // If no API key, return default voices
    if (!ELEVENLABS_API_KEY) {
      console.log("🎤 ElevenLabs API key not configured, returning default voices");
      const mockResponse: VoicesResponse = {
        success: true,
        source: "mock",
        voices: DEFAULT_VOICES,
        total_count: DEFAULT_VOICES.length,
        execution_time_ms: Date.now() - startTime,
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎤 Fetching ElevenLabs voices...");

    // Fetch voices from ElevenLabs
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs voices API error:", response.status, errorText);
      // Fall back to default voices on error
      const fallbackResponse: VoicesResponse = {
        success: true,
        source: "mock",
        voices: DEFAULT_VOICES,
        total_count: DEFAULT_VOICES.length,
        execution_time_ms: Date.now() - startTime,
        error: `API error: ${response.status}`,
      };
      return new Response(
        JSON.stringify(fallbackResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawVoices: ElevenLabsVoice[] = data.voices || [];

    // Enhance voices with additional metadata
    let enhancedVoices: EnhancedVoice[] = rawVoices.map(enhanceVoice);

    // Filter by category if specified
    if (category === "professional") {
      enhancedVoices = enhancedVoices.filter(v => v.category === "professional");
    }

    // Limit results
    const totalCount = enhancedVoices.length;
    enhancedVoices = enhancedVoices.slice(0, limit);

    const executionTime = Date.now() - startTime;

    const result: VoicesResponse = {
      success: true,
      source: "eleven",
      voices: enhancedVoices,
      total_count: totalCount,
      execution_time_ms: executionTime,
    };

    // Include recommendations for Style Shepherd
    if (recommend) {
      result.optimized_voices = recommendVoicesForStyleShepherd(enhancedVoices);
    }

    // Log categorization stats
    const categorized = categorizeFashionVoices(enhancedVoices);
    console.log(`✅ Fetched ${totalCount} voices (${categorized.professional.length} professional, ${executionTime}ms)`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("elevenlabs-voices error:", error);
    const executionTime = Date.now() - startTime;
    
    // Fall back to default voices on error
    const fallbackResponse: VoicesResponse = {
      success: true,
      source: "mock",
      voices: DEFAULT_VOICES,
      total_count: DEFAULT_VOICES.length,
      execution_time_ms: executionTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(
      JSON.stringify(fallbackResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
