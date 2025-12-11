import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Trash2,
  MessageSquare,
  Lightbulb,
  Shirt,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useFashionChat } from '@/hooks/useFashionChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
  { text: "What should I wear for a job interview?", icon: Shirt },
  { text: "Help me style this outfit", icon: Sparkles },
  { text: "What colors match my skin tone?", icon: Lightbulb },
  { text: "Find me a casual summer outfit", icon: Camera },
];

export default function AIChat() {
  const { messages, isLoading, sendMessage, clearMessages } = useFashionChat();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      await sendMessage(message);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <HeaderNav />
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  AI Style Assistant
                  <Sparkles className="w-5 h-5 text-primary" />
                </h1>
                <p className="text-muted-foreground">Get personalized fashion advice</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearMessages}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Quick Prompts */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2"
            >
              <span className="text-sm text-muted-foreground mr-2">Try asking:</span>
              {QUICK_PROMPTS.map((prompt, index) => {
                const Icon = prompt.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt.text)}
                    className="gap-2"
                  >
                    <Icon className="w-3 h-3" />
                    {prompt.text}
                  </Button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col min-h-0 mb-4">
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center py-12"
                  >
                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full mb-4">
                      <Bot className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground max-w-md">
                      Ask me anything about fashion, styling, or get personalized recommendations
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 justify-start"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about fashion..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
