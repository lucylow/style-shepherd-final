// COMPLETE ELEVENLABS VOICES UI - Interactive Voice Selector with Audio Previews
// Fashion Categorization, Search, Filters, Favorites for Style Shepherd

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Volume2, Heart, Filter, Search, Mic } from 'lucide-react';
import { getVoices } from '@/lib/elevenlabsClient';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  image_url?: string;
  language?: string;
  accent?: string;
  gender?: string;
  optimized_for_fashion?: boolean;
  category_display?: string;
  stability?: number;
  similarity_boost?: number;
  use_cases?: string[];
  popularity?: number;
}

interface VoicesResponse {
  success: boolean;
  source: "eleven" | "mock";
  voices: ElevenLabsVoice[];
  total_count: number;
  execution_time_ms: number;
  optimized_voices?: ElevenLabsVoice[];
  error?: string;
}

// =============================================================================
// MAIN INTERACTIVE VOICE SELECTOR COMPONENT
// =============================================================================

const ElevenLabsVoiceSelector: React.FC = () => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<ElevenLabsVoice[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'professional' | 'friendly' | 'trendy'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Fetch voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoading(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-voices?recommend=true`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        });

        const data: VoicesResponse = await response.json();
        
        if (data.success) {
          setVoices(data.voices);
          setFilteredVoices(data.voices);
        } else {
          setError(data.error || "Failed to fetch voices");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Filter & search voices
  useEffect(() => {
    let filtered = voices;

    // Category filter
    if (activeTab !== 'all') {
      if (activeTab === 'professional') {
        filtered = filtered.filter(voice => voice.category === "professional");
      } else if (activeTab === 'friendly') {
        filtered = filtered.filter(voice => 
          voice.use_cases?.some(uc => uc.includes("friendly") || uc.includes("personal-shopping"))
        );
      } else if (activeTab === 'trendy') {
        filtered = filtered.filter(voice => 
          voice.use_cases?.some(uc => uc.includes("trends") || uc.includes("youthful"))
        );
      }
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.accent?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by popularity + favorites
    filtered.sort((a, b) => {
      const aFav = favorites.has(a.voice_id) ? 1 : 0;
      const bFav = favorites.has(b.voice_id) ? 1 : 0;
      return (bFav - aFav) || (b.popularity || 0) - (a.popularity || 0);
    });

    setFilteredVoices(filtered);
  }, [activeTab, searchTerm, favorites, voices]);

  // Audio playback handler
  const togglePlayback = useCallback((voiceId: string) => {
    const audio = audioRefs.current[voiceId];
    if (!audio) return;

    if (playingVoice === voiceId) {
      audio.pause();
      setPlayingVoice(null);
    } else {
      // Pause all other audio
      Object.values(audioRefs.current).forEach(a => a?.pause());
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.warn("Audio playback error:", err);
        setPlayingVoice(null);
      });
      setPlayingVoice(voiceId);
    }
  }, [playingVoice]);

  // Handle audio ended
  useEffect(() => {
    const handleEnded = () => setPlayingVoice(null);
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
      }
    });
  }, [filteredVoices]);

  // Favorite toggle
  const toggleFavorite = (voiceId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(voiceId)) {
        newSet.delete(voiceId);
      } else {
        newSet.add(voiceId);
      }
      return newSet;
    });
  };

  // Select voice for Style Shepherd
  const selectVoiceForFashion = (voice: ElevenLabsVoice) => {
    setSelectedVoice(voice);
    // In production: POST to /api/style-voice-preference
    console.log('🎤 Selected for Style Shepherd:', voice.name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 bg-gradient-to-br from-indigo-50 via-white to-pink-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-3xl shadow-2xl mb-8">
          <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
          <h1 className="text-4xl lg:text-5xl font-black">
            Voice Gallery
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Choose the perfect voice for your Style Shepherd assistant. Professional, friendly, or trendy – 
          find your fashion voice match.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center text-sm">
          <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full font-medium">
            {voices.length} Total Voices
          </span>
          <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium">
            {voices.filter(v => v.optimized_for_fashion).length} Fashion Optimized
          </span>
          <span className="px-4 py-2 bg-pink-100 text-pink-800 rounded-full font-medium">
            {favorites.size} Favorites
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-6 mb-12">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search voices by name, accent, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 shadow-sm"
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl p-1 shadow-lg">
          {(['all', 'professional', 'friendly', 'trendy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex-1 text-sm ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-white/70'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && (
                <span className="ml-2 bg-white/30 text-white text-xs px-2 py-1 rounded-full">
                  {voices.filter(v => {
                    if (tab === 'professional') return v.category === "professional";
                    if (tab === 'friendly') return v.use_cases?.some(uc => uc.includes("friendly"));
                    if (tab === 'trendy') return v.use_cases?.some(uc => uc.includes("trends"));
                    return false;
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {filteredVoices.map((voice) => {
          const isPlaying = playingVoice === voice.voice_id;
          const isFavorite = favorites.has(voice.voice_id);
          
          return (
            <div
              key={voice.voice_id}
              className={`group relative bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 border-4 border-white/50 hover:border-indigo-200 overflow-hidden hover:bg-white ${
                selectedVoice?.voice_id === voice.voice_id ? 'ring-4 ring-indigo-300 ring-opacity-50' : ''
              }`}
            >
              {/* Voice Image */}
              <div className="relative mb-6 overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-indigo-100 via-white to-pink-100 shadow-xl group-hover:shadow-2xl transition-all duration-500">
                {voice.image_url ? (
                  <img
                    src={voice.image_url}
                    alt={voice.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mic className="w-16 h-16 text-indigo-400" />
                  </div>
                )}
                
                {/* Fashion Optimized Badge */}
                {voice.optimized_for_fashion && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 rounded-2xl text-xs font-bold shadow-lg animate-pulse">
                    👗 Fashion AI
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute bottom-4 left-4 bg-black/20 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-xs font-semibold border border-white/30">
                  {voice.category_display || voice.category.toUpperCase()}
                </div>
              </div>

              {/* Voice Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-black text-2xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                    {voice.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{voice.description}</p>
                </div>

                {/* Audio Controls */}
                <div className="relative">
                  <audio
                    ref={el => { audioRefs.current[voice.voice_id] = el; }}
                    src={voice.preview_url}
                    preload="metadata"
                    className="w-full"
                  />
                  <button
                    onClick={() => togglePlayback(voice.voice_id)}
                    className={`w-full p-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg ${
                      isPlaying
                        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-pink-500/50 hover:from-red-600 hover:to-pink-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/50 hover:from-indigo-600 hover:to-purple-700'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-6 w-6" />
                        <span>Playing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-6 w-6 ml-1" />
                        <span>Preview Voice</span>
                      </>
                    )}
                  </button>

                  {/* Volume & Settings */}
                  {isPlaying && voice.stability !== undefined && (
                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-3 text-xs">
                      <Volume2 className="h-4 w-4 text-gray-500" />
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${voice.stability * 100}%` }}
                          />
                        </div>
                        <span>Stability</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {voice.accent && <span>{voice.accent}</span>}
                    {voice.gender && <span>{voice.gender}</span>}
                    {voice.popularity && voice.popularity > 0.9 && (
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                        <span>🔥</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(voice.voice_id)}
                      className={`p-2 rounded-xl transition-all duration-300 ${
                        isFavorite
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-110'
                          : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => selectVoiceForFashion(voice)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>

              {/* Hover Spotlight */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl backdrop-blur-sm flex items-end p-6">
                <div className="text-white text-lg font-bold">
                  🎤 Perfect for Style Shepherd
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Voice Preview */}
      {selectedVoice && (
        <div className="mt-20 p-12 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-4xl border-4 border-emerald-200 shadow-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl mx-auto mb-8 shadow-2xl flex items-center justify-center">
              <div className="text-3xl">🎙️</div>
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {selectedVoice.name} Selected!
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Perfect choice for your fashion assistant. {selectedVoice.description}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:from-emerald-700 hover:to-teal-800 transition-all duration-300">
                ✅ Confirm & Save
              </button>
              <button 
                onClick={() => setSelectedVoice(null)}
                className="px-8 py-4 bg-white border-2 border-gray-200 rounded-3xl font-bold text-lg hover:shadow-xl transition-all duration-300"
              >
                🔄 Choose Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-20 pt-12 border-t-4 border-indigo-100">
        <div className="grid md:grid-cols-3 gap-8 text-center text-sm text-gray-600">
          <div>
            <div className="text-3xl font-black text-indigo-600 mb-2">{voices.length}</div>
            <div>Total Voices Available</div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 mb-2">
              {voices.filter(v => v.optimized_for_fashion).length}
            </div>
            <div>Fashion-Optimized Voices</div>
          </div>
          <div>
            <div className="text-3xl font-black text-pink-600 mb-2">{favorites.size}</div>
            <div>Your Favorites</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElevenLabsVoiceSelector;

