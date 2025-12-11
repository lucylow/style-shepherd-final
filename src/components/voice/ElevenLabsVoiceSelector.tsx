/**
 * ElevenLabs Voice Selector Component
 * 
 * Interactive voice selector with audio previews, fashion categorization,
 * and full integration with Style Shepherd
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Volume2, Heart, Filter, Search, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getVoices, type Voice } from '@/lib/elevenlabsClient';

interface ElevenLabsVoiceSelectorProps {
  selectedVoiceId?: string;
  onVoiceSelect?: (voice: Voice) => void;
  autoLoad?: boolean;
  showFashionOptimized?: boolean;
}

const ElevenLabsVoiceSelector: React.FC<ElevenLabsVoiceSelectorProps> = ({
  selectedVoiceId,
  onVoiceSelect,
  autoLoad = true,
  showFashionOptimized = true,
}) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'professional' | 'friendly' | 'trendy'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Load voices on mount
  useEffect(() => {
    if (autoLoad) {
      fetchVoices();
    }
  }, [autoLoad]);

  // Filter & search voices
  useEffect(() => {
    let filtered = voices;

    // Category filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(voice => {
        const nameLower = voice.name.toLowerCase();
        if (activeTab === 'professional') {
          return voice.category === 'professional' || 
                 nameLower.includes('adam') || 
                 nameLower.includes('antoni');
        }
        if (activeTab === 'friendly') {
          return nameLower.includes('bella') || 
                 nameLower.includes('dom') ||
                 voice.category === 'friendly';
        }
        if (activeTab === 'trendy') {
          return nameLower.includes('elli') || 
                 nameLower.includes('josh') ||
                 voice.category === 'trendy';
        }
        return false;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.accent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.language?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Show fashion optimized first if enabled
    if (showFashionOptimized && activeTab === 'all' && !searchTerm) {
      filtered.sort((a, b) => {
        const aFav = favorites.has(a.voice_id) ? 1 : 0;
        const bFav = favorites.has(b.voice_id) ? 1 : 0;
        const aOpt = a.optimized_for_fashion ? 1 : 0;
        const bOpt = b.optimized_for_fashion ? 1 : 0;
        return (bFav - aFav) || (bOpt - aOpt) || (b.popularity || 0) - (a.popularity || 0);
      });
    } else {
      // Sort by popularity + favorites
      filtered.sort((a, b) => {
        const aFav = favorites.has(a.voice_id) ? 1 : 0;
        const bFav = favorites.has(b.voice_id) ? 1 : 0;
        return (bFav - aFav) || (b.popularity || 0) - (a.popularity || 0);
      });
    }

    setFilteredVoices(filtered);
  }, [activeTab, searchTerm, voices, favorites, showFashionOptimized]);

  const fetchVoices = useCallback(async (category?: string, recommend?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getVoices({
        category,
        limit: 50,
        recommend: recommend || showFashionOptimized,
      });

      if (result.success && result.voices) {
        setVoices(result.voices);
        // Pre-select voice if provided
        if (selectedVoiceId) {
          const found = result.voices.find(v => v.voice_id === selectedVoiceId);
          if (found) setSelectedVoice(found);
        }
      } else {
        setError(result.error || 'Failed to fetch voices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  }, [selectedVoiceId, showFashionOptimized]);

  // Audio playback handler
  const togglePlayback = useCallback((voiceId: string, previewUrl: string) => {
    const audio = audioRefs.current[voiceId];
    if (!audio && previewUrl) {
      // Create audio element
      const newAudio = new Audio(previewUrl);
      newAudio.onended = () => setPlayingVoice(null);
      newAudio.onerror = () => {
        console.error('Error playing audio preview');
        setPlayingVoice(null);
      };
      audioRefs.current[voiceId] = newAudio;
      
      // Pause all other audio
      Object.values(audioRefs.current).forEach(a => {
        if (a && a !== newAudio) {
          a.pause();
          a.currentTime = 0;
        }
      });
      
      newAudio.play();
      setPlayingVoice(voiceId);
    } else if (audio) {
      if (playingVoice === voiceId) {
        audio.pause();
        setPlayingVoice(null);
      } else {
        // Pause all other audio
        Object.values(audioRefs.current).forEach(a => {
          if (a && a !== audio) {
            a?.pause();
            a.currentTime = 0;
          }
        });
        audio.currentTime = 0;
        audio.play();
        setPlayingVoice(voiceId);
      }
    }
  }, [playingVoice]);

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
  const selectVoiceForFashion = (voice: Voice) => {
    setSelectedVoice(voice);
    if (onVoiceSelect) {
      onVoiceSelect(voice);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio = null;
        }
      });
    };
  }, []);

  if (loading && voices.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voices...</p>
        </div>
      </div>
    );
  }

  if (error && voices.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchVoices()}>Retry</Button>
      </div>
    );
  }

  const fashionOptimizedCount = voices.filter(v => v.optimized_for_fashion).length;
  const professionalCount = voices.filter(v => v.category === 'professional').length;

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-12 bg-gradient-to-br from-indigo-50 via-white to-pink-50 rounded-2xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-3xl shadow-2xl mb-6">
          <Sparkles className="h-5 w-5" />
          <h1 className="text-3xl lg:text-4xl font-black">
            Voice Gallery
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
          Choose the perfect voice for your Style Shepherd assistant. Professional, friendly, or trendy – 
          find your fashion voice match.
        </p>
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full font-medium">
            {voices.length} Total Voices
          </span>
          {fashionOptimizedCount > 0 && (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium">
              {fashionOptimizedCount} Fashion Optimized
            </span>
          )}
          {favorites.size > 0 && (
            <span className="px-4 py-2 bg-pink-100 text-pink-800 rounded-full font-medium">
              {favorites.size} Favorites
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search voices by name, accent, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-200"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/50 backdrop-blur-sm border border-white/50 rounded-2xl p-1 shadow-lg">
          {(['all', 'professional', 'friendly', 'trendy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 lg:px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex-1 text-sm ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300'
                  : 'text-gray-700 hover:text-indigo-600 hover:bg-white/70'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredVoices.map((voice) => {
          const isPlaying = playingVoice === voice.voice_id;
          const isFavorite = favorites.has(voice.voice_id);
          const isSelected = selectedVoice?.voice_id === voice.voice_id;
          
          return (
            <div
              key={voice.voice_id}
              className={`group relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-2 ${
                isSelected 
                  ? 'border-indigo-500 ring-4 ring-indigo-200' 
                  : 'border-white/50 hover:border-indigo-200'
              }`}
            >
              {/* Voice Image/Icon */}
              <div className="relative mb-4 overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-indigo-100 via-white to-pink-100 shadow-lg group-hover:shadow-xl transition-all duration-500 flex items-center justify-center">
                {voice.image_url ? (
                  <img
                    src={voice.image_url}
                    alt={voice.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <Volume2 className="h-16 w-16 text-indigo-400" />
                )}
                
                {/* Fashion Optimized Badge */}
                {voice.optimized_for_fashion && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
                    👗 Fashion AI
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute bottom-3 left-3 bg-black/20 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-xs font-semibold border border-white/30">
                  {voice.category_display || voice.category.toUpperCase()}
                </div>
              </div>

              {/* Voice Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-black text-xl text-gray-900 mb-1">
                    {voice.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {voice.description || 'Professional voice'}
                  </p>
                </div>

                {/* Audio Controls */}
                {voice.preview_url && (
                  <Button
                    onClick={() => togglePlayback(voice.voice_id, voice.preview_url)}
                    className={`w-full font-bold transition-all duration-300 ${
                      isPlaying
                        ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Preview Voice
                      </>
                    )}
                  </Button>
                )}

                {/* Stats & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {voice.accent && <span>{voice.accent}</span>}
                    {voice.gender && <span>•</span>}
                    {voice.gender && <span>{voice.gender}</span>}
                    {voice.popularity && voice.popularity > 0.9 && (
                      <>
                        <span>•</span>
                        <span>🔥</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(voice.voice_id)}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        isFavorite
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    
                    <Button
                      onClick={() => selectVoiceForFashion(voice)}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={isSelected ? "bg-indigo-600" : ""}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVoices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No voices found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Selected Voice Preview */}
      {selectedVoice && (
        <div className="mt-12 p-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl border-4 border-emerald-200 shadow-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl mx-auto mb-6 shadow-2xl flex items-center justify-center">
              <Volume2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">
              {selectedVoice.name} Selected!
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Perfect choice for your fashion assistant. {selectedVoice.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElevenLabsVoiceSelector;

