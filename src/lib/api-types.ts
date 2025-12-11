/**
 * Shared API Types
 * 
 * Type definitions for API requests and responses that are shared between
 * frontend and backend. This ensures type safety and consistency.
 */

/**
 * Standard API Response Wrapper
 * All API responses should follow this structure for consistency
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId?: string;
  timestamp?: string;
}

/**
 * API Error Response Structure
 * Matches backend AppError format
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      latency?: number;
    };
  };
  timestamp: string;
}

/**
 * Request Metadata
 */
export interface RequestMetadata {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

/**
 * API Request Options
 */
export interface ApiRequestOptions {
  timeout?: number;
  retry?: {
    maxRetries?: number;
    retryable?: (error: unknown) => boolean;
  };
  showErrorToast?: boolean;
  metadata?: RequestMetadata;
}
