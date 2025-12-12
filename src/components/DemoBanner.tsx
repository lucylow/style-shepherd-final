/**
 * Demo Banner Component
 * Shows when the app is running in demo mode with mock data
 */

import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { getDemoModeMessage, isDemoMode } from '@/lib/api-config-improved';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const message = getDemoModeMessage();
  
  if (!isDemoMode() || !message || dismissed) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <strong>Demo Mode:</strong> {message}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="Dismiss demo banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
