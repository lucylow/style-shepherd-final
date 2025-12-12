/**
 * Global Error Handlers
 * Catches unhandled errors and promise rejections
 */

import { handleError } from './errorHandler';

let errorReportingEnabled = false;

/**
 * Report error to backend
 */
async function reportError(error: Error, context?: { action?: string }) {
  if (!errorReportingEnabled) return;

  try {
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        action: context?.action,
        url: window.location.href,
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

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

/**
 * Initialize global error handlers
 * Should be called once at app startup
 */
export function initGlobalErrorHandlers() {
  // Check if error reporting is enabled
  errorReportingEnabled = import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true';

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    console.error('Unhandled error:', error);
    
    // Report error
    reportError(error, { action: 'globalError' }).catch(() => {
      // Silently fail
    });

    // Show error to user
    handleError(error, {
      defaultMessage: 'An unexpected error occurred',
      showToast: true,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    console.error('Unhandled promise rejection:', error);
    
    // Report error
    reportError(error, { action: 'unhandledRejection' }).catch(() => {
      // Silently fail
    });

    // Show error to user
    handleError(error, {
      defaultMessage: 'An operation failed unexpectedly',
      showToast: true,
    });
    
    // Prevent default browser behavior
    event.preventDefault();
  });

  // Handle React error boundaries (already handled by ErrorBoundary component)
  // This is just for additional logging
  if (import.meta.env.DEV) {
    console.log('Global error handlers initialized');
  }
}
