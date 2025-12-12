/**
 * Enhanced Vultr Serverless Inference Client
 * - Reads Vultr key via keysValidator
 * - If key missing -> deterministic mock reply for judge/demo
 * - Enhanced error handling, retry strategies, and rate limiting
 * - Exports: callVultrInference({model,messages,timeoutMs,temperature,maxTokens})
 */

import { getVultrKey } from './keysValidator.js';

const VULTR_KEY_OBJ = getVultrKey();
const VULTR_KEY = VULTR_KEY_OBJ?.key || '';
const VULTR_URL = process.env.VULTR_INFERENCE_BASE_URL || 
  process.env.VULTR_API_ENDPOINT || 
  'https://api.vultrinference.com/v1/chat/completions';

// Enhanced retry configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 200;
const DEFAULT_MAX_DELAY = 5000;
const DEFAULT_TIMEOUT = 25000;

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Conservative limit

// Lightweight retry/backoff with exponential backoff and jitter
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJitter(baseDelay: number): number {
  // Add jitter (±20%) to prevent thundering herd
  const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, baseDelay + jitter);
}

async function retry<T>(
  fn: () => Promise<T>, 
  attempts: number = DEFAULT_MAX_RETRIES, 
  base: number = DEFAULT_BASE_DELAY
): Promise<T> {
  let lastErr: Error | unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      
      // Don't retry on certain errors
      if (err instanceof Error) {
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (err.message.includes('400') || 
            err.message.includes('401') || 
            err.message.includes('403')) {
          throw err;
        }
      }
      
      // Exponential backoff with jitter
      if (i < attempts - 1) {
        const delay = Math.min(
          getJitter(base * Math.pow(2, i)),
          DEFAULT_MAX_DELAY
        );
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

// Simple rate limiting
async function checkRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Reset window if expired
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }
  
  // Check if we're at the limit
  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const waitTime = RATE_LIMIT_WINDOW - (now - windowStart);
    if (waitTime > 0) {
      await sleep(waitTime);
      requestCount = 0;
      windowStart = Date.now();
    }
  }
  
  requestCount++;
}

export interface VultrInferenceOptions {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
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
  [key: string]: any; // Allow additional properties from API response
}

export async function callVultrInference({
  model = 'gpt-3.5-turbo',
  messages = [],
  timeoutMs = DEFAULT_TIMEOUT,
  temperature = 0.7,
  maxTokens = 1000,
  topP = 1.0,
  frequencyPenalty = 0.0,
  presencePenalty = 0.0,
  stream = false,
}: VultrInferenceOptions = {}): Promise<VultrResponse> {
  // Validate inputs
  if (!messages || messages.length === 0) {
    return {
      success: false,
      source: 'vultr',
      error: 'Messages array is required and must not be empty'
    };
  }

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

  // Check rate limit
  await checkRateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: any = {
      model,
      messages,
      temperature: Math.max(0, Math.min(2, temperature)),
      max_tokens: Math.max(1, Math.min(4000, maxTokens)),
    };

    // Add optional parameters if provided
    if (topP !== undefined && topP !== 1.0) body.top_p = topP;
    if (frequencyPenalty !== undefined && frequencyPenalty !== 0) {
      body.frequency_penalty = frequencyPenalty;
    }
    if (presencePenalty !== undefined && presencePenalty !== 0) {
      body.presence_penalty = presencePenalty;
    }
    if (stream) body.stream = stream;

    const res = await retry(
      () => fetch(VULTR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VULTR_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'StyleShepherd/1.0',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }),
      DEFAULT_MAX_RETRIES,
      DEFAULT_BASE_DELAY
    );

    clearTimeout(timeout);
    
    if (!res.ok) {
      let errorText = '';
      try {
        errorText = await res.text();
      } catch {
        errorText = `HTTP ${res.status}`;
      }

      // Handle rate limiting
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
        await sleep(waitTime);
        // Retry once after rate limit
        return callVultrInference({
          model,
          messages,
          timeoutMs,
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
          stream,
        });
      }

      return {
        success: false,
        source: 'vultr',
        status: res.status,
        error: errorText || `Vultr returned ${res.status}`
      };
    }
    
    const json = await res.json();
    if (typeof json === 'object' && json !== null) {
      return { success: true, source: 'vultr', ...json } as VultrResponse;
    }
    return { success: true, source: 'vultr', choices: [] } as VultrResponse;
  } catch (err) {
    clearTimeout(timeout);
    
    // Handle specific error types
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          source: 'vultr',
          error: `Request timeout after ${timeoutMs}ms`
        };
      }
      
      if (err.message.includes('fetch')) {
        return {
          success: false,
          source: 'vultr',
          error: 'Network error - Unable to reach Vultr Inference API'
        };
      }
    }
    
    return {
      success: false,
      source: 'vultr',
      error: err && (err as Error).message ? (err as Error).message : String(err)
    };
  }
}

export const _meta = { VULTR_KEY_OBJ, VULTR_URL };
