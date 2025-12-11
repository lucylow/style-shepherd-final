import React, { useState } from 'react';
import IntegrationStatus from './IntegrationStatus';
import MemoryTimeline from './MemoryTimeline';
import TagCloud from './TagCloud';
import SizeDistribution from './SizeDistribution';
import VultrVisualizer from './VultrVisualizer';

interface InteractiveIntegrationPanelProps {
  userId?: string;
}

interface MemoryItem {
  id?: string;
  text?: string;
  createdAt?: string;
  resp?: {
    id?: string;
    text?: string;
    createdAt?: string;
  };
  message?: string;
}

export default function InteractiveIntegrationPanel({ userId = 'demo_user' }: InteractiveIntegrationPanelProps) {
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 lg:gap-[18px] mt-4 lg:mt-[18px]">
      <div>
        <IntegrationStatus />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-3 mt-3 lg:mt-3">
          <div><MemoryTimeline userId={userId} onSelect={m => setSelectedMemory(m)} /></div>
          <div className="grid gap-3 lg:gap-3">
            <TagCloud 
              userId={userId} 
              onTag={(t) => {
                const input = document.querySelector('input[placeholder*="Search memories"], input[placeholder*="Search"]') as HTMLInputElement;
                if (input) {
                  input.focus();
                  input.value = t;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }} 
            />
            <SizeDistribution userId={userId} />
          </div>
        </div>

        <div className="mt-3 lg:mt-3">
          <VultrVisualizer onSaved={() => { 
            // Optional: refresh timeline via ref or event
            window.dispatchEvent(new CustomEvent('memory-updated'));
          }} />
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:h-fit">
        <div className="p-3 lg:p-3 rounded-lg bg-card border border-border">
          <h4 className="text-base font-semibold text-foreground m-0">Selected Memory</h4>
          {!selectedMemory && <div className="text-muted-foreground mt-2 text-sm">Click a memory in the timeline to inspect.</div>}
          {selectedMemory && (
            <div className="mt-2.5">
              <div className="whitespace-pre-wrap text-sm text-foreground">{selectedMemory.text || selectedMemory?.resp?.text}</div>
              <div className="mt-2 text-xs text-muted-foreground">{selectedMemory.createdAt || selectedMemory?.resp?.createdAt}</div>
            </div>
          )}
        </div>

        <div className="mt-3 lg:mt-3">
          <h4 className="text-base font-semibold text-foreground mb-2">Quick Dev Tools</h4>
          <div className="flex flex-col gap-2">
            <a 
              href="/api/integrations/status" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted text-foreground no-underline border border-border hover:bg-muted/80 transition-colors text-sm"
            >
              Open /api/integrations/status
            </a>
            <a 
              href="/api/raindrop/search-memory" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-muted text-foreground no-underline border border-border hover:bg-muted/80 transition-colors text-sm"
            >
              Open search API (POST)
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

