/**
 * Wrapper for ElevenLabs TTS.
 * - Uses ELEVENLABS_API_KEY
 * - Falls back to /public/mock/demo_voice.mp3 when key missing
 * - Saves cached audio files to public/audio-cache/<hash>.mp3 to avoid repeated calls
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { getElevenKey } from './keysValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ELEVEN = getElevenKey();
const ELEVEN_KEY = ELEVEN?.key || '';
const ELEVEN_BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';
const DEFAULT_VOICE = process.env.NEXT_PUBLIC_DEFAULT_VOICE_ID || 
  process.env.ELEVENLABS_DEFAULT_VOICE_ID || 
  'JBFqnCBsd6RMkjVDRZzb';

// Determine cache directory relative to server root
const SERVER_ROOT = join(__dirname, '..', '..');
const AUDIO_CACHE_DIR = join(SERVER_ROOT, '..', 'public', 'audio-cache');

function ensureCacheDir(): void {
  if (!existsSync(AUDIO_CACHE_DIR)) {
    mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  }
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
}

interface TextToSpeechResponse {
  success: boolean;
  source: 'eleven' | 'mock' | 'cache';
  url?: string;
  error?: string;
}

/**
 * textToSpeech({ text, voiceId })
 * returns: { success: boolean, source: 'eleven'|'mock'|'cache', url?: '/audio-cache/...' | '/mock/demo_voice.mp3', error?: string }
 */
export async function textToSpeech({
  text = '',
  voiceId = DEFAULT_VOICE
}: TextToSpeechOptions): Promise<TextToSpeechResponse> {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'text required' };
  }

  // If no key -> return demo mp3 path (judges should add public/mock/demo_voice.mp3)
  if (!ELEVEN_KEY) {
    return { success: true, source: 'mock', url: '/mock/demo_voice.mp3' };
  }

  // Try cache
  ensureCacheDir();
  const h = hashText(`${voiceId}:${text}`);
  const outPath = join(AUDIO_CACHE_DIR, `${h}.mp3`);
  const publicPath = `/audio-cache/${h}.mp3`;
  
  if (existsSync(outPath)) {
    return { success: true, source: 'cache', url: publicPath };
  }

  // Call ElevenLabs convert endpoint
  const endpoint = `${ELEVEN_BASE}/v1/text-to-speech/${voiceId}`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        },
        output_format: 'mp3_44100_128'
      })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return {
        success: false,
        source: 'eleven',
        error: txt || `ElevenLabs ${res.status}`
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(outPath, buffer);
    
    return { success: true, source: 'eleven', url: publicPath };
  } catch (err) {
    return {
      success: false,
      source: 'eleven',
      error: err && (err as Error).message ? (err as Error).message : String(err)
    };
  }
}
