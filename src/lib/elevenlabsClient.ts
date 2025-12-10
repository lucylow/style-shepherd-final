/**
 * ElevenLabs TTS Client
 * 
 * Frontend client for text-to-speech via Edge Function
 * Features: caching support, voice selection, configurable settings
 */

interface TTSResponse {
  success: boolean;
  source: "eleven" | "mock" | "cache" | "rate_limit";
  audioBase64?: string;
  mimeType?: string;
  cached?: boolean;
  error?: string;
}

interface VoicesResponse {
  success: boolean;
  source: "eleven" | "mock";
  voices: Voice[];
  error?: string;
}

interface Voice {
  voice_id: string;
  name: string;
  language?: string;
  category?: string;
}

interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarity_boost?: number;
  model?: string;
}

const TTS_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const VOICES_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`;

// Available voices
export const ELEVEN_VOICES = {
  george: "JBFqnCBsd6RMkjVDRZzb",
  aria: "9BWtsMINqrJLrRacOk9x",
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  charlie: "IKne3meq5aSn9XLyUdCD",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  river: "SAz9YHcvj6GT2YYXdXww",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  will: "bIHbv24MWmeRgasZH58o",
  jessica: "cgSgspJ2msm6clMCkdW9",
  eric: "cjVigY5qzO86Huf0OWal",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  bill: "pqHfZKP75CvOlQylNhV4",
} as const;

export type VoiceName = keyof typeof ELEVEN_VOICES;

/**
 * Fetch available voices from ElevenLabs
 */
export async function getVoices(): Promise<{ success: boolean; voices: Voice[]; error?: string }> {
  try {
    const response = await fetch(VOICES_FUNCTION_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    });

    const data: VoicesResponse = await response.json();

    if (!data.success) {
      return { success: false, voices: [], error: data.error || "Failed to fetch voices" };
    }

    return { success: true, voices: data.voices };
  } catch (error) {
    return {
      success: false,
      voices: [],
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Convert text to speech and return audio data URL
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<{ success: boolean; audioUrl?: string; cached?: boolean; source?: string; error?: string }> {
  try {
    const response = await fetch(TTS_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        text,
        voiceId: options.voiceId || ELEVEN_VOICES.george,
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarity_boost ?? 0.75,
        model: options.model || "eleven_multilingual_v2",
      }),
    });

    const data: TTSResponse = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || "TTS failed" };
    }

    if (data.audioBase64) {
      const audioUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`;
      return { 
        success: true, 
        audioUrl, 
        cached: data.cached || false,
        source: data.source,
      };
    }

    // Mock mode - no audio
    return { success: true, audioUrl: undefined, source: data.source };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Speak text using browser audio
 */
export async function speakText(
  text: string,
  options: TTSOptions = {}
): Promise<{ success: boolean; cached?: boolean; error?: string }> {
  const result = await textToSpeech(text, options);

  if (result.success && result.audioUrl) {
    const audio = new Audio(result.audioUrl);
    await audio.play().catch((e) => {
      console.warn("Audio playback blocked:", e);
    });
    return { success: true, cached: result.cached };
  } else if (!result.success) {
    console.error("TTS error:", result.error);
    return { success: false, error: result.error };
  }

  return { success: true };
}
