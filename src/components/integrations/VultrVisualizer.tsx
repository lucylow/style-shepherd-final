import React, { useState } from 'react';

const DEFAULT_PROMPT = "Recommend a size & single-sentence style tip for a linen midi dress for 5'3'' 135lbs.";

interface VultrVisualizerProps {
  initialResponse?: any;
  onSaved?: () => void;
}

interface Keywords {
  fabrics: string[];
  colors: string[];
  sizes: string[];
}

function extractKeywords(text = ''): Keywords {
  const fabrics = ['linen', 'cotton', 'silk', 'denim', 'wool', 'leather', 'nylon'];
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'beige', 'brown', 'gray', 'grey'];
  const sizes = text.match(/\b\d{2,3}\s?(lbs|lb)|\b\d' ?\d{1,2}\b|(\d{2,3}-\d{2,3}-\d{2,3})/ig) || [];
  const found: Keywords = {
    fabrics: fabrics.filter(f => text.toLowerCase().includes(f)),
    colors: colors.filter(c => text.toLowerCase().includes(c)),
    sizes: sizes as string[]
  };
  return found;
}

export default function VultrVisualizer({ initialResponse = null, onSaved }: VultrVisualizerProps) {
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<any>(initialResponse);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [message, setMessage] = useState('');

  async function runTest() {
    setRunning(true); 
    setMessage('');
    try {
      const r = await fetch('/api/integrations/vultr/infer', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: 'gpt-3.5-turbo', 
          messages: [
            { role: 'system', content: 'You are Fashioni, a helpful stylist.' }, 
            { role: 'user', content: prompt }
          ] 
        })
      });
      const j = await r.json();
      setResponse(j);
    } catch (e) { 
      setMessage('Error: ' + String(e)); 
    } finally { 
      setRunning(false); 
    }
  }

  async function saveToMemory() {
    const text = (response?.choices?.[0]?.message?.content) || response?.choices || String(response);
    try {
      const r = await fetch('/api/raindrop/store-memory', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'demo_user', 
          type: 'working', 
          text, 
          metadata: { source: 'vultr_visualizer' } 
        })
      });
      const j = await r.json();
      if (r.ok) {
        setMessage('Saved to SmartMemory (mock/live).');
        if (onSaved) {
          onSaved();
        }
      } else {
        setMessage('Save failed: ' + (j.error || JSON.stringify(j)));
      }
    } catch (e) { 
      setMessage('Save error: ' + String(e)); 
    }
  }

  async function speakResponse() {
    const text = (response?.choices?.[0]?.message?.content) || response?.choices || String(response);
    try {
      const r = await fetch('/api/integrations/elevenlabs/tts', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text })
      });
      const j = await r.json();
      const url = j?.dataUrl || j?.url;
      if (url) {
        const a = new Audio(url);
        a.play().catch(e => console.warn(e));
      } else {
        setMessage('TTS failed: ' + (j?.error || 'no audio'));
      }
    } catch (e) {
      setMessage('TTS error: ' + String(e));
    }
  }

  const text = (response?.choices?.[0]?.message?.content) || response?.choices || '';
  const kw = extractKeywords(String(text || ''));
  return (
    <div style={{ padding: 12, borderRadius: 10, background: '#fff' }}>
      <h4 style={{ marginTop: 0 }}>Vultr Response Visualizer</h4>

      <textarea 
        value={prompt} 
        onChange={e => setPrompt(e.target.value)} 
        rows={3} 
        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #eee' }} 
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button 
          onClick={runTest} 
          disabled={running} 
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #eef2f6', background: '#fff', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1 }}
        >
          {running ? 'Running…' : 'Run Vultr'}
        </button>
        <button 
          onClick={saveToMemory} 
          disabled={!response} 
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #eef2f6', background: '#fff', cursor: !response ? 'not-allowed' : 'pointer', opacity: !response ? 0.5 : 1 }}
        >
          Save
        </button>
        <button 
          onClick={speakResponse} 
          disabled={!response} 
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #eef2f6', background: '#fff', cursor: !response ? 'not-allowed' : 'pointer', opacity: !response ? 0.5 : 1 }}
        >
          Speak
        </button>
      </div>

      <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #eef2f6' }}>
        <strong>Assistant</strong>
        <div style={{ marginTop: 8, color: '#0f172a' }}>{text || <span style={{ color: '#64748b' }}>No response yet</span>}</div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Fabrics</div>
          <div style={{ marginTop: 8 }}>{kw.fabrics.length ? kw.fabrics.join(', ') : <span style={{ color: '#94a3b8' }}>—</span>}</div>
        </div>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Colors</div>
          <div style={{ marginTop: 8 }}>{kw.colors.length ? kw.colors.join(', ') : <span style={{ color: '#94a3b8' }}>—</span>}</div>
        </div>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Size tokens</div>
          <div style={{ marginTop: 8 }}>{kw.sizes.length ? kw.sizes.join(', ') : <span style={{ color: '#94a3b8' }}>—</span>}</div>
        </div>
      </div>

      {message && <div style={{ marginTop: 10, color: '#dc2626' }}>{message}</div>}
    </div>
  );
}
