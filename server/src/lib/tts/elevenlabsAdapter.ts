/**
 * ElevenLabs TTS Adapter
 * Wraps ElevenLabs TTS API as a provider adapter
 */

import { TTSAdapter, TTSSynthesizeOptions, TTSResult } from '../providers.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export class ElevenLabsAdapter implements TTSAdapter {
  meta = {
    id: 'elevenlabs',
    kind: 'tts' as const,
    name: 'ElevenLabs',
    priority: 10,
  };

  private client: ElevenLabsClient;
  private defaultVoiceId: string;

  constructor(
    apiKey: string,
    options?: { voiceId?: string; priority?: number }
  ) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.client = new ElevenLabsClient({ apiKey });
    this.defaultVoiceId = options?.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
    if (options?.priority !== undefined) {
      this.meta.priority = options.priority;
    }
  }

  async synthesize(
    text: string,
    opts: TTSSynthesizeOptions = {}
  ): Promise<TTSResult> {
    const voiceId = opts.voiceId || this.defaultVoiceId;
    const stability = opts.stability ?? 0.5;
    const similarityBoost = opts.similarityBoost ?? 0.75;

    try {
      const audio = await this.client.textToSpeech.convert(voiceId, {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      });

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      return {
        audio: buffer,
        contentType: 'audio/mpeg',
        cached: false,
      };
    } catch (error: any) {
      throw new Error(`ElevenLabs TTS error: ${error.message || error}`);
    }
  }
}
