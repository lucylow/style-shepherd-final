/**
 * API Client for backend calls
 * Uses fetch with error handling and type safety
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiGet<T = unknown>(path: string): Promise<ApiResponse<T>> {
  try {
    const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `${res.status}: ${text || res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  try {
    const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `${res.status}: ${text || res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function checkEndpointStatus(path: string, method: string): Promise<number> {
  try {
    const url = path.startsWith("http") ? path : `${SUPABASE_URL}${path}`;
    const res = await fetch(url, {
      method: method === "GET" ? "GET" : "OPTIONS",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    return res.status;
  } catch {
    return 0;
  }
}
