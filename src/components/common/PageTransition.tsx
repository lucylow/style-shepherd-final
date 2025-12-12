import { motion } from 'framer-motion';
import { ReactNode, useEffect, useRef } from 'react';
import { skipToMain, announceToScreenReader } from '@/lib/accessibility';

interface PageTransitionProps {
  children: ReactNode;
  keyProp?: string;
}

export default function PageTransition({ children, keyProp }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Focus management on route change
    const timer = setTimeout(() => {
      const mainElement = document.querySelector('main');
      const h1Element = document.querySelector('main h1, main [role="heading"]');
      
      // Try to focus the main heading first, then main content
      if (h1Element instanceof HTMLElement) {
        h1Element.setAttribute('tabindex', '-1');
        h1Element.focus();
        announceToScreenReader(`Navigated to ${h1Element.textContent || 'page'}`);
      } else if (mainElement instanceof HTMLElement) {
        mainElement.setAttribute('tabindex', '-1');
        mainElement.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [keyProp]);

  return (
    <motion.div
      ref={containerRef}
      key={keyProp}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

