import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap } from 'lucide-react';
import { storeMemory } from '@/lib/raindropClient';

interface Props {
  onResult?: (text: string) => void;
}

export function VultrInferButton({ onResult }: Props) {
  const [prompt, setPrompt] = useState('Recommend a size for a midi dress for someone 5\'4" 130lbs');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; source: string } | null>(null);

  const runInference = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/vultr/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are Fashioni, a helpful style assistant.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      
      if (!resp.ok) throw new Error('API error');
      
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || 'No response';
      const source = data?.source || 'vultr';
      
      setResult({ text, source });
      onResult?.(text);
      
      // Save to Raindrop SmartMemory (best-effort)
      try {
        await storeMemory('demo_user', 'working', text, { source: 'vultr-demo' });
      } catch (e) {
        console.warn('Memory store failed:', e);
      }
    } catch (err) {
      // Fallback mock response
      const mockText = `Fashioni (mock): For "${prompt.slice(0, 30)}..." I recommend Size M with a relaxed fit.`;
      setResult({ text: mockText, source: 'mock' });
      onResult?.(mockText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-4 space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a style question..."
          className="min-h-[60px] text-sm"
        />
        <Button onClick={runInference} disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Run Vultr Inference
        </Button>
        {result && (
          <div className="p-3 rounded bg-muted/50 text-sm">
            <div className="text-xs text-muted-foreground mb-1">Source: {result.source}</div>
            <div>{result.text}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
