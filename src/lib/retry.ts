/**
 * Retry Utilities
 * Provides retry logic for failed operations with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryable?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryable' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Checks if an error is retryable (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('Network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')
    ) {
      return true;
    }
  }

  // Axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    const status = axiosError.response?.status;
    
    // Retry on 5xx errors and 429 (rate limit)
    if (status >= 500 || status === 429) {
      return true;
    }
    
    // Retry on network errors
    if (!axiosError.response && axiosError.request) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates delay for retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    retryable = isRetryableError,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        throw error;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Creates a retry wrapper for a function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retry(() => fn(...args), options);
  }) as T;
}
