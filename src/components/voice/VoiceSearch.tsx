/**
 * VoiceSearch Component
 * 
 * Handles mic UI, transcripts, calls /api/products/voice-search, shows results count,
 * and requests TTS for top result.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api-config';

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || (window as any).webkitSpeechRecognition || null);

interface VoiceSearchProps {
  onResults: (results: any[]) => void;
  autoSpeak?: boolean;
}

export default function VoiceSearch({ onResults, autoSpeak = true }: VoiceSearchProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      setInfo('Browser does not support SpeechRecognition. Use text search instead.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (ev: any) => {
      let final = '';
      let inter = '';

      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const r = ev.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          inter += r[0].transcript;
        }
      }

      if (final) {
        setTranscript(final.trim());
        setInterim('');
        // auto-submit final transcript
        doSearch(final.trim());
      } else {
        setInterim(inter);
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onerror = (e: any) => {
      console.warn('SpeechRecognition error', e);
      setInfo('Microphone error: ' + (e.error || e.message || 'unknown'));
      setListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startStop() {
    if (!SpeechRecognition) {
      setInfo('SpeechRecognition not available in this browser.');
      return;
    }

    try {
      if (listening) {
        recognitionRef.current?.stop();
        setListening(false);
      } else {
        setTranscript('');
        setInterim('');
        setInfo('');
        recognitionRef.current?.start();
        setListening(true);
      }
    } catch (e) {
      console.warn(e);
      setInfo('Microphone permission denied or unavailable.');
    }
  }

  async function doSearch(text: string) {
    if (!text || loading) return;

    setLoading(true);
    setInfo('Searching…');

    try {
      const res = await fetch(`${getApiBaseUrl()}/products/voice-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });

      const j = await res.json();

      if (!res.ok) {
        setInfo('Search failed: ' + (j.error || j.message || res.status));
        onResults && onResults([]);
      } else {
        setInfo(`Found ${(j.results || []).length} products (source: ${j.source || 'mock'})`);
        onResults && onResults(j.results || []);

        // optionally auto-speak top result
        if (autoSpeak && (j.results || []).length > 0) {
          const top = j.results[0];
          const speakText = `Found ${j.results.length} results. Top result: ${top.name || top.title}. Price ${top.price ? ('$' + top.price) : ''}. ${top.description || ''}`;

          // call server TTS route
          fetch(`${getApiBaseUrl()}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: speakText }),
          })
            .then((r) => r.blob())
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.play().catch((e) => {
                console.warn('TTS play blocked', e);
                URL.revokeObjectURL(url);
              });
              audio.onended = () => URL.revokeObjectURL(url);
            })
            .catch((e) => console.warn('TTS error', e));
        }
      }
    } catch (e) {
      console.error(e);
      setInfo('Search error: ' + String(e));
      onResults && onResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3 items-center">
      <Button
        onClick={startStop}
        variant={listening ? 'destructive' : 'default'}
        size="sm"
        disabled={!SpeechRecognition}
        className="flex items-center gap-2"
      >
        {listening ? (
          <>
            <MicOff className="w-4 h-4" />
            Listening… (click to stop)
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Voice Search
          </>
        )}
      </Button>

      <div className="min-w-[280px]">
        <div className="text-sm text-foreground">
          {transcript || interim || 'Say something like "Show red midi dresses under $100"'}
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? 'Searching...' : info || ''}
        </div>
      </div>
    </div>
  );
}
