# Error Handling Improvements

This document outlines the comprehensive error handling improvements made to the Style Shepherd application.

## Overview

The error handling system has been enhanced with:
- Structured error logging on the backend
- Centralized error handling utilities on the frontend
- User-friendly error messages
- Global error handlers for unhandled errors
- Improved error boundaries
- Better error recovery mechanisms

## Backend Improvements

### 1. Structured Error Logging (`server/src/lib/errorLogger.ts`)

- **Structured logging** with context (request details, error details, timestamps)
- **Severity levels** (ERROR, WARN, INFO, DEBUG)
- **Production-ready** JSON logging format
- **Sensitive data sanitization** (passwords, tokens, etc.)
- **Request context tracking** (method, path, IP, user agent, userId)

### 2. Async Error Handler Middleware (`server/src/middleware/asyncHandler.ts`)

- **Automatic error catching** for async route handlers
- **Prevents unhandled promise rejections** in Express routes
- **Usage**: Wrap async route handlers with `asyncHandler()`

```typescript
router.get('/path', asyncHandler(async (req, res) => {
  // Your async code here
  // Errors are automatically caught and passed to error middleware
}));
```

### 3. Enhanced Error Middleware (`server/src/index.ts`)

- **Improved error response formatting**
- **Security**: Doesn't expose internal error details in production
- **Structured logging** integration
- **Context-aware error messages**

### 4. Global Error Handlers (`server/src/index.ts`)

- **Uncaught exception handler**: Catches and logs unexpected errors
- **Unhandled rejection handler**: Logs unhandled promise rejections
- **Graceful shutdown**: Properly closes connections on termination

## Frontend Improvements

### 1. Centralized Error Handler (`src/lib/errorHandler.ts`)

Provides utilities for consistent error handling:

- **`getErrorMessage(error)`**: Extracts user-friendly error messages
- **`handleError(error, options)`**: Handles errors and shows toast notifications
- **`handleErrorSilently(error)`**: Logs errors without showing toasts
- **`isNetworkError(error)`**: Checks if error is a network issue
- **`isTimeoutError(error)`**: Checks if error is a timeout
- **`isClientError(error)` / `isServerError(error)`**: Categorizes errors

**Usage:**
```typescript
import { handleError } from '@/lib/errorHandler';

try {
  await someAsyncOperation();
} catch (error) {
  handleError(error, {
    defaultMessage: 'Operation failed',
    showToast: true,
  });
}
```

### 2. React Error Handler Hook (`src/hooks/useErrorHandler.ts`)

Provides React hooks for error handling:

- **`useErrorHandler()`**: Returns error handling utilities
- **`useAsyncErrorHandler()`**: Wraps async functions with error handling

**Usage:**
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handle, handleSilently } = useErrorHandler();
  
  const handleClick = async () => {
    try {
      await apiCall();
    } catch (error) {
      handle(error);
    }
  };
}
```

### 3. Global Error Handlers (`src/lib/globalErrorHandler.ts`)

- **Window error handler**: Catches unhandled JavaScript errors
- **Unhandled rejection handler**: Catches unhandled promise rejections
- **Initialized in App.tsx** on application startup

### 4. Enhanced Error Boundary (`src/components/ErrorBoundary.tsx`)

- **Better error context logging** (component stack, user agent, URL)
- **Production-ready error reporting** (ready for Sentry integration)
- **Improved error display** with recovery options

### 5. API Client Improvements (`src/lib/api.ts`)

- **Enhanced error logging** with request context
- **Better error categorization** (network, timeout, server errors)
- **Improved error messages** in interceptors

## Service Improvements

### Product Service (`src/services/productService.ts`)

- Uses `handleErrorSilently()` for fallback scenarios
- Better error logging without user disruption

### AI Assistant Service (`src/services/aiAssistant.ts`)

- Improved error message extraction from API responses
- Better error propagation to callers

### Recommendation List Component (`src/components/recommendations/RecommendationList.tsx`)

- Uses centralized error handler
- Silent error handling for non-critical operations (logging clicks, etc.)

## Error Message Guidelines

### User-Friendly Messages

Errors are automatically converted to user-friendly messages:

- **400 (Bad Request)**: "Invalid request. Please check your input and try again."
- **401 (Unauthorized)**: "You need to be logged in to perform this action."
- **403 (Forbidden)**: "You don't have permission to perform this action."
- **404 (Not Found)**: "The requested resource was not found."
- **429 (Too Many Requests)**: "Too many requests. Please wait a moment and try again."
- **500 (Server Error)**: "Server error. Our team has been notified. Please try again later."
- **502/503 (Service Unavailable)**: "Service is currently unavailable. Please try again later."
- **504 (Timeout)**: "Request timed out. Please try again."

### Network Errors

- **Connection errors**: "Network connection failed. Please check your internet connection."
- **Timeout errors**: "The request took too long. Please try again."

## Best Practices

### Backend

1. **Use AppError classes** for operational errors:
   ```typescript
   throw new ValidationError('Invalid input', { field: 'email' });
   ```

2. **Wrap async route handlers** with `asyncHandler()`:
   ```typescript
   router.get('/path', asyncHandler(async (req, res) => {
     // Your code
   }));
   ```

3. **Let errors propagate** to middleware - don't catch and swallow errors unnecessarily

### Frontend

1. **Use `handleError()`** for user-facing errors:
   ```typescript
   try {
     await operation();
   } catch (error) {
     handleError(error);
   }
   ```

2. **Use `handleErrorSilently()`** for background operations:
   ```typescript
   api.logClick().catch(err => handleErrorSilently(err));
   ```

3. **Use the error handler hook** in React components:
   ```typescript
   const { handle } = useErrorHandler();
   ```

4. **Don't show toasts for fallback scenarios** - use silent handling

## Future Enhancements

1. **Error Tracking Integration**: Add Sentry or similar service
2. **Error Analytics**: Track error rates and patterns
3. **Retry Logic**: Automatic retry for transient errors
4. **Error Recovery**: Automatic recovery strategies for common errors
5. **User Feedback**: Allow users to report errors with context

## Migration Guide

### Updating Existing Code

1. **Replace console.error with handleError**:
   ```typescript
   // Before
   catch (error) {
     console.error('Error:', error);
     toast.error('Something went wrong');
   }
   
   // After
   catch (error) {
     handleError(error);
   }
   ```

2. **Use silent handling for background operations**:
   ```typescript
   // Before
   api.log().catch(err => console.warn(err));
   
   // After
   api.log().catch(err => handleErrorSilently(err));
   ```

3. **Wrap async route handlers** (if not already wrapped):
   ```typescript
   // Before
   router.get('/path', async (req, res) => {
     try {
       // code
     } catch (error) {
       next(error);
     }
   });
   
   // After
   router.get('/path', asyncHandler(async (req, res) => {
     // code - errors automatically caught
   }));
   ```

## Testing Error Handling

1. **Test network errors**: Disable network in DevTools
2. **Test timeout errors**: Set very low timeout values
3. **Test server errors**: Return 500 from API endpoints
4. **Test error boundaries**: Throw errors in React components
5. **Test unhandled rejections**: Create unhandled promise rejections

## Monitoring

In production, monitor:
- Error rates by endpoint
- Error types and frequencies
- User impact (which errors affect users most)
- Error recovery success rates
