import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Cloud, Volume2, Brain } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { SourceBadge } from './SourceBadge';

interface IntegrationStatus {
  name: string;
  icon: React.ReactNode;
  status: 'checking' | 'live' | 'mock';
  endpoint?: string;
  source?: string;
}

export function IntegrationStatusCards() {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([
    { name: 'Vultr Inference', icon: <Server className="h-4 w-4" />, status: 'checking', endpoint: '/vultr/infer' },
    { name: 'ElevenLabs TTS', icon: <Volume2 className="h-4 w-4" />, status: 'checking', endpoint: '/elevenlabs/tts' },
    { name: 'Raindrop SmartMemory', icon: <Brain className="h-4 w-4" />, status: 'checking' },
  ]);

  useEffect(() => {
    // Check Vultr status
    fetch(`${getApiBaseUrl()}/vultr/status`)
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        setStatuses(prev => prev.map(s => 
          s.name === 'Vultr Inference' 
            ? { ...s, status: data?.live ? 'live' : 'mock', source: data?.source || 'mock' }
            : s
        ));
      })
      .catch(() => {
        setStatuses(prev => prev.map(s => 
          s.name === 'Vultr Inference' ? { ...s, status: 'mock', source: 'mock' } : s
        ));
      });

    // Check ElevenLabs status (via a test endpoint or env check)
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    setStatuses(prev => prev.map(s => 
      s.name === 'ElevenLabs TTS' 
        ? { ...s, status: elevenLabsKey ? 'live' : 'mock', source: elevenLabsKey ? 'elevenlabs' : 'mock' }
        : s
    ));

    // Check Raindrop status
    const raindropKey = import.meta.env.VITE_RAINDROP_API_KEY;
    setStatuses(prev => prev.map(s => 
      s.name === 'Raindrop SmartMemory' 
        ? { ...s, status: raindropKey ? 'live' : 'mock', source: raindropKey ? 'raindrop' : 'mock' }
        : s
    ));
  }, []);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">Integration Status</h3>
        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground">{status.icon}</div>
                <div>
                  <div className="text-sm font-medium">{status.name}</div>
                  {status.endpoint && (
                    <div className="text-xs text-muted-foreground">POST {status.endpoint}</div>
                  )}
                </div>
              </div>
              {status.source && (
                <SourceBadge source={status.source} size="sm" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

