// pages/voice-demo.tsx
import dynamic from 'next/dynamic';
import React from 'react';

// NOTE: dynamic import with ssr: false is crucial for client-side components like this
const ElevenLabsVoiceSelector = dynamic(() => import('../components/ElevenLabsVoiceSelector'), { ssr: false });

export default function VoiceDemoPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>ElevenLabs Voices — Demo</h1>
      <p>Server-side proxy + client selector + Convai widget demo.</p>
      <ElevenLabsVoiceSelector enableConvaiWidget={true} />
    </div>
  );
}
