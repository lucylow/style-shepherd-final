import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Volume2, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

interface Voice {
  voice_id: string;
  name: string;
  language?: string;
}

interface TTSControlsProps {
  text: string;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
}

const VOICES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export default function TTSControls({ text, onPlayingChange, className }: TTSControlsProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb"); // George default
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    fetch(VOICES_URL, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.voices) {
          setVoices(data.voices);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch voices:", err);
      });
  }, []);

  async function handleGenerate() {
    if (!text?.trim()) {
      toast.error("No text to speak");
      return;
    }

    setLoading(true);
    setCached(false);
    setSource("");

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text,
          voiceId,
          stability,
          similarity_boost: similarityBoost,
          model: "eleven_multilingual_v2",
        }),
      });

      const data = await response.json();

      if (data?.success && data?.audioBase64) {
        const url = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`;
        setAudioUrl(url);
        setCached(data.cached || false);
        setSource(data.source || "");

        if (onPlayingChange) onPlayingChange(true);
        const audio = new Audio(url);
        audio.onended = () => {
          if (onPlayingChange) onPlayingChange(false);
        };
        audio.play().catch((e) => {
          console.warn("Audio playback blocked:", e);
          if (onPlayingChange) onPlayingChange(false);
        });

        if (data.cached) {
          toast.success("Playing from cache");
        }
      } else if (data?.source === "mock") {
        toast.info("TTS running in mock mode (no API key configured)");
        setSource("mock");
      } else if (data?.source === "rate_limit") {
        toast.warning(data.error || "Rate limit reached");
      } else {
        toast.error("TTS failed: " + (data?.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("TTS error: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="voice-select" className="text-sm text-muted-foreground">
            Voice
          </Label>
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger id="voice-select" className="w-[160px]">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {voices.length === 0 ? (
                <SelectItem value="JBFqnCBsd6RMkjVDRZzb">George (Default)</SelectItem>
              ) : (
                voices.map((v) => (
                  <SelectItem key={v.voice_id} value={v.voice_id}>
                    {v.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-32">
          <Label className="text-sm text-muted-foreground">
            Stability: {stability.toFixed(2)}
          </Label>
          <Slider
            value={[stability]}
            onValueChange={([v]) => setStability(v)}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        <div className="space-y-2 w-32">
          <Label className="text-sm text-muted-foreground">
            Similarity: {similarityBoost.toFixed(2)}
          </Label>
          <Slider
            value={[similarityBoost]}
            onValueChange={([v]) => setSimilarityBoost(v)}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
          {loading ? "Generating..." : "Speak"}
        </Button>
      </div>

      {audioUrl && (
        <div className="space-y-2">
          <audio src={audioUrl} controls className="w-full max-w-md" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {cached && (
              <span className="flex items-center gap-1 text-green-600">
                <Database className="h-3 w-3" />
                Cached
              </span>
            )}
            {source && <span>Source: {source}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
