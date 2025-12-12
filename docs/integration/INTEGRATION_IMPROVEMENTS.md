# Backend-Frontend Integration Improvements

This document outlines the improvements made to enhance the integration between the backend and frontend.

## Overview

The integration improvements focus on:
1. **Type Safety** - Shared TypeScript types between frontend and backend
2. **Consistent API Responses** - Standardized response format
3. **Error Handling** - Unified error handling across the stack
4. **Health Monitoring** - Real-time API health checks
5. **Request Tracking** - Request ID correlation
6. **Validation** - Request/response validation with Zod

## Changes Made

### 1. Shared Type Definitions

**File**: `src/lib/api-types.ts`

Created shared TypeScript types for API contracts:
- `ApiResponse<T>` - Standard response wrapper
- `ApiError` - Error response structure
- `PaginatedResponse<T>` - Pagination support
- `HealthCheckResponse` - Health check format
- `RequestMetadata` - Request tracking metadata

### 2. API Response Wrapper Middleware

**File**: `server/src/middleware/responseWrapper.ts`

Backend middleware that automatically wraps all responses in `ApiResponse` format:
- Ensures consistent response structure
- Adds request ID and timestamp
- Handles both JSON and non-JSON responses
- Provides helper functions `sendSuccess()` and `sendError()`

**Integration**: Added to `server/src/index.ts` after monitoring middleware

### 3. Enhanced API Client

**Files**: 
- `src/lib/api.ts` - Base axios instance with interceptors
- `src/lib/apiClient.ts` - High-level API client with retry logic

**Improvements**:
- Automatic response normalization to `ApiResponse` format
- Request ID tracking and correlation
- Metadata support (userId, sessionId)
- Health check integration
- Better error handling with `ApiResponse` format
- Helper function `extractApiData()` to unwrap responses

### 4. API Health Monitoring

**File**: `src/lib/api-health.ts`

Real-time API health monitoring:
- Periodic health checks
- Connection status tracking
- Latency monitoring
- Service status tracking
- React hook `useApiHealth()` for components

### 5. Error Handling Integration

**File**: `src/lib/errorHandler.ts`

Enhanced error handling:
- Supports both legacy and new `ApiResponse` error format
- Better error message extraction
- Consistent error code handling
- Improved user-friendly messages

### 6. Request/Response Validation

**File**: `src/lib/api-validation.ts`

Zod schemas for validation:
- `ApiResponseSchema` - Response validation
- `PaginatedResponseSchema` - Pagination validation
- Common validation schemas
- `validateApiResponse()` and `safeValidateApiResponse()` helpers

### 7. React Hook for API Health

**File**: `src/hooks/useApiHealth.ts`

React hook for components to access API health status:
```typescript
const { isHealthy, isAvailable, latency, checkHealth } = useApiHealth();
```

## Usage Examples

### Making API Calls

```typescript
import { apiGet, apiPost, extractApiData } from '@/lib/apiClient';
import { ApiResponse } from '@/lib/api-types';

// GET request
const response = await apiGet<Product[]>('/vultr/postgres/products');
const products = extractApiData(response);

// POST request with options
const response = await apiPost<{ id: string }>(
  '/recommendations',
  { userId: '123' },
  undefined,
  {
    checkHealth: true,
    timeout: 10000,
    metadata: { userId: '123', sessionId: 'abc' },
  }
);
```

### Using API Health in Components

```typescript
import { useApiHealth } from '@/hooks/useApiHealth';

function MyComponent() {
  const { isHealthy, isAvailable, latency } = useApiHealth();
  
  if (!isAvailable) {
    return <div>API is unavailable</div>;
  }
  
  return <div>API latency: {latency}ms</div>;
}
```

### Backend Response Format

All backend responses are automatically wrapped:

```typescript
// Success response
{
  success: true,
  data: { /* your data */ },
  requestId: "123-abc",
  timestamp: "2024-01-01T00:00:00Z"
}

// Error response
{
  success: false,
  error: {
    code: "PRODUCT_NOT_FOUND",
    message: "Product not found",
    statusCode: 404,
    details: { /* optional details */ },
    timestamp: "2024-01-01T00:00:00Z"
  },
  requestId: "123-abc",
  timestamp: "2024-01-01T00:00:00Z"
}
```

## Migration Guide

### Updating Services

**Before**:
```typescript
const response = await api.get('/products');
const products = response.data;
```

**After**:
```typescript
import { apiGet, extractApiData } from '@/lib/apiClient';

const response = await apiGet<Product[]>('/products');
const products = extractApiData(response);
```

### Error Handling

**Before**:
```typescript
try {
  const response = await api.get('/products');
} catch (error) {
  console.error(error.response?.data?.message);
}
```

**After**:
```typescript
import { apiGet, extractApiData } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errorHandler';

try {
  const response = await apiGet<Product[]>('/products');
  const products = extractApiData(response);
} catch (error) {
  const message = getErrorMessage(error); // Handles ApiResponse format
  console.error(message);
}
```

## Benefits

1. **Type Safety** - Shared types ensure frontend and backend stay in sync
2. **Consistency** - All API responses follow the same format
3. **Better Debugging** - Request IDs enable request correlation
4. **Resilience** - Health checks and retry logic improve reliability
5. **Developer Experience** - Clearer error messages and better tooling
6. **Maintainability** - Centralized API logic makes updates easier

## Next Steps

1. Migrate remaining services to use the new API client
2. Add more validation schemas for common request/response types
3. Implement request caching based on health status
4. Add request queuing for offline scenarios
5. Create API documentation generator from types
