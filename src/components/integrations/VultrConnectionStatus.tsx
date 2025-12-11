/**
 * Vultr Connection Status Component
 * Displays real-time connection status for Vultr PostgreSQL and Valkey services
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Server, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  latency?: number;
  error?: string;
  icon: React.ReactNode;
}

export function VultrConnectionStatus({ autoRefresh = true, refreshInterval = 30000 }: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [postgresStatus, setPostgresStatus] = useState<ServiceStatus>({
    name: 'PostgreSQL',
    status: 'checking',
    icon: <Database className="h-4 w-4" />,
  });
  
  const [valkeyStatus, setValkeyStatus] = useState<ServiceStatus>({
    name: 'Valkey',
    status: 'checking',
    icon: <Server className="h-4 w-4" />,
  });

  const checkStatus = async () => {
    // Check PostgreSQL
    try {
      const pgResponse = await fetch(`${getApiBaseUrl()}/vultr/postgres/health`);
      const pgData = await pgResponse.json();
      setPostgresStatus({
        name: 'PostgreSQL',
        status: pgData.status === 'healthy' ? 'healthy' : 'unhealthy',
        latency: pgData.latency,
        error: pgData.error,
        icon: <Database className="h-4 w-4" />,
      });
    } catch (error: any) {
      setPostgresStatus({
        name: 'PostgreSQL',
        status: 'unhealthy',
        error: error.message,
        icon: <Database className="h-4 w-4" />,
      });
    }

    // Check Valkey
    try {
      const valkeyResponse = await fetch(`${getApiBaseUrl()}/vultr/valkey/health`);
      const valkeyData = await valkeyResponse.json();
      setValkeyStatus({
        name: 'Valkey',
        status: valkeyData.status === 'healthy' ? 'healthy' : 'unhealthy',
        latency: valkeyData.latency,
        error: valkeyData.error,
        icon: <Server className="h-4 w-4" />,
      });
    } catch (error: any) {
      setValkeyStatus({
        name: 'Valkey',
        status: 'unhealthy',
        error: error.message,
        icon: <Server className="h-4 w-4" />,
      });
    }
  };

  useEffect(() => {
    checkStatus();
    
    if (autoRefresh) {
      const interval = setInterval(checkStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const renderService = (service: ServiceStatus) => {
    const statusColor =
      service.status === 'healthy'
        ? 'bg-green-500/10 text-green-500 border-green-500/20'
        : service.status === 'checking'
        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        : 'bg-red-500/10 text-red-500 border-red-500/20';

    const StatusIcon =
      service.status === 'healthy' ? CheckCircle2 : AlertCircle;

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border" style={{
        backgroundColor: service.status === 'healthy' ? 'rgba(34, 197, 94, 0.1)' : 
                         service.status === 'checking' ? 'rgba(234, 179, 8, 0.1)' : 
                         'rgba(239, 68, 68, 0.1)',
        borderColor: service.status === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : 
                     service.status === 'checking' ? 'rgba(234, 179, 8, 0.2)' : 
                     'rgba(239, 68, 68, 0.2)',
      }}>
        <div className="flex items-center gap-3">
          {service.icon}
          <div>
            <div className="font-medium">{service.name}</div>
            {service.error && (
              <div className="text-xs text-muted-foreground mt-1">{service.error}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {service.latency !== undefined && (
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {service.latency}ms
            </Badge>
          )}
          <StatusIcon className={`h-4 w-4 ${service.status === 'healthy' ? 'text-green-500' : service.status === 'checking' ? 'text-yellow-500' : 'text-red-500'}`} />
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Vultr Services Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderService(postgresStatus)}
        {renderService(valkeyStatus)}
      </CardContent>
    </Card>
  );
}
