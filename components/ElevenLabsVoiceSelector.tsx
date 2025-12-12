// components/ElevenLabsVoiceSelector.tsx
import React, { useEffect, useState, useRef } from 'react';

type Voice = {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
  metadata?: any;
};

const API = '/api/functions/v1/elevenlabs-voices';

export default function ElevenLabsVoiceSelector({ enableConvaiWidget = true }: { enableConvaiWidget?: boolean }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [q, setQ] = useState('');
  const [filterUseCase, setFilterUseCase] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
    fetchVoices();
    // load convai widget if asked
    if (enableConvaiWidget && typeof window !== 'undefined') {
      // only add script once
      if (!document.querySelector('script[data-elevenlabs-convai]')) {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed@beta';
        s.async = true;
        s.setAttribute('data-elevenlabs-convai', 'true');
        document.body.appendChild(s);
      }
    }
  }, []);

  async function fetchVoices() {
    try {
      const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
      const r = await fetch(url);
      const json = await r.json();
      setVoices(json.voices ?? []);
    } catch (e) {
      console.error('failed to fetch voices', e);
    }
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem('el_favs_v1');
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }

  function saveFavorites(next: Record<string, boolean>) {
    localStorage.setItem('el_favs_v1', JSON.stringify(next));
    setFavorites(next);
  }

  function toggleFavorite(id: string) {
    const next = { ...favorites, [id]: !favorites[id] };
    saveFavorites(next);
  }

  function applyFilter(voice: Voice) {
    if (!filterUseCase) return true;
    const useCases = (voice.metadata?.use_case ?? voice.metadata?.useCase ?? []) || [];
    return useCases.includes(filterUseCase) || String(voice.name).toLowerCase().includes(filterUseCase);
  }

  async function preview(voice: Voice) {
    if (!voice.preview_url) return;
    // stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    audioRef.current = new Audio(voice.preview_url);
    audioRef.current.crossOrigin = 'anonymous';
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(voice.voice_id);
    try {
      await audioRef.current.play();
    } catch (e) {
      console.warn('audio play failed', e);
      setPlayingId(null);
    }
  }

  async function chooseVoice(voice: Voice) {
    setSelected(voice.voice_id);
    // local app hook - you can replace with a global state / API call
    // Example: post to /api/users/me/preferences to persist
    // fetch('/api/user/set-voice', { method:'POST', body: JSON.stringify({voice_id: voice.voice_id}) })
    alert(`Selected voice: ${voice.name} (${voice.voice_id}) — will be used for TTS`);
  }

  // For embedding convai widget: we append element with agent-id attribute (if available)
  // Replace agent id with your agent id
  const convaiAgentId = 'agent_0401kc9ykr8ffjx98mxxqdkxdn78';

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left controls */}
      <div style={{ width: 260 }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Search / Filters</div>
        <input
          placeholder="Search voices..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && fetchVoices()}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
          aria-label="Search voices"
        />
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Use case</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['stylist', 'concierge', 'ads', 'narration'].map((u) => (
              <button
                key={u}
                onClick={() => setFilterUseCase(filterUseCase === u ? null : u)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: filterUseCase === u ? '2px solid #000' : '1px solid #ccc',
                  background: 'transparent',
                }}
                aria-pressed={filterUseCase === u}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            onClick={() => {
              setQ('');
              setFilterUseCase(null);
              fetchVoices();
            }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #000' }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>Favorites</div>
          <div style={{ marginTop: 8 }}>
            {Object.keys(favorites).filter((id) => favorites[id]).length === 0 && <div style={{ color: '#777' }}>No favorites yet</div>}
            {Object.keys(favorites)
              .filter((id) => favorites[id])
              .map((id) => (
                <div key={id} style={{ fontSize: 13, marginTop: 6 }}>{id}</div>
              ))}
          </div>
        </div>
      </div>

      {/* Voice cards grid */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {voices.filter(applyFilter).map((v) => (
            <div key={v.voice_id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#444' }}>{v.language ?? '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button aria-label="favorite" onClick={() => toggleFavorite(v.voice_id)} style={{ border: 'none', background: 'transparent' }}>
                    {favorites[v.voice_id] ? '♥' : '♡'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={() => preview(v)}
                    style={{ borderRadius: 8, padding: '6px 10px', border: '1px solid #000' }}
                    aria-label={`Preview ${v.name}`}
                  >
                    {playingId === v.voice_id ? '⏸' : '▶'}
                  </button>
                  <div style={{ fontSize: 12, color: '#666' }}>{v.metadata?.quality ?? ''}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button onClick={() => chooseVoice(v)} style={{ flex: 1, borderRadius: 8, padding: '8px', border: '1px solid #000' }}>
                  Select
                </button>
                <button onClick={() => alert(JSON.stringify(v, null, 2))} style={{ padding: '8px', borderRadius: 8 }}>
                  Info
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <small style={{ color: '#666' }}>Source: server proxy → ElevenLabs (mock fallback when key missing).</small>
        </div>
      </div>

      {/* Convai widget embed + integration info */}
      <div style={{ width: 320 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Convai Widget</div>

        {/* convai widget container */}
        <div>
          {/* Insert the convai widget tag. The script is loaded in useEffect above */}
          <div dangerouslySetInnerHTML={{ __html: `<elevenlabs-convai agent-id="${convaiAgentId}"></elevenlabs-convai>` }} />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>Widget: bottom-right chat & voice experience. Agent ID above is demo — replace with yours.</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              To use, ensure your site has the convai script loaded (we auto-insert it). The widget requires the agent to be published on ElevenLabs.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
