/**
 * React Hook for API Health Monitoring
 * 
 * Provides real-time API health status to components
 */

import { useState, useEffect } from 'react';
import { apiHealthMonitor, ApiHealthStatus } from '@/lib/api-health';

export function useApiHealth() {
  const [status, setStatus] = useState<ApiHealthStatus>(apiHealthMonitor.getStatus());

  useEffect(() => {
    // Subscribe to health status changes
    const unsubscribe = apiHealthMonitor.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    checkHealth: () => apiHealthMonitor.checkHealth(),
  };
}
