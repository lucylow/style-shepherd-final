import { ReactNode } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that sets up global keyboard shortcuts
 */
export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  useKeyboardShortcuts([]);
  return <>{children}</>;
}
