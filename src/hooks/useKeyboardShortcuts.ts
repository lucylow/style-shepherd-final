import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isKeyCombo } from '@/lib/accessibility';

interface KeyboardShortcut {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
  action: () => void;
  description?: string;
}

/**
 * Hook for managing keyboard shortcuts
 * Provides common navigation shortcuts and allows custom shortcuts
 */
export function useKeyboardShortcuts(customShortcuts: KeyboardShortcut[] = []) {
  const navigate = useNavigate();

  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        key: 'k',
        modifier: 'meta',
        action: () => {
          // Focus search if available, otherwise show command palette
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        },
        description: 'Focus search',
      },
      {
        key: '/',
        action: () => {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput && document.activeElement !== searchInput) {
            searchInput.focus();
          }
        },
        description: 'Focus search',
      },
      {
        key: 'h',
        modifier: 'meta',
        action: () => navigate('/'),
        description: 'Go to home',
      },
      {
        key: 'Escape',
        action: () => {
          // Close modals, dropdowns, or clear search
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement?.blur) {
            activeElement.blur();
          }
        },
        description: 'Close/clear',
      },
    ];

    const allShortcuts = [...defaultShortcuts, ...customShortcuts];

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape and Cmd/Ctrl+K even in inputs
        if (event.key !== 'Escape' && !(event.metaKey && event.key === 'k')) {
          return;
        }
      }

      for (const shortcut of allShortcuts) {
        if (shortcut.modifier) {
          if (isKeyCombo(event, shortcut.key, shortcut.modifier)) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        } else if (event.key === shortcut.key && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, customShortcuts]);
}

