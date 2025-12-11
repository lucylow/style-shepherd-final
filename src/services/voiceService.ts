/**
 * Voice Service - Browser Speech Recognition + Lovable AI
 * Uses Web Speech API for voice-to-text with Lovable AI for processing
 * Falls back gracefully when services are unavailable
 */

import { supabase } from '@/integrations/supabase/client';
import { VoiceResponse } from '@/types/fashion';
import { speakText } from '@/lib/ttsClient';
import { productService } from './productService';
import { handleError, handleErrorSilently } from '@/lib/errorHandler';

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
        const errorMessage = this.getSpeechRecognitionErrorMessage(event.error);
        console.error('Speech recognition error:', event.error);
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        console.log('Speech recognition ended');
      };

      try {
        this.recognition.start();
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to start speech recognition';
        console.error('Error starting recognition:', error);
        reject(new Error(errorMessage));
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
        const errorMessage = error.message || 'Failed to process voice input';
        handleErrorSilently(error);
        throw new Error(errorMessage);
      }

      // Check if response indicates success
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        // Response has success: false, check for error message
        const errorMessage = (data as any).error || 'Failed to process voice';
        console.error('Edge function returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      const response = data as VoiceProcessResponse;
      
      // Search for products if search terms are provided
      let products = [];
      if (response.searchTerms && response.searchTerms.length > 0) {
        try {
          const query = response.searchTerms.join(' ');
          products = await productService.searchProducts({ query });
          console.log(`Found ${products.length} products for search: ${query}`);
        } catch (searchError) {
          handleErrorSilently(searchError);
          console.warn('Product search failed:', searchError);
          // Continue without products - the error is non-critical
        }
      }
      
      // Try to speak the response using TTS
      if (response.text) {
        try {
          await speakText(response.text);
        } catch (ttsError) {
          handleErrorSilently(ttsError);
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
        products,
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
        // Edge function now handles fallback internally, but handle network/connection errors
        if (error.message && !error.message.includes('network') && !error.message.includes('fetch')) {
          throw new Error(error.message || 'Failed to process query');
        }
        // For network errors, use client-side fallback
        console.warn('Using client-side fallback due to edge function error');
        const searchTerms = this.extractSearchTermsFromText(text);
        const response: VoiceProcessResponse = {
          text: searchTerms.length > 0 
            ? `Great! I'll help you find ${searchTerms.join(', ')}. Here are some options for you.`
            : "I'd be happy to help you find what you're looking for!",
          userQuery: text,
          searchTerms,
          intent: this.detectIntentFromText(text),
        };
        
        // Search for products
        let products = [];
        if (searchTerms.length > 0) {
          try {
            const query = searchTerms.join(' ');
            products = await productService.searchProducts({ query });
          } catch (searchError) {
            handleErrorSilently(searchError);
            console.warn('Product search failed:', searchError);
          }
        }
        
        return {
          text: response.text,
          confidence: 0.8,
          products,
        };
      }

      // Check if response indicates success
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        // Response has success: false, check for error message
        const errorMessage = (data as any).error || 'Failed to process query';
        console.error('Edge function returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      const response = data as VoiceProcessResponse;
      
      // Search for products if search terms are provided
      let products = [];
      if (response.searchTerms && response.searchTerms.length > 0) {
        try {
          const query = response.searchTerms.join(' ');
          products = await productService.searchProducts({ query });
          console.log(`Found ${products.length} products for search: ${query}`);
        } catch (searchError) {
          handleErrorSilently(searchError);
          console.warn('Product search failed:', searchError);
          // Continue without products - the error is non-critical
        }
      }
      
      // Try to speak the response
      if (response.text) {
        try {
          await speakText(response.text);
        } catch (ttsError) {
          handleErrorSilently(ttsError);
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
        products,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to process query';
      handleError(error, {
        defaultMessage: 'Unable to process your request. Please try again.',
      });
      throw new Error(errorMessage);
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
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      throw new Error('Failed to convert base64 to audio blob');
    }
  }

  /**
   * Get user-friendly error message for speech recognition errors
   */
  private getSpeechRecognitionErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please try speaking again.',
      'audio-capture': 'Microphone not available. Please check your microphone settings.',
      'not-allowed': 'Microphone access denied. Please allow microphone access and try again.',
      'network': 'Network error. Please check your connection and try again.',
      'aborted': 'Speech recognition was interrupted. Please try again.',
      'service-not-allowed': 'Speech recognition service is not available.',
    };

    return errorMessages[error] || `Speech recognition error: ${error}. Please try again.`;
  }

  /**
   * Clean up audio URLs to prevent memory leaks
   */
  revokeAudioUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Extract search terms from text (client-side fallback)
   */
  private extractSearchTermsFromText(text: string): string[] {
    const terms: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Colors
    const colors = ["blue", "red", "black", "white", "green", "yellow", "pink", "purple", "orange", "brown", "gray", "grey", "navy", "beige"];
    colors.forEach(color => {
      if (lowerText.includes(color)) terms.push(color);
    });
    
    // Clothing items
    const items = ["dress", "dresses", "shirt", "shirts", "pants", "jeans", "jacket", "jackets", "coat", "coats", "skirt", "skirts", "blouse", "top", "tops", "sweater", "hoodie", "suit", "blazer"];
    items.forEach(item => {
      if (lowerText.includes(item)) terms.push(item);
    });
    
    // Styles
    const styles = ["casual", "formal", "business", "elegant", "sporty", "vintage", "modern", "classic", "trendy"];
    styles.forEach(style => {
      if (lowerText.includes(style)) terms.push(style);
    });
    
    return terms;
  }

  /**
   * Detect intent from text (client-side fallback)
   */
  private detectIntentFromText(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("show") || lowerText.includes("find") || lowerText.includes("search") || lowerText.includes("looking for")) {
      return "product_search";
    }
    if (lowerText.includes("recommend") || lowerText.includes("suggest") || lowerText.includes("what do you")) {
      return "recommendation";
    }
    if (lowerText.includes("size") || lowerText.includes("fit")) {
      return "sizing";
    }
    if (lowerText.includes("style") || lowerText.includes("wear") || lowerText.includes("match")) {
      return "styling";
    }
    
    return "general";
  }
}

export const voiceService = new VoiceService();
