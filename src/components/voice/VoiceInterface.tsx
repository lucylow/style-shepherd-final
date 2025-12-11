import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Bot, Volume2, VolumeX, X, Loader2, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { VoiceResponse } from '@/types/fashion';
import { voiceService } from '@/services/integrations';
import { cn } from '@/lib/utils';

interface VoiceInterfaceProps {
  onVoiceCommand?: (response: VoiceResponse) => void;
  onListeningChange?: (isListening: boolean) => void;
  userId: string;
  className?: string;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const VoiceInterface = ({ onVoiceCommand, onListeningChange, userId, className }: VoiceInterfaceProps) => {
  const [isListening, setIsListening] = useState(false);
  
  // Notify parent when listening state changes
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(!!SpeechRecognition);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
    }
  }, []);

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        await voiceService.startConversation(userId);
        setIsConnected(true);
      } catch (error: any) {
        console.error('Failed to initialize conversation:', error);
        // Still allow usage with browser speech
        setIsConnected(false);
        
        // Only show error if it's not a network issue (user might be offline)
        if (error?.message && !error.message.includes('network') && !error.message.includes('fetch')) {
          toast({
            title: "Connection Warning",
            description: "Using local speech recognition. Some features may be limited.",
            variant: "default"
          });
        }
      }
    };

    if (userId && userId !== 'guest') {
      initConversation();
    } else {
      // Guest users use browser speech only
      setIsConnected(false);
    }
  }, [userId, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      messages.forEach(msg => {
        if (msg.audioUrl) {
          voiceService.revokeAudioUrl(msg.audioUrl);
        }
      });
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors when stopping recognition
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio level visualization
  const startAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 255) * 100));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
    } catch (error) {
      console.warn('Audio visualization not available:', error);
    }
  }, [isListening]);

  const startListening = async () => {
    try {
      // Request microphone access for visualization
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      startAudioVisualization(stream);
      
      setIsListening(true);
      setIsExpanded(true);

      // Use browser's Web Speech API if available
      if (useBrowserSpeech && recognitionRef.current) {
        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Speech recognized:', transcript);
          setIsListening(false);
          setIsProcessing(true);
          
          // Stop stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          
          // Process the recognized text
          await processTextQuery(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          
          let errorTitle = "Speech Recognition Error";
          let errorDescription = "Please try again.";
          
          switch (event.error) {
            case 'not-allowed':
              errorTitle = "Microphone Access Denied";
              errorDescription = "Please allow microphone access in your browser settings to use voice commands.";
              break;
            case 'no-speech':
              errorTitle = "No Speech Detected";
              errorDescription = "No speech was detected. Please speak clearly and try again.";
              break;
            case 'audio-capture':
              errorTitle = "Audio Capture Error";
              errorDescription = "No microphone was found. Please connect a microphone and try again.";
              break;
            case 'network':
              errorTitle = "Network Error";
              errorDescription = "Network error occurred. Please check your connection and try again.";
              break;
            case 'aborted':
              errorTitle = "Recognition Aborted";
              errorDescription = "Speech recognition was interrupted. Please try again.";
              break;
            case 'service-not-allowed':
              errorTitle = "Service Not Allowed";
              errorDescription = "Speech recognition service is not available. Please try using text input.";
              break;
            default:
              errorDescription = `Error: ${event.error}. Please try again.`;
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive"
          });
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            setIsListening(false);
          }
        };

        recognitionRef.current.start();
        
        toast({
          title: "Listening...",
          description: "Speak your fashion request",
        });
      } else {
        // Fallback to MediaRecorder for audio capture
        const options: MediaRecorderOptions = { 
          mimeType: 'audio/webm;codecs=opus' 
        };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          delete options.mimeType;
        }
        
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: mediaRecorder.mimeType || 'audio/webm' 
            });
            await processAudio(audioBlob);
          }
          setAudioLevel(0);
        };

        mediaRecorder.start(100);
        
        toast({
          title: "Listening...",
          description: "Speak your fashion request",
        });
      }
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setIsListening(false);
      
      let errorTitle = "Microphone Error";
      let errorDescription = "Unable to access microphone.";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = "Microphone Permission Denied";
        errorDescription = "Please allow microphone access in your browser settings to use voice commands.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorTitle = "No Microphone Found";
        errorDescription = "No microphone device detected. Please connect a microphone and try again.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorTitle = "Microphone In Use";
        errorDescription = "Microphone is being used by another application. Please close other apps and try again.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Microphone Settings Error";
        errorDescription = "Your microphone doesn't support the required settings. Trying with basic settings...";
        // Try again with minimal constraints
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = basicStream;
          startAudioVisualization(basicStream);
          setIsListening(true);
          // Continue with basic setup...
          return;
        } catch (retryError) {
          errorDescription = "Unable to access microphone with any settings.";
        }
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (useBrowserSpeech && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping recognition
      }
    }
    
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsListening(false);
    setIsProcessing(true);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  };

  const processTextQuery = async (text: string) => {
    try {
      setIsTyping(true);
      
      const userMessage: Message = {
        type: 'user',
        content: text,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      const response = await voiceService.processTextQuery(userId, text);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsTyping(false);

      const assistantMessage: Message = {
        type: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        audioUrl: response.audioUrl,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Play audio response if available (server TTS generated audioUrl)
      // If audioUrl is not present, TTS was already handled by voiceService using browser TTS
      if (response.audioUrl) {
        playAudioResponse(response.audioUrl);
      } else {
        // If no audioUrl, browser TTS was already used, so we don't need to play anything
        console.log('✅ TTS already handled via browser Web Speech API');
      }
      
      onVoiceCommand?.(response);
    } catch (error: any) {
      console.error('Error processing text:', error);
      setIsTyping(false);
      
      let errorTitle = "Processing Error";
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorTitle = "Network Error";
        errorMessage = "I'm having trouble connecting. Please check your internet connection and try again.";
      } else if (error?.message?.includes('timeout')) {
        errorTitle = "Request Timeout";
        errorMessage = "The request took too long. Please try again with a simpler query.";
      } else if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
        errorTitle = "Rate Limit Exceeded";
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: errorMessage,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsTyping(true);
      
      const response = await voiceService.processVoiceInput(
        userId,
        audioBlob,
        { messages }
      );

      const userMessage: Message = {
        type: 'user',
        content: 'Voice input',
        timestamp: Date.now(),
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setIsTyping(false);

      const assistantMessage: Message = {
        type: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        audioUrl: response.audioUrl,
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // Play audio response if available (server TTS generated audioUrl)
      // If audioUrl is not present, TTS was already handled by voiceService using browser TTS
      if (response.audioUrl) {
        playAudioResponse(response.audioUrl);
      } else {
        // If no audioUrl, browser TTS was already used, so we don't need to play anything
        console.log('✅ TTS already handled via browser Web Speech API');
      }
      
      onVoiceCommand?.(response);
    } catch (error: any) {
      console.error('Error processing voice:', error);
      setIsTyping(false);
      
      let errorTitle = "Voice Processing Error";
      let errorMessage = "Sorry, I couldn't process your voice command. Please try again.";
      
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorTitle = "Network Error";
        errorMessage = "I'm having trouble connecting. Please check your internet connection and try again.";
      } else if (error?.message?.includes('timeout')) {
        errorTitle = "Request Timeout";
        errorMessage = "The audio processing took too long. Please try speaking again.";
      } else if (error?.message?.includes('audio') || error?.message?.includes('format')) {
        errorTitle = "Audio Format Error";
        errorMessage = "I couldn't understand the audio. Please try speaking more clearly.";
      } else if (error?.message?.includes('size') || error?.message?.includes('too large')) {
        errorTitle = "Audio Too Large";
        errorMessage = "The audio recording is too long. Please try a shorter command.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: errorMessage,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        voiceService.revokeAudioUrl(audioUrl);
        audioPlayerRef.current = null;
      };

      audio.onerror = (event) => {
        console.error('Audio playback error:', event);
        setIsPlaying(false);
        audioPlayerRef.current = null;
        toast({
          title: "Audio Playback Error",
          description: "Failed to play audio response. The text response is still available.",
          variant: "destructive"
        });
      };

      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
        audioPlayerRef.current = null;
        
        // Provide specific error messages
        let errorMessage = "Failed to play audio response.";
        if (error.name === 'NotAllowedError') {
          errorMessage = "Audio playback was blocked. Please allow autoplay in your browser settings.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Audio format not supported. The text response is still available.";
        }
        
        toast({
          title: "Audio Playback Error",
          description: errorMessage,
          variant: "destructive"
        });
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setIsPlaying(false);
    }
  };

  const clearMessages = () => {
    messages.forEach(msg => {
      if (msg.audioUrl) {
        voiceService.revokeAudioUrl(msg.audioUrl);
      }
    });
    setMessages([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("fixed bottom-6 right-6 z-50", className)}
    >
      <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border overflow-hidden max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {isConnected && (
                <motion.div 
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <span className="text-sm font-bold block text-foreground">Style Shepherd AI</span>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xs",
                  isConnected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                )}>
                  {isConnected ? '● Active' : '● Offline'}
                </span>
                {isProcessing && (
                  <span className="text-xs text-primary animate-pulse">Processing...</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearMessages}
                title="Clear conversation"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Voice Button with Audio Visualization */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-4">
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary/30"
                  animate={{
                    scale: [1, 1.2 + audioLevel / 100, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
              
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                size="lg"
                className={cn(
                  "w-20 h-20 rounded-full relative z-10 transition-all",
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50' 
                    : isProcessing
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
            </div>

            {/* Status Text */}
            <div className="text-center mb-2">
              <motion.p 
                key={isListening ? 'listening' : isProcessing ? 'processing' : isPlaying ? 'playing' : 'ready'}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-foreground"
              >
                {isListening ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening...
                  </span>
                ) : isProcessing ? (
                  <span className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing your request...
                  </span>
                ) : isPlaying ? (
                  <span className="flex items-center justify-center gap-2 text-primary">
                    <Volume2 className="w-3 h-3" />
                    Playing response...
                  </span>
                ) : (
                  'Tap to speak'
                )}
              </motion.p>
              {!isListening && !isProcessing && !isPlaying && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ask about fashion, sizing, or styling
                </p>
              )}
            </div>

            {/* Audio Controls */}
            {messages.length > 0 && messages[messages.length - 1]?.audioUrl && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? stopAudio : () => {
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage?.audioUrl) {
                      playAudioResponse(lastMessage.audioUrl);
                    }
                  }}
                  className="h-8"
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-1" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border pt-4 mt-2">
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No messages yet. Start by tapping the microphone.
                      </p>
                    ) : (
                      messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex gap-2",
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {message.type === 'assistant' && (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <div className={cn(
                            "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                            message.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-foreground'
                          )}>
                            {message.content}
                          </div>
                          {message.type === 'user' && (
                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-secondary-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2 justify-start"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3 h-3 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
