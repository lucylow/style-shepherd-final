import React, { useState, useEffect } from 'react';
import { Brain, Search, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  getAllMemories, 
  searchMemory, 
  deleteMemory, 
  storeMemory,
  type MemoryEntry 
} from '@/lib/raindropClient';

export function MemoryPanel() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadMemories = async (query?: string) => {
    setIsLoading(true);
    try {
      if (query) {
        const result = await searchMemory('demo_user', query, 20);
        setMemories(result.results);
      } else {
        const result = await getAllMemories('demo_user');
        setMemories(result.results);
      }
    } catch (e) {
      console.error('Failed to load memories:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSearch = () => {
    loadMemories(searchQuery);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory?')) return;
    await deleteMemory('demo_user', id);
    loadMemories(searchQuery);
  };

  const handleAddSample = async () => {
    await storeMemory(
      'demo_user',
      'working',
      'User prefers minimalist style with neutral colors',
      { source: 'dashboard', type: 'preference' }
    );
    loadMemories(searchQuery);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          SmartMemory
        </h2>
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
          Raindrop
        </span>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search memories..."
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button size="icon" variant="outline" onClick={handleSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Add Sample Button */}
      <Button 
        variant="outline" 
        className="mb-4 w-full"
        onClick={handleAddSample}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Sample Memory
      </Button>

      {/* Memory List */}
      <div className="flex-1 overflow-auto space-y-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : memories.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No memories found. Start a conversation to build your style profile.
          </div>
        ) : (
          memories.map((memory) => (
            <div 
              key={memory.id}
              className="p-3 bg-accent/30 rounded-lg group"
            >
              <p className="text-sm text-foreground line-clamp-2">{memory.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => handleDelete(memory.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
