import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Database } from 'lucide-react';

interface SourceBadgeProps {
  source: 'vultr' | 'mock' | 'cache' | 'raindrop' | 'elevenlabs' | string;
  size?: 'sm' | 'default';
}

export function SourceBadge({ source, size = 'default' }: SourceBadgeProps) {
  const isLive = source === 'vultr' || source === 'raindrop' || source === 'elevenlabs';
  const isCached = source === 'cache';
  
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon?: React.ReactNode }> = {
    vultr: { 
      label: 'VULTR', 
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    raindrop: { 
      label: 'RAINDROP', 
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    elevenlabs: { 
      label: 'ELEVENLABS', 
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    cache: { 
      label: 'CACHE', 
      variant: 'outline',
      icon: <Database className="h-3 w-3" />
    },
    mock: { 
      label: 'MOCK', 
      variant: 'secondary',
      icon: <XCircle className="h-3 w-3" />
    },
  };

  const config = variants[source] || { 
    label: source.toUpperCase(), 
    variant: 'secondary' as const 
  };

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}
    >
      {config.icon}
      <span>source: {config.label}</span>
    </Badge>
  );
}

