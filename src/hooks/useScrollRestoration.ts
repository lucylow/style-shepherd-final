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
        return sessionStorage.getItem(key);
      } catch (error) {
        // sessionStorage may be unavailable in private browsing mode or blocked
        console.warn('Unable to access sessionStorage:', error);
        return null;
      }
    };

    const safeSetItem = (key: string, value: string): void => {
      try {
        sessionStorage.setItem(key, value);
      } catch (error) {
        // sessionStorage may be unavailable in private browsing mode or blocked
        // This is non-critical, so we just log a warning
        console.warn('Unable to save to sessionStorage:', error);
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
            if (!isNaN(position) && position >= 0) {
              window.scrollTo({
                top: position,
                behavior: 'smooth', // Smooth scroll for better UX
              });
            }
          } catch (error) {
            console.warn('Failed to restore scroll position:', error);
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
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
      clearTimeout(scrollTimeout);
      // Save position on cleanup (route change)
      saveScrollPosition();
    };
  }, [location.pathname, location.search]);
}

