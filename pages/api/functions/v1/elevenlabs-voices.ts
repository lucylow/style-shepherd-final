// pages/api/functions/v1/elevenlabs-voices.ts
// NOTE: This file is written assuming a Next.js/Lovable API route structure.
// The original project structure is not fully clear (Supabase functions vs Next.js pages).
// We will place this in the Next.js-like structure as per the provided instructions.

import { fetchElevenVoices, VoiceRecord } from '../../../../lib/elevenlabsClient';

// Mock types for Next.js API route
type NextApiRequest = { query: { q?: string } };
type NextApiResponse = { status: (code: number) => { json: (data: any) => void } };

let _cache: { ts: number; data: VoiceRecord[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // optional: support query param ?q=stylist / ?use_case=ads
    const q = (req.query.q as string | undefined)?.toLowerCase();

    if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
      const filtered = filterByQuery(_cache.data, q);
      return res.status(200).json({ source: 'cache', voices: filtered });
    }

    const voices = await fetchElevenVoices();
    _cache = { ts: Date.now(), data: voices };
    const filtered = filterByQuery(voices, q);
    return res.status(200).json({ source: 'eleven', voices: filtered });
  } catch (err: any) {
    console.error('elevenlabs-voices api error', err);
    return res.status(500).json({ error: 'failed_to_fetch_voices' });
  }
}

function filterByQuery(list: VoiceRecord[], q?: string) {
  if (!q) return list;
  return list.filter((v) => (v.name + ' ' + (v.metadata?.use_case ?? '') + ' ' + (v.language ?? '')).toLowerCase().includes(q));
}
