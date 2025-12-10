/**
 * API Client for backend calls
 * Uses fetch with error handling and type safety
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const API_TIMEOUT_MS = 30000; // 30 seconds

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Create a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error instanceof Error && error.message.includes('4')) {
        const statusMatch = error.message.match(/\b(40[0-9])\b/);
        if (statusMatch && statusMatch[1] !== '429') {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function apiGet<T = unknown>(
  path: string,
  options?: { timeout?: number; retries?: number }
): Promise<ApiResponse<T>> {
  const timeout = options?.timeout || API_TIMEOUT_MS;
  const retries = options?.retries ?? 1;
  
  try {
    return await retryWithBackoff(async () => {
      const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
      
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
        },
        timeout
      );

      if (!res.ok) {
        let errorText = "";
        try {
          errorText = await res.text();
          // Try to parse as JSON for better error messages
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
              errorText = errorJson.error.message;
            }
          } catch {
            // Not JSON, use text as is
          }
        } catch {
          errorText = res.statusText;
        }
        
        const error = new Error(`${res.status}: ${errorText || res.statusText}`);
        (error as any).statusCode = res.status;
        throw error;
      }

      const data = await res.json();
      return { success: true, data, statusCode: res.status };
    }, retries);
  } catch (error: any) {
    let errorMessage = "Network error";
    
    if (error.message?.includes('timeout')) {
      errorMessage = `Request timed out after ${timeout}ms`;
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage = "Network connection failed. Please check your internet connection.";
    } else if (error.message?.includes('CORS')) {
      errorMessage = "CORS error. Please check API configuration.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode: error.statusCode,
    };
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  options?: { timeout?: number; retries?: number }
): Promise<ApiResponse<T>> {
  const timeout = options?.timeout || API_TIMEOUT_MS;
  const retries = options?.retries ?? 1;
  
  try {
    return await retryWithBackoff(async () => {
      const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
      
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        timeout
      );

      if (!res.ok) {
        let errorText = "";
        try {
          errorText = await res.text();
          // Try to parse as JSON for better error messages
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
              errorText = errorJson.error.message;
            } else if (errorJson.message) {
              errorText = errorJson.message;
            }
          } catch {
            // Not JSON, use text as is
          }
        } catch {
          errorText = res.statusText;
        }
        
        const error = new Error(`${res.status}: ${errorText || res.statusText}`);
        (error as any).statusCode = res.status;
        throw error;
      }

      const data = await res.json();
      return { success: true, data, statusCode: res.status };
    }, retries);
  } catch (error: any) {
    let errorMessage = "Network error";
    
    if (error.message?.includes('timeout')) {
      errorMessage = `Request timed out after ${timeout}ms`;
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage = "Network connection failed. Please check your internet connection.";
    } else if (error.message?.includes('CORS')) {
      errorMessage = "CORS error. Please check API configuration.";
    } else if (error.message?.includes('JSON')) {
      errorMessage = "Invalid response format from server.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      statusCode: error.statusCode,
    };
  }
}

export async function checkEndpointStatus(
  path: string,
  method: string,
  timeout: number = 5000
): Promise<number> {
  try {
    const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: method === "GET" ? "GET" : "OPTIONS",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
      timeout
    );
    return res.status;
  } catch (error: any) {
    // Return 0 for any error (network, timeout, etc.)
    console.warn(`Endpoint check failed for ${path}:`, error.message);
    return 0;
  }
}
