/**
 * AgentsOrchestratorUI Component
 * 
 * Main UI for interacting with the multi-agent orchestrator system.
 * Allows users to:
 * - Send freeform queries to the orchestrator
 * - Call individual agents directly
 * - View realtime agent responses
 */

import React, { useState } from 'react';
import { useAgentOrchestration } from '@/hooks/useAgentOrchestration';
import { AgentResponseCard } from './AgentCard';
import type { UserQuery } from '@/types/agent-orchestration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentsOrchestratorUI({ initialSession }: { initialSession?: string }) {
  const { sessionId, messages, orchestrate, callAgent, loading, clearMessages } =
    useAgentOrchestration(initialSession);
  const [text, setText] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [occasion, setOccasion] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const sendOrchestrator = async () => {
    if (!text.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const q: UserQuery = {
      sessionId: sessionId ?? undefined,
      text,
      userId: 'demo_user',
      selfieUrl: selfieUrl || undefined,
      occasion: occasion || undefined,
      meta: { budget: budget ? Number(budget) : undefined },
    };

    const result = await orchestrate(q);
    if (result.ok) {
      toast.success('Query sent to orchestrator');
      setText('');
    } else {
      toast.error(result.message || 'Failed to send query');
    }
  };

  const runAgent = async (agentName: string) => {
    if (!text.trim() && !selfieUrl.trim()) {
      toast.error('Please enter a question or selfie URL');
      return;
    }

    const q: UserQuery = {
      sessionId: sessionId ?? undefined,
      userId: 'demo_user',
      text: text || undefined,
      selfieUrl: selfieUrl || undefined,
      measurements: {},
      occasion: occasion || undefined,
      meta: { budget: budget ? Number(budget) : undefined },
    };

    const result = await callAgent(agentName, q);
    if (result.ok) {
      toast.success(`${agentName} responded`);
    } else {
      toast.error(result.message || `Failed to call ${agentName}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Style Shepherd — Multi-Agent Playground</h2>
        <p className="text-muted-foreground">
          Interact with specialized AI agents for fashion, makeup, sizing, and returns prediction.
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground mt-2">Session: {sessionId}</p>
        )}
      </div>

      <Tabs defaultValue="orchestrator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
          <TabsTrigger value="direct">Direct Agent Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="orchestrator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ask the Orchestrator</CardTitle>
              <CardDescription>
                The orchestrator will intelligently route your query to the appropriate agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query-text">Your Question</Label>
                <Input
                  id="query-text"
                  placeholder="e.g., 'What should I wear to a rooftop wedding?' or 'Help me find a blue dress'"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendOrchestrator();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (USD)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="e.g., 200"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occasion">Occasion</Label>
                  <Input
                    id="occasion"
                    placeholder="e.g., wedding, party, work"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selfie">Selfie URL (optional)</Label>
                  <Input
                    id="selfie"
                    placeholder="https://..."
                    value={selfieUrl}
                    onChange={(e) => setSelfieUrl(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={sendOrchestrator} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Ask Orchestrator
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Agents Directly</CardTitle>
              <CardDescription>
                Test individual agents without going through the orchestrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="direct-query">Query (optional for some agents)</Label>
                <Input
                  id="direct-query"
                  placeholder="Enter query or leave empty for agents that use selfie/measurements"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="direct-occasion">Occasion</Label>
                  <Input
                    id="direct-occasion"
                    placeholder="e.g., wedding, party"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direct-selfie">Selfie URL</Label>
                  <Input
                    id="direct-selfie"
                    placeholder="https://..."
                    value={selfieUrl}
                    onChange={(e) => setSelfieUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => runAgent('personal-shopper')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Personal Shopper
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runAgent('makeup-artist')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Makeup Artist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runAgent('size-predictor')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Size Predictor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => runAgent('returns-predictor')}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Returns Predictor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Agent Responses</h3>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearMessages}>
              Clear
            </Button>
          )}
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No agent responses yet. Trigger an agent or ask the orchestrator to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <AgentResponseCard key={m.id} res={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

