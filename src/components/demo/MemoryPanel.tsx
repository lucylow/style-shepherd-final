import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Search, Trash2, Copy } from 'lucide-react';
import { searchMemory, deleteMemory } from '@/lib/raindropClient';
import { toast } from 'sonner';

interface MemoryEntry {
  id: string;
  text: string;
  createdAt: string;
}

export function MemoryPanel() {
  const [query, setQuery] = useState('dress');
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMemories = async (q?: string) => {
    setLoading(true);
    try {
      const result = await searchMemory('demo_user', q || query, 10);
      setMemories(result.results || []);
    } catch (e) {
      console.warn('Search failed:', e);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories('');
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory('demo_user', id);
      toast.success('Memory deleted');
      loadMemories(query);
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          SmartMemory (Raindrop)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="text-sm"
          />
          <Button size="sm" onClick={() => loadMemories(query)} disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="max-h-[200px] overflow-y-auto space-y-2">
          {memories.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No memories found</div>
          )}
          {memories.map((m) => (
            <div key={m.id} className="p-2 rounded bg-muted/30 text-xs">
              <div className="line-clamp-2">{m.text}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-muted-foreground">
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopy(m.text)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(m.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
