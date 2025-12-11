/**
 * API Health Check Utility
 * 
 * Monitors backend API health and provides connection status
 */

import { getApiBaseUrl } from './api-config';
import { HealthCheckResponse } from './api-types';

export interface ApiHealthStatus {
  isHealthy: boolean;
  isAvailable: boolean;
  lastCheck: Date | null;
  latency: number | null;
  services: HealthCheckResponse['services'] | null;
}

class ApiHealthMonitor {
  private status: ApiHealthStatus = {
    isHealthy: false,
    isAvailable: false,
    lastCheck: null,
    latency: null,
    services: null,
  };

  private checkInterval: number | null = null;
  private subscribers: Set<(status: ApiHealthStatus) => void> = new Set();

  /**
   * Check API health
   */
  async checkHealth(): Promise<ApiHealthStatus> {
    const startTime = Date.now();
    
    try {
      const baseUrl = getApiBaseUrl();
      const healthUrl = baseUrl.replace('/api', '/health');
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const latency = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data: HealthCheckResponse = await response.json();
      
      const isHealthy = data.status === 'healthy';
      const isAvailable = true;

      this.status = {
        isHealthy,
        isAvailable,
        lastCheck: new Date(),
        latency,
        services: data.services,
      };

      this.notifySubscribers();
      return this.status;
    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.status = {
        isHealthy: false,
        isAvailable: false,
        lastCheck: new Date(),
        latency,
        services: null,
      };

      this.notifySubscribers();
      return this.status;
    }
  }

  /**
   * Start periodic health checks
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval !== null) {
      this.stopMonitoring();
    }

    // Check immediately
    this.checkHealth();

    // Then check periodically
    this.checkInterval = window.setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopMonitoring(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current health status
   */
  getStatus(): ApiHealthStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(callback: (status: ApiHealthStatus) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately call with current status
    callback(this.status);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in health status subscriber:', error);
      }
    });
  }

  /**
   * Check if API is available before making requests
   */
  async ensureAvailable(): Promise<boolean> {
    const status = await this.checkHealth();
    return status.isAvailable;
  }
}

export const apiHealthMonitor = new ApiHealthMonitor();

// Start monitoring in development
if (import.meta.env.DEV) {
  apiHealthMonitor.startMonitoring(30000); // Check every 30 seconds
}
