/**
 * Raindrop Error Handling Utilities
 * 
 * Provides consistent error handling, retry logic, and fallback mechanisms
 * for Raindrop Smart Component operations.
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export class RaindropError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'RaindropError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RaindropError) {
    return error.retryable;
  }
  
  if (error instanceof Error) {
    // Network errors are generally retryable
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }
    // 5xx errors are retryable
    if (error.message.match(/5\d{2}/)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
  } = options;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = exponentialBackoff 
        ? retryDelay * Math.pow(2, attempt)
        : retryDelay;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Safely execute a Raindrop operation with fallback
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T> | T,
  logError: boolean = true
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.warn('[Raindrop] Operation failed, using fallback:', error);
    }
    
    try {
      const fallbackResult = await fallback();
      return fallbackResult;
    } catch (fallbackError) {
      console.error('[Raindrop] Fallback also failed:', fallbackError);
      throw new RaindropError(
        'Both primary operation and fallback failed',
        'FALLBACK_FAILED',
        500,
        false
      );
    }
  }
}

/**
 * Check if Raindrop is properly configured
 */
export function isRaindropConfigured(): boolean {
  const apiKey = import.meta.env.VITE_RAINDROP_API_KEY;
  const projectId = import.meta.env.VITE_RAINDROP_PROJECT_ID;
  
  return !!(apiKey && projectId && apiKey.trim() !== '' && projectId.trim() !== '');
}

/**
 * Wrap a function to handle Raindrop-specific errors
 */
export function wrapRaindropOperation<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusMatch = errorMessage.match(/(\d{3})/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined;
      
      const raindropError = new RaindropError(
        `${operationName} failed: ${errorMessage}`,
        'OPERATION_FAILED',
        statusCode,
        statusCode ? statusCode >= 500 : false
      );
      
      console.error(`[Raindrop] ${operationName} error:`, raindropError);
      throw raindropError;
    }
  }) as T;
}
