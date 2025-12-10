import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Brain, Search, Trash2, Plus, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  getAllMemories, 
  searchMemory, 
  deleteMemory, 
  storeMemory,
  clearAllMemories,
  type MemoryEntry 
} from '@/lib/raindropClient';
import { toast } from 'sonner';

export default function AIMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadMemories = async (query?: string) => {
    setIsLoading(true);
    try {
      if (query) {
        const result = await searchMemory('demo_user', query, 50);
        setMemories(result.results);
      } else {
        const result = await getAllMemories('demo_user');
        setMemories(result.results);
      }
    } catch (e) {
      console.error('Failed to load memories:', e);
      toast.error('Failed to load memories');
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
    toast.success('Memory deleted');
    loadMemories(searchQuery);
  };

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) {
      toast.error('Please enter memory text');
      return;
    }
    await storeMemory(
      'demo_user',
      'working',
      newMemoryText,
      { source: 'manual', page: '/ai-memory' }
    );
    setNewMemoryText('');
    toast.success('Memory added');
    loadMemories(searchQuery);
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL memories? This cannot be undone.')) return;
    clearAllMemories();
    toast.success('All memories cleared');
    loadMemories();
  };

  const handleExport = () => {
    const data = JSON.stringify(memories, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'style-shepherd-memories.json';
    a.click();
    toast.success('Memories exported');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex h-screen pt-16">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-lg">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">AI Memory</h1>
                  <p className="text-muted-foreground">Powered by Raindrop SmartMemory</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="destructive" onClick={handleClearAll}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            {/* Add Memory */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Add New Memory</h3>
              <Textarea
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="Enter style preference, measurement, or any information to remember..."
                className="mb-3"
                rows={3}
              />
              <Button onClick={handleAddMemory}>
                <Plus className="w-4 h-4 mr-2" />
                Add Memory
              </Button>
            </div>

            {/* Search */}
            <div className="flex gap-2 mb-6">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={() => { setSearchQuery(''); loadMemories(); }}>
                Show All
              </Button>
            </div>

            {/* Memory List */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-12">Loading...</div>
              ) : memories.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-lg">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No memories found</p>
                  <p className="text-sm mt-2">Add memories to build your style profile</p>
                </div>
              ) : (
                memories.map((memory) => (
                  <div 
                    key={memory.id}
                    className="p-4 bg-card border border-border rounded-lg group hover:border-primary/50 transition-colors"
                  >
                    <p className="text-foreground">{memory.text}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {memory.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(memory.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => handleDelete(memory.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 p-4 bg-accent/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total Memories: <span className="font-semibold text-foreground">{memories.length}</span>
                {' | '}
                Storage: <span className="font-semibold text-foreground">Mock (localStorage)</span>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
