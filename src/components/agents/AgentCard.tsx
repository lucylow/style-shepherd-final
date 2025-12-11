/**
 * AgentResponseCard Component
 * Displays a single agent response with metadata, confidence, and structured data
 */

import React from 'react';
import type { AgentResponse } from '@/types/agent-orchestration';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function AgentResponseCard({ res }: { res: AgentResponse }) {
  const agentDisplayName = res.agent
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <strong className="text-base font-semibold">{agentDisplayName}</strong>
            {res.confidence !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {(res.confidence * 100).toFixed(0)}% confidence
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(res.createdAt).toLocaleTimeString()}
          </span>
        </div>
        {res.source && (
          <Badge variant="outline" className="mt-2 w-fit text-xs">
            Source: {res.source}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{res.content}</div>

        {res.structured && Object.keys(res.structured).length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Structured Data:</p>
              <pre className="p-3 text-xs bg-muted rounded-md overflow-x-auto">
                {JSON.stringify(res.structured, null, 2)}
              </pre>
            </div>
          </>
        )}

        {res.explains && res.explains.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Reasoning:</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                {res.explains.map((explanation, i) => (
                  <li key={i}>{explanation}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

