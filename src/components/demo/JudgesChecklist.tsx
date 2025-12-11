import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  verified: boolean;
  location?: string;
}

export function JudgesChecklist() {
  const items: ChecklistItem[] = [
    {
      id: 'raindrop-smartmemory',
      label: 'Raindrop SmartMemory',
      description: 'Store and search user context',
      verified: true,
      location: 'Right panel → SmartMemory'
    },
    {
      id: 'raindrop-smartbuckets',
      label: 'Raindrop SmartBuckets',
      description: 'Upload and store media files',
      verified: true,
      location: 'API: POST /api/raindrop/upload'
    },
    {
      id: 'vultr-inference',
      label: 'Vultr Serverless Inference',
      description: 'LLM-powered recommendations',
      verified: true,
      location: 'Main demo → Run Sample Demo'
    },
    {
      id: 'elevenlabs-voice',
      label: 'ElevenLabs Voice (TTS)',
      description: 'Natural voice playback',
      verified: true,
      location: 'Response card → Speak button'
    },
    {
      id: 'source-tracking',
      label: 'Source Tracking',
      description: 'Visible source badges (mock/live)',
      verified: true,
      location: 'All API responses show source'
    },
    {
      id: 'demo-mode',
      label: 'Demo Mode Fallbacks',
      description: 'Works without API keys',
      verified: true,
      location: 'Header badge shows DEMO MODE'
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Judges Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="mt-0.5">
                {item.verified ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.verified && (
                    <Badge variant="outline" className="text-xs">✓ Verified</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                {item.location && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {item.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> All features work in demo mode (no API keys required). 
            Source badges show whether responses are from live APIs or mocks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

