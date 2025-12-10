import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { VultrStatusCard } from '@/components/demo/VultrStatusCard';
import { VultrInferButton } from '@/components/demo/VultrInferButton';
import { MemoryPanel } from '@/components/demo/MemoryPanel';
import { TTSPlayButton } from '@/components/demo/TTSPlayButton';

export default function DemoIntegrations() {
  const [lastResult, setLastResult] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Style Shepherd — Integrations Demo</h1>
          </div>
          <Badge variant="secondary">DEMO MODE</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Demo Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50">
              <h2 className="text-xl font-semibold mb-2">Vultr Serverless Inference</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Test the Vultr LLM integration. Results are saved to Raindrop SmartMemory.
              </p>
              <VultrInferButton onResult={setLastResult} />
            </div>

            {lastResult && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Last Response</span>
                  <TTSPlayButton text={lastResult} />
                </div>
                <p className="text-sm text-muted-foreground">{lastResult}</p>
              </div>
            )}
          </div>

          {/* Right Column - Status & Memory */}
          <div className="space-y-4">
            <VultrStatusCard />
            <MemoryPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
