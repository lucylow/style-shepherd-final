import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';

export function VultrStatusCard() {
  const [status, setStatus] = useState<'checking' | 'live' | 'mock'>('checking');

  useEffect(() => {
    // Check status by making a minimal test call
    fetch('/api/vultr/status')
      .then(r => r.json())
      .then(data => setStatus(data?.live ? 'live' : 'mock'))
      .catch(() => setStatus('mock'));
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">Vultr Inference</div>
            <div className="text-xs text-muted-foreground">Calls /api/vultr/infer</div>
          </div>
          <Badge variant={status === 'live' ? 'default' : 'secondary'}>
            {status === 'checking' ? '...' : status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
