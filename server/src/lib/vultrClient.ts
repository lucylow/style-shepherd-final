/**
 * Minimal safe wrapper for Vultr Serverless Inference (chat completions).
 * - Reads Vultr key via keysValidator
 * - If key missing -> deterministic mock reply for judge/demo
 * - Exports: callVultrInference({model,messages,timeoutMs})
 */

import { getVultrKey } from './keysValidator.js';

const VULTR_KEY_OBJ = getVultrKey();
const VULTR_KEY = VULTR_KEY_OBJ?.key || '';
const VULTR_URL = process.env.VULTR_INFERENCE_BASE_URL || 
  process.env.VULTR_API_ENDPOINT || 
  'https://api.vultrinference.com/v1/chat/completions';

// Lightweight retry/backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(
  fn: () => Promise<T>, 
  attempts: number = 3, 
  base: number = 200
): Promise<T> {
  let lastErr: Error | unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await sleep(base * Math.pow(2, i));
    }
  }
  throw lastErr;
}

interface VultrInferenceOptions {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  timeoutMs?: number;
}

interface VultrResponse {
  success: boolean;
  source: 'mock' | 'vultr';
  model?: string;
  choices?: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
  }>;
  status?: number;
  error?: string;
}

export async function callVultrInference({
  model = 'gpt-3.5-turbo',
  messages = [],
  timeoutMs = 25000
}: VultrInferenceOptions = {}): Promise<VultrResponse> {
  // Deterministic mock fallback for demo/judging
  if (!VULTR_KEY) {
    const userText = (messages?.slice(-1)[0]?.content) || 'Hello';
    return {
      success: true,
      source: 'mock',
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Fashioni (mock): For "${userText}" — recommended: Size M (relaxed). Fabric: light cotton. Tip: pair with white sneakers.`
          }
        }
      ]
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = { model, messages };
    const res = await retry(
      () => fetch(VULTR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VULTR_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }),
      3,
      250
    );

    clearTimeout(timeout);
    
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return {
        success: false,
        source: 'vultr',
        status: res.status,
        error: txt || `Vultr returned ${res.status}`
      };
    }
    
    const json = await res.json();
    if (typeof json === 'object' && json !== null) {
      return { success: true, source: 'vultr', ...json };
    }
    return { success: true, source: 'vultr', data: json };
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      source: 'vultr',
      error: err && (err as Error).message ? (err as Error).message : String(err)
    };
  }
}

export const _meta = { VULTR_KEY_OBJ, VULTR_URL };
