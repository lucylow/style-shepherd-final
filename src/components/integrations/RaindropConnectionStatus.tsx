/**
 * Raindrop Connection Status Component
 * Displays real-time connection status for Raindrop Smart Components
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRaindrop } from '@/hooks/useRaindrop';

export function RaindropConnectionStatus({ autoRefresh = true, refreshInterval = 30000 }: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { storeMemory, loading, error } = useRaindrop();
  const [status, setStatus] = useState<'live' | 'mock' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      // Try to store a test memory to check if Raindrop is live
      const result = await storeMemory(
        'status_check',
        'system',
        'Connection test',
        { timestamp: Date.now() }
      );
      setStatus(result.source === 'raindrop' ? 'live' : 'mock');
      setLastCheck(new Date());
    } catch (err) {
      setStatus('mock');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkStatus();
    
    if (autoRefresh) {
      const interval = setInterval(checkStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const statusColor =
    status === 'live'
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : status === 'checking'
      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      : 'bg-blue-500/10 text-blue-500 border-blue-500/20';

  const StatusIcon =
    status === 'live' ? CheckCircle2 : status === 'checking' ? Loader2 : AlertCircle;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Raindrop Smart Components
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 rounded-lg border" style={{
          backgroundColor: status === 'live' ? 'rgba(34, 197, 94, 0.1)' : 
                           status === 'checking' ? 'rgba(234, 179, 8, 0.1)' : 
                           'rgba(59, 130, 246, 0.1)',
          borderColor: status === 'live' ? 'rgba(34, 197, 94, 0.2)' : 
                       status === 'checking' ? 'rgba(234, 179, 8, 0.2)' : 
                       'rgba(59, 130, 246, 0.2)',
        }}>
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4" />
            <div>
              <div className="font-medium">SmartMemory</div>
              <div className="text-xs text-muted-foreground mt-1">
                {status === 'live' ? 'Connected to Raindrop' : status === 'checking' ? 'Checking...' : 'Using mock mode'}
              </div>
              {lastCheck && (
                <div className="text-xs text-muted-foreground mt-1">
                  Last check: {lastCheck.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {status === 'live' ? 'Live' : status === 'checking' ? 'Checking' : 'Mock'}
            </Badge>
            <StatusIcon className={`h-4 w-4 ${
              status === 'live' ? 'text-green-500' : 
              status === 'checking' ? 'text-yellow-500 animate-spin' : 
              'text-blue-500'
            }`} />
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            Error: {error.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
