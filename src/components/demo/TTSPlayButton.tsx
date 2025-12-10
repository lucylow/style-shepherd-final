import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  text: string;
}

export function TTSPlayButton({ text }: Props) {
  const [playing, setPlaying] = useState(false);

  const playTTS = async () => {
    if (!text) {
      toast.info('No text to speak');
      return;
    }
    
    setPlaying(true);
    try {
      const resp = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: 'JBFqnCBsd6RMkjVDRZzb' })
      });
      
      if (!resp.ok) throw new Error('TTS failed');
      
      const data = await resp.json();
      const audioSrc = data?.dataUrl || data?.url;
      
      if (audioSrc) {
        const audio = new Audio(audioSrc);
        audio.onended = () => setPlaying(false);
        audio.play().catch(() => {
          toast.error('Audio playback blocked');
          setPlaying(false);
        });
        toast.success(`Playing (${data?.source || 'tts'})`);
      } else {
        throw new Error('No audio URL');
      }
    } catch (e) {
      // Fallback - use browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 200));
        utterance.onend = () => setPlaying(false);
        speechSynthesis.speak(utterance);
        toast.info('Playing (browser fallback)');
      } else {
        toast.error('TTS unavailable');
        setPlaying(false);
      }
    }
  };

  return (
    <Button 
      onClick={playTTS} 
      disabled={playing || !text}
      variant="outline"
      className="gap-2"
    >
      {playing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
      {playing ? 'Playing...' : 'Speak'}
    </Button>
  );
}
