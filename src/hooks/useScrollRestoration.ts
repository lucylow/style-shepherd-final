import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to restore scroll position when navigating back/forward
 * Uses sessionStorage to persist scroll positions per route
 */
export default function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // Helper function to safely access sessionStorage
    const safeGetItem = (key: string): string | null => {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) {
          return null;
        }
        return sessionStorage.getItem(key);
      } catch (error: any) {
        // sessionStorage may be unavailable in private browsing mode or blocked
        // Check for specific error types
        if (error?.name === 'QuotaExceededError') {
          console.warn('SessionStorage quota exceeded, clearing old entries');
          try {
            // Clear old entries if quota exceeded
            const keys = Object.keys(sessionStorage);
            for (let i = 0; i < Math.floor(keys.length / 2); i++) {
              sessionStorage.removeItem(keys[i]);
            }
            return sessionStorage.getItem(key);
          } catch {
            return null;
          }
        } else if (error?.name === 'SecurityError') {
          console.warn('SessionStorage access denied (likely due to privacy settings)');
        } else {
          console.warn('Unable to access sessionStorage:', error?.message || error);
        }
        return null;
      }
    };

    const safeSetItem = (key: string, value: string): void => {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) {
          return;
        }
        sessionStorage.setItem(key, value);
      } catch (error: any) {
        // sessionStorage may be unavailable in private browsing mode or blocked
        if (error?.name === 'QuotaExceededError') {
          console.warn('SessionStorage quota exceeded when saving scroll position');
          try {
            // Try to clear old entries and retry
            const keys = Object.keys(sessionStorage);
            const scrollKeys = keys.filter(k => k.startsWith('scroll:'));
            // Remove oldest half of scroll keys
            scrollKeys.slice(0, Math.floor(scrollKeys.length / 2)).forEach(k => {
              try {
                sessionStorage.removeItem(k);
              } catch {
                // Ignore errors when clearing
              }
            });
            // Retry setting the item
            sessionStorage.setItem(key, value);
          } catch {
            // If retry fails, just log and continue
            console.warn('Unable to save scroll position after quota cleanup');
          }
        } else if (error?.name === 'SecurityError') {
          // Privacy settings block storage - this is expected in some browsers
          // Don't log as error, just silently fail
        } else {
          console.warn('Unable to save to sessionStorage:', error?.message || error);
        }
      }
    };

    // Restore scroll position for current route
    const scrollKey = `scroll:${location.pathname}${location.search}`;
    const savedPosition = safeGetItem(scrollKey);
    
    if (savedPosition) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          try {
            const position = Number(savedPosition);
            if (!isNaN(position) && position >= 0 && position < Number.MAX_SAFE_INTEGER) {
              // Use requestAnimationFrame to ensure DOM is ready
              requestAnimationFrame(() => {
                try {
                  window.scrollTo({
                    top: position,
                    behavior: 'smooth', // Smooth scroll for better UX
                  });
                } catch (scrollError: any) {
                  // Fallback to instant scroll if smooth fails
                  try {
                    window.scrollTo(0, position);
                  } catch {
                    console.warn('Failed to restore scroll position:', scrollError?.message || scrollError);
                  }
                }
              });
            } else {
              console.warn('Invalid scroll position value:', savedPosition);
            }
          } catch (error: any) {
            console.warn('Failed to restore scroll position:', error?.message || error);
          }
        }, 50);
      });
    } else {
      // If no saved position, scroll to top smoothly
      requestAnimationFrame(() => {
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          console.warn('Failed to scroll to top:', error);
        }
      });
    }

    // Save scroll position before leaving
    const saveScrollPosition = () => {
      const scrollKey = `scroll:${location.pathname}${location.search}`;
      const scrollY = window.scrollY || 0;
      safeSetItem(scrollKey, String(scrollY));
    };

    // Save on scroll (throttled)
    let scrollTimeout: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        try {
          saveScrollPosition();
        } catch (error: any) {
          console.warn('Error saving scroll position:', error?.message || error);
        }
        scrollTimeout = null;
      }, 100);
    };

    try {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('beforeunload', saveScrollPosition);
    } catch (error: any) {
      console.warn('Failed to attach scroll listeners:', error?.message || error);
    }

    return () => {
      try {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('beforeunload', saveScrollPosition);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        // Save position on cleanup (route change)
        saveScrollPosition();
      } catch (error: any) {
        console.warn('Error cleaning up scroll restoration:', error?.message || error);
      }
    };
  }, [location.pathname, location.search]);
}

