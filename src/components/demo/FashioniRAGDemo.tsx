/**
 * Demo component showing Fashioni RAG endpoint usage with extracted fields display
 * This demonstrates the new /api/fashioni/respond endpoint with:
 * - RAG (Retrieval-Augmented Generation) via Raindrop SmartMemory
 * - Prompt templates with few-shot examples
 * - Structured field extraction (size, fabrics, colors)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, User } from 'lucide-react';
import { getFashioniResponse } from '@/services/ai';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fields?: {
    size: string | null;
    fabrics: string[];
    colors: string[];
  };
  source?: string;
}

export function FashioniRAGDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState('demo_user');

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getFashioniResponse(input.trim(), userId);
      
      if (response.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.assistantText,
          fields: response.fields,
          source: response.source,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error('Failed to get response from Fashioni');
      }
    } catch (error) {
      console.error('Fashioni RAG error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Fashioni RAG Demo
        </CardTitle>
        <CardDescription>
          Chat with Fashioni using RAG (Retrieval-Augmented Generation). Responses include extracted size, fabric, and color information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="space-y-4 h-96 overflow-y-auto border rounded-lg p-4 bg-muted/30">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation with Fashioni!</p>
              <p className="text-sm mt-2">Try: &quot;I&apos;m 5&apos;3&quot; and 135lbs, what size for a midi dress?&quot;</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-gradient-to-br from-primary to-primary/70 text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div
                className={`flex-1 rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary/10 text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {/* Extracted Fields Badges */}
                {msg.role === 'assistant' && msg.fields && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t">
                    {msg.fields.size && (
                      <Badge variant="secondary" className="text-xs">
                        Size: {msg.fields.size}
                      </Badge>
                    )}
                    {msg.fields.fabrics.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Fabric: {msg.fields.fabrics.join(', ')}
                      </Badge>
                    )}
                    {msg.fields.colors.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        Color: {msg.fields.colors.join(', ')}
                      </Badge>
                    )}
                    {msg.source && (
                      <Badge variant="outline" className="text-xs">
                        {msg.source}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-background border rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Fashioni about sizing, style, or fabric..."
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

