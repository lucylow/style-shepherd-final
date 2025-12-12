/**
 * MemoryCard Component
 * Displays an individual memory entry with actions
 */

import React from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MemoryEntry {
  id: string;
  userId?: string;
  type?: string;
  text: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  resp?: {
    id?: string;
    text?: string;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  };
}

interface MemoryCardProps {
  memory: MemoryEntry;
  onDelete: () => void;
  onCopy?: (text: string) => void;
  copied?: boolean;
}

const MEMORY_TYPE_COLORS: Record<string, string> = {
  working: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  semantic: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  episodic: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  procedural: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  working: 'Working',
  semantic: 'Semantic',
  episodic: 'Episodic',
  procedural: 'Procedural',
};

export default function MemoryCard({ memory, onDelete, onCopy, copied = false }: MemoryCardProps) {
  // Normalize memory structure (handle both mock and SDK formats)
  const entry = memory.text ? memory : (memory.resp || memory);
  const id = entry.id || memory.id || memory?.resp?.id || '';
  const text = entry.text || memory?.resp?.text || memory?.message || '';
  const createdAt = entry.createdAt || memory?.resp?.createdAt || '';
  const metadata = entry.metadata || memory?.resp?.metadata || {};
  const type = entry.type || memory.type || 'working';

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(text);
    } else {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        console.error('Failed to copy:', e);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {text}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {type && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-medium',
                    MEMORY_TYPE_COLORS[type] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                  )}
                >
                  {MEMORY_TYPE_LABELS[type] || type}
                </Badge>
              )}
              {createdAt && (
                <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
              )}
              {metadata && Object.keys(metadata).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Metadata: {JSON.stringify(metadata)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete memory"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

