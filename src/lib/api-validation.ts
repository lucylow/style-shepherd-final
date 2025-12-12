/**
 * API Request/Response Validation
 * 
 * Zod schemas for validating API requests and responses
 * These can be shared with backend for consistency
 */

import { z } from 'zod';
import { ApiResponse, ApiError, PaginatedResponse } from './api-types';

/**
 * API Response Schema
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      statusCode: z.number(),
      details: z.record(z.any()).optional(),
      timestamp: z.string().optional(),
    }).optional(),
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
  }) as z.ZodType<ApiResponse<z.infer<T>>>;

/**
 * Paginated Response Schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  }) as z.ZodType<PaginatedResponse<z.infer<T>>>;

/**
 * Common validation schemas
 */
export const commonSchemas = {
  id: z.string().min(1),
  email: z.string().email(),
  url: z.string().url(),
  timestamp: z.string().datetime(),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  }),
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),
};

/**
 * Validate API response
 */
export function validateApiResponse<T>(
  response: unknown,
  schema: z.ZodType<T>
): T {
  try {
    return schema.parse(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('API response validation failed:', error.errors);
      throw new Error(`Invalid API response: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Safe validate (returns null on error instead of throwing)
 */
export function safeValidateApiResponse<T>(
  response: unknown,
  schema: z.ZodType<T>
): T | null {
  try {
    return schema.parse(response);
  } catch (error) {
    console.warn('API response validation failed:', error);
    return null;
  }
}
