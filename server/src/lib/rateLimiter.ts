/**
 * Simple token-bucket rate limiter for demo to avoid spamming 3rd-party APIs
 */

let tokens: number = Number(process.env.DEMO_TOKENS) || 20;
const MAX_TOKENS: number = Number(process.env.DEMO_TOKENS) || 20;
const REFILL_INTERVAL_MS: number = Number(process.env.DEMO_TOKEN_REFILL_MS) || 1000;
const REFILL_AMOUNT: number = Number(process.env.DEMO_TOKEN_REFILL_AMOUNT) || 1;

// Start refill interval
setInterval(() => {
  tokens = Math.min(MAX_TOKENS, tokens + REFILL_AMOUNT);
}, REFILL_INTERVAL_MS);

export function tryAcquire(count: number = 1): boolean {
  if (tokens >= count) {
    tokens -= count;
    return true;
  }
  return false;
}

export function available(): number {
  return tokens;
}

export function reset(): void {
  tokens = MAX_TOKENS;
}
