/**
 * Error Monitoring Hook
 * Provides utilities for monitoring and reporting errors
 */

import { useCallback, useEffect } from 'react';
import { handleError } from '@/lib/errorHandler';

export interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
  url: string;
  userAgent: string;
}

/**
 * Hook for error monitoring and reporting
 */
export function useErrorMonitoring() {
  const reportError = useCallback(async (error: Error, context?: ErrorReport['context']) => {
    const errorReport: ErrorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Log error locally
    console.error('Error reported:', errorReport);

    // Send to error tracking endpoint if available
    if (import.meta.env.PROD && import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true') {
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
        }).catch(() => {
          // Silently fail if error reporting endpoint is not available
        });
      } catch {
        // Silently fail error reporting
      }
    }
  }, []);

  const handleErrorWithMonitoring = useCallback(
    (error: unknown, options?: { defaultMessage?: string; showToast?: boolean; context?: ErrorReport['context'] }) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Report error
      reportError(errorObj, options?.context).catch(() => {
        // Silently fail error reporting
      });

      // Handle error normally
      return handleError(error, {
        defaultMessage: options?.defaultMessage,
        showToast: options?.showToast,
      });
    },
    [reportError]
  );

  // Set up global error handlers
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      reportError(error, {
        action: 'unhandledRejection',
      }).catch(() => {
        // Silently fail
      });

      // Still show error to user
      handleError(error, {
        defaultMessage: 'An unexpected error occurred',
      });
    };

    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      
      reportError(error, {
        action: 'globalError',
      }).catch(() => {
        // Silently fail
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [reportError]);

  return {
    reportError,
    handleErrorWithMonitoring,
  };
}

