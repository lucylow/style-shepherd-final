// lib/elevenlabsClient.ts
import fs from 'fs';
import path from 'path';
// NOTE: node-fetch is not needed in a modern Next.js/Lovable environment as global fetch is available.
// However, to make this file runnable in a generic Node.js environment, we'll keep the imports commented out.
// import fetch from 'node-fetch'; 

const ELEVEN_BASE = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io/v1';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';

export type VoiceRecord = {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  metadata?: any;
};

// Helper: read mock JSON from public folder
function loadMockVoices(): VoiceRecord[] {
  try {
    // NOTE: process.cwd() is for Next.js/Node.js. In a Supabase/Deno environment, this pathing would need adjustment.
    // Assuming a Next.js/Lovable structure as implied by the instructions.
    const p = path.join(process.cwd(), 'public', 'mocks', 'elevenlabs-voices.json');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw) as VoiceRecord[];
    }
  } catch (e) {
    console.warn('failed to load mock voices', e);
  }
  return [];
}

/**
 * Fetch list of voices from ElevenLabs (server-side only).
 * If ELEVENLABS_API_KEY is missing or remote call fails, return deterministic mocks.
 */
export async function fetchElevenVoices(): Promise<VoiceRecord[]> {
  // If no API key: return mock
  if (!ELEVEN_KEY) {
    return loadMockVoices();
  }

  try {
    const url = `${ELEVEN_BASE}/voices`;
    const res = await fetch(url, {
      headers: {
        'xi-api-key': ELEVEN_KEY,
        Accept: 'application/json',
      },
      method: 'GET',
    });

    if (!res.ok) {
      console.warn('ElevenLabs voices fetch failed', res.status, await res.text());
      return loadMockVoices();
    }

    const data = await res.json();
    // ElevenLabs voices shape may vary; map to our VoiceRecord type
    if (Array.isArray(data?.voices)) {
      return data.voices.map((v: any) => ({
        voice_id: v?.voice_id ?? v?.id ?? v?.id,
        name: v?.name ?? v?.voice_name ?? 'unknown',
        language: v?.language ?? v?.locale,
        gender: v?.gender,
        preview_url: v?.preview_url ?? v?.previewUrl,
        metadata: v,
      }));
    }

    // fallback if top-level array
    if (Array.isArray(data)) {
      return data.map((v: any) => ({
        voice_id: v?.voice_id ?? v?.id,
        name: v?.name ?? v?.voice_name,
        language: v?.language,
        gender: v?.gender,
        preview_url: v?.preview_url,
        metadata: v,
      }));
    }

    return loadMockVoices();
  } catch (err) {
    console.warn('Error fetching ElevenLabs voices:', err);
    return loadMockVoices();
  }
}
