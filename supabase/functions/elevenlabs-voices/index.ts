import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVEN_LABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY") || "";

interface Voice {
  voice_id: string;
  name: string;
  language?: string;
  category?: string;
}

interface VoicesResponse {
  success: boolean;
  source: "eleven" | "mock";
  voices: Voice[];
  error?: string;
}

// Default voices list (used as fallback)
const DEFAULT_VOICES: Voice[] = [
  { voice_id: "9BWtsMINqrJLrRacOk9x", name: "Aria", language: "en" },
  { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", language: "en" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", language: "en" },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", language: "en" },
  { voice_id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", language: "en" },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", language: "en" },
  { voice_id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", language: "en" },
  { voice_id: "SAz9YHcvj6GT2YYXdXww", name: "River", language: "en" },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", language: "en" },
  { voice_id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", language: "en" },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", language: "en" },
  { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", language: "en" },
  { voice_id: "bIHbv24MWmeRgasZH58o", name: "Will", language: "en" },
  { voice_id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", language: "en" },
  { voice_id: "cjVigY5qzO86Huf0OWal", name: "Eric", language: "en" },
  { voice_id: "iP95p4xoKVk53GoZ742B", name: "Chris", language: "en" },
  { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", language: "en" },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", language: "en" },
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", language: "en" },
  { voice_id: "pqHfZKP75CvOlQylNhV4", name: "Bill", language: "en" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, message: "GET only" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // If no API key, return default voices
    if (!ELEVEN_LABS_API_KEY) {
      console.log("ElevenLabs API key not configured, returning default voices");
      const mockResponse: VoicesResponse = {
        success: true,
        source: "mock",
        voices: DEFAULT_VOICES,
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch voices from ElevenLabs
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": ELEVEN_LABS_API_KEY,
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
        error: `API error: ${response.status}`,
      };
      return new Response(
        JSON.stringify(fallbackResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const voices: Voice[] = (data.voices || []).map((v: { voice_id: string; name: string; labels?: { language?: string }; category?: string }) => ({
      voice_id: v.voice_id,
      name: v.name,
      language: v.labels?.language || "en",
      category: v.category,
    }));

    const result: VoicesResponse = {
      success: true,
      source: "eleven",
      voices,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("elevenlabs-voices error:", error);
    // Fall back to default voices on error
    const fallbackResponse: VoicesResponse = {
      success: true,
      source: "mock",
      voices: DEFAULT_VOICES,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return new Response(
      JSON.stringify(fallbackResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
