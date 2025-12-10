import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, Volume2, Brain, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { VultrInferButton } from '@/components/demo/VultrInferButton';
import { MemoryPanel } from '@/components/demo/MemoryPanel';
import { TTSPlayButton } from '@/components/demo/TTSPlayButton';
import { IntegrationStatusCards } from '@/components/demo/IntegrationStatusCards';
import { JudgesChecklist } from '@/components/demo/JudgesChecklist';
import { SourceBadge } from '@/components/demo/SourceBadge';
import { getApiBaseUrl } from '@/lib/api-config';
import { storeMemory } from '@/lib/raindropClient';
import { toast } from 'sonner';

interface DemoResponse {
  text: string;
  source: 'vultr' | 'mock' | 'cache';
  timestamp: string;
}

export default function FashioniDemo() {
  const [prompt, setPrompt] = useState('Recommend a size for a midi dress for someone 5\'4" 130lbs');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DemoResponse | null>(null);
  const [audioSource, setAudioSource] = useState<string | null>(null);

  const runSampleDemo = async () => {
    setLoading(true);
    setResponse(null);
    setAudioSource(null);

    try {
      // Step 1: Run Vultr inference
      const inferResp = await fetch(`${getApiBaseUrl()}/vultr/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama2-7b-chat-Q5_K_M',
          messages: [
            { role: 'system', content: 'You are Fashioni, a helpful style assistant. Be concise and friendly.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!inferResp.ok) throw new Error('Inference failed');

      const inferData = await inferResp.json();
      const responseText = inferData?.choices?.[0]?.message?.content || 'No response';
      const source = inferData?.source || 'mock';

      const demoResponse: DemoResponse = {
        text: responseText,
        source: source as 'vultr' | 'mock' | 'cache',
        timestamp: new Date().toISOString()
      };

      setResponse(demoResponse);

      // Step 2: Save to SmartMemory
      try {
        await storeMemory('demo_user', 'working', responseText, { 
          source: source,
          prompt: prompt,
          demo: true 
        });
        toast.success('Saved to SmartMemory');
      } catch (e) {
        console.warn('Memory store failed:', e);
        toast.warning('Memory store failed (using mock)');
      }

      // Step 3: Generate TTS
      try {
        const ttsResp = await fetch(`${getApiBaseUrl()}/elevenlabs/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: responseText.slice(0, 200), // Limit for demo
            voiceId: 'JBFqnCBsd6RMkjVDRZzb' 
          })
        });

        if (ttsResp.ok) {
          const ttsData = await ttsResp.json();
          if (ttsData?.audioBase64) {
            const audioUrl = `data:${ttsData.mimeType || 'audio/mpeg'};base64,${ttsData.audioBase64}`;
            setAudioSource(audioUrl);
            toast.success(`Audio ready (${ttsData.source || 'tts'})`);
          }
        }
      } catch (e) {
        console.warn('TTS failed:', e);
        toast.warning('TTS unavailable (using fallback)');
      }

    } catch (err) {
      // Fallback mock response
      const mockResponse: DemoResponse = {
        text: `Fashioni (demo mode): For "${prompt.slice(0, 40)}..." I recommend Size M with a relaxed fit. This style pairs beautifully with white sneakers and minimalist accessories.`,
        source: 'mock',
        timestamp: new Date().toISOString()
      };
      setResponse(mockResponse);
      toast.info('Using demo mode (mock response)');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (audioSource) {
      const audio = new Audio(audioSource);
      audio.play().catch(() => toast.error('Audio playback blocked'));
    } else if (response) {
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(response.text.slice(0, 200));
      speechSynthesis.speak(utterance);
      toast.info('Playing (browser fallback)');
    }
  };

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_VULTR_API_KEY;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Fashioni Demo</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI styling & sizing assistant — Judge-ready demo
              </p>
            </div>
            <Badge variant={isDemoMode ? 'secondary' : 'default'} className="text-sm">
              {isDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Chat & Demo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Judges Checklist */}
            <JudgesChecklist />

            {/* Main Demo Card */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Run Sample Demo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a style question..."
                  className="min-h-[80px] text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      runSampleDemo();
                    }
                  }}
                />
                <Button 
                  onClick={runSampleDemo} 
                  disabled={loading} 
                  size="lg"
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Running demo...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Run Sample Demo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Press Cmd/Ctrl + Enter to run
                </p>
              </CardContent>
            </Card>

            {/* Response Display */}
            {response && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Assistant Response</CardTitle>
                    <SourceBadge source={response.source} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm leading-relaxed">{response.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={playAudio} 
                      variant="outline"
                      className="gap-2"
                      disabled={!response}
                    >
                      <Volume2 className="h-4 w-4" />
                      Speak
                    </Button>
                    {audioSource && (
                      <Badge variant="outline" className="text-xs">
                        Audio cached
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(response.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Integration Status */}
            <IntegrationStatusCards />
          </div>

          {/* Right Column - SmartMemory & Status */}
          <div className="space-y-6">
            <MemoryPanel />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => setPrompt('Recommend a size for a midi dress for someone 5\'4" 130lbs')}
                >
                  Load Sample Query
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setResponse(null);
                    setAudioSource(null);
                    toast.info('Demo reset');
                  }}
                >
                  Clear Response
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
