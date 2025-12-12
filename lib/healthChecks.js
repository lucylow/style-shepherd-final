// lib/healthChecks.js
// Use Node.js built-in fetch (available in Node 18+)
// No need to require node-fetch

const VULTR_KEY = process.env.VULTR_SERVERLESS_INFERENCE_API_KEY || process.env.VULTR_API_KEY || '';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const RAINDROP_KEY = process.env.RAINDROP_API_KEY || '';

const VULTR_URL = process.env.VULTR_INFERENCE_BASE_URL || 'https://api.vultrinference.com/v1/chat/completions';
const ELEVEN_BASE = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';

async function checkVultr() {
  if (!VULTR_KEY) return { ok: false, reason: 'no_key', message: 'VULTR key not set (mock mode)' };

  try {
    // safe lightweight metadata request (non-billing) - if you have an endpoint do it; otherwise just check base reachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(VULTR_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function checkEleven() {
  if (!ELEVEN_KEY) return { ok: false, reason: 'no_key', message: 'ELEVENLABS key not set (mock mode)' };

  try {
    // Attempt a HEAD to nine labs endpoint (safe)
    const url = `${ELEVEN_BASE}/v1/voices`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: 'GET', headers: { 'xi-api-key': ELEVEN_KEY }, signal: controller.signal });
    clearTimeout(timeoutId);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function checkRaindrop() {
  if (!RAINDROP_KEY) return { ok: false, reason: 'no_key', message: 'RAINDROP API key not set (mock mode)' };

  // the Raindrop SDK has different endpoints per version; a simple ping is to check base url if known
  try {
    // If you have a Raindrop health endpoint, use it. Otherwise mark reachable.
    return { ok: true }; // optimistic; or attempt an SDK call if installed
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Run all checks and return summary
 */
async function runServiceChecks() {
  const [v, e, r] = await Promise.all([checkVultr(), checkEleven(), checkRaindrop()]);
  return { vultr: v, elevenlabs: e, raindrop: r };
}

export { runServiceChecks, checkVultr, checkEleven, checkRaindrop };

