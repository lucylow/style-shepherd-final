/**
 * Global Error Handlers
 * Catches unhandled errors and promise rejections
 */

import { handleError } from './errorHandler';

/**
 * Initialize global error handlers
 * Should be called once at app startup
 */
export function initGlobalErrorHandlers() {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    handleError(event.error, {
      defaultMessage: 'An unexpected error occurred',
      showToast: true,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    handleError(event.reason, {
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
