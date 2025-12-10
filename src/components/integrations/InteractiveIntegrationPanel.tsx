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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 18, marginTop: 18 }}>
      <div>
        <IntegrationStatus />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div><MemoryTimeline userId={userId} onSelect={m => setSelectedMemory(m)} /></div>
          <div style={{ display: 'grid', gap: 12 }}>
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

        <div style={{ marginTop: 12 }}>
          <VultrVisualizer onSaved={() => { 
            // Optional: refresh timeline via ref or event
            window.dispatchEvent(new CustomEvent('memory-updated'));
          }} />
        </div>
      </div>

      <aside>
        <div style={{ padding: 12, borderRadius: 10, background: '#fff' }}>
          <h4 style={{ margin: 0 }}>Selected Memory</h4>
          {!selectedMemory && <div style={{ color: '#64748b', marginTop: 8 }}>Click a memory in the timeline to inspect.</div>}
          {selectedMemory && (
            <div style={{ marginTop: 10 }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{selectedMemory.text || selectedMemory?.resp?.text}</div>
              <div style={{ marginTop: 8, color: '#94a3b8' }}>{selectedMemory.createdAt || selectedMemory?.resp?.createdAt}</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Quick Dev Tools</h4>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <a 
              href="/api/integrations/status" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: 8, borderRadius: 8, background: '#f8fafc', textDecoration: 'none', color: '#0f172a', border: '1px solid #eef2f6' }}
            >
              Open /api/integrations/status
            </a>
            <a 
              href="/api/raindrop/search-memory" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: 8, borderRadius: 8, background: '#f8fafc', textDecoration: 'none', color: '#0f172a', border: '1px solid #eef2f6' }}
            >
              Open search API (POST)
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
