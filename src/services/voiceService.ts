/**
 * Voice Service - Browser Speech Recognition + Lovable AI
 * Uses Web Speech API for voice-to-text with Lovable AI for processing
 * Falls back gracefully when services are unavailable
 */

import { supabase } from '@/integrations/supabase/client';
import { VoiceResponse } from '@/types/fashion';
import { speakText } from '@/lib/ttsClient';

export interface ConversationState {
  conversationId: string;
  userId: string;
  context: Record<string, any>;
  lastMessage?: string;
  lastResponse?: string;
}

export interface VoiceProcessResponse {
  text: string;
  audio?: string;
  intent?: string;
  searchTerms?: string[];
  userQuery?: string;
}

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

class VoiceService {
  private conversationStates: Map<string, ConversationState> = new Map();
  private recognition: any = null;

  constructor() {
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSpeechRecognitionSupported(): boolean {
    return !!SpeechRecognition;
  }

  /**
   * Start a new voice conversation
   */
  async startConversation(userId: string): Promise<ConversationState> {
    const state: ConversationState = {
      conversationId: `conv_${userId}_${Date.now()}`,
      userId,
      context: {},
    };
    this.conversationStates.set(userId, state);
    return state;
  }

  /**
   * Transcribe audio using browser's Web Speech API
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    // Web Speech API doesn't accept audio blobs directly
    // We need to use the live recognition instead
    // This method is kept for compatibility but returns empty
    console.warn('Direct audio transcription not supported. Use startLiveRecognition instead.');
    return '';
  }

  /**
   * Start live speech recognition
   */
  startLiveRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.'));
        return;
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop live speech recognition
   */
  stopLiveRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
    }
  }

  /**
   * Process voice input (audio blob) and get response
   * Now uses browser speech recognition + Lovable AI
   */
  async processVoiceInput(
    userId: string,
    audioBlob: Blob,
    context?: { messages?: any[] }
  ): Promise<VoiceResponse> {
    // Get or create conversation state
    let state = this.conversationStates.get(userId);
    if (!state) {
      state = await this.startConversation(userId);
    }

    // For audio blob processing, we'll use the edge function
    // But first try browser speech recognition if available
    try {
      const audioBase64 = await this.blobToBase64(audioBlob);
      
      // Call our voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to process voice');
      }

      const response = data as VoiceProcessResponse;
      
      // Try to speak the response using TTS
      if (response.text) {
        try {
          await speakText(response.text);
        } catch (ttsError) {
          console.warn('TTS failed:', ttsError);
        }
      }

      // Update conversation state
      if (state) {
        state.lastMessage = response.userQuery;
        state.lastResponse = response.text;
        state.context = {
          ...state.context,
          lastQuery: response.userQuery,
          lastIntent: response.intent,
          searchTerms: response.searchTerms,
          timestamp: Date.now(),
        };
      }

      return {
        text: response.text,
        confidence: 0.9,
        products: [], // Products would be fetched based on searchTerms
      };
    } catch (error: any) {
      console.error('Failed to process voice input:', error);
      throw new Error(error.message || 'Failed to process voice command');
    }
  }

  /**
   * Process text query directly (used with browser speech recognition)
   */
  async processTextQuery(
    userId: string,
    text: string
  ): Promise<VoiceResponse> {
    let state = this.conversationStates.get(userId);
    if (!state) {
      state = await this.startConversation(userId);
    }

    try {
      // Call our voice-to-text edge function with text
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { text }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to process query');
      }

      const response = data as VoiceProcessResponse;
      
      // Try to speak the response
      if (response.text) {
        try {
          await speakText(response.text);
        } catch (ttsError) {
          console.warn('TTS failed:', ttsError);
        }
      }

      // Update conversation state
      if (state) {
        state.lastMessage = text;
        state.lastResponse = response.text;
        state.context = {
          ...state.context,
          lastQuery: text,
          lastIntent: response.intent,
          searchTerms: response.searchTerms,
          timestamp: Date.now(),
        };
      }

      return {
        text: response.text,
        confidence: 0.95,
        products: [],
      };
    } catch (error: any) {
      console.error('Failed to process text query:', error);
      throw new Error(error.message || 'Failed to process query');
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, limit: number = 50): Promise<any[]> {
    return [];
  }

  /**
   * End conversation
   */
  async endConversation(userId: string): Promise<void> {
    this.conversationStates.delete(userId);
  }

  /**
   * Get current conversation state
   */
  getConversationState(userId: string): ConversationState | undefined {
    return this.conversationStates.get(userId);
  }

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Clean up audio URLs to prevent memory leaks
   */
  revokeAudioUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export const voiceService = new VoiceService();
