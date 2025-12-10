import React, { useState, useEffect } from 'react';
import HeaderNav from '@/components/layout/HeaderNav';
import { 
  Brain, 
  Search, 
  Trash2, 
  Plus, 
  Download, 
  Upload, 
  Edit2, 
  Copy, 
  Check,
  Filter,
  X,
  Calendar,
  Tag,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MemoryCard from '@/components/MemoryCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiBaseUrl } from '@/lib/api-config';
import InteractiveIntegrationPanel from '@/components/integrations/InteractiveIntegrationPanel';

type MemoryType = 'working' | 'semantic' | 'episodic' | 'procedural';

interface MemoryEntry {
  id: string;
  userId?: string;
  type?: MemoryType;
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

const MEMORY_TYPE_COLORS: Record<MemoryType, string> = {
  working: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  semantic: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  episodic: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  procedural: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  working: 'Working',
  semantic: 'Semantic',
  episodic: 'Episodic',
  procedural: 'Procedural',
};

export default function AIMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MemoryType | 'all'>('all');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>('working');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState<MemoryType>('working');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery || filterType !== 'all') {
        loadMemories(searchQuery, filterType);
      } else {
        loadMemories();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterType]);

  const loadMemories = async (query?: string, typeFilter?: MemoryType | 'all') => {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/raindrop/search-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo_user',
          q: query || '',
          topK: 200,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Search failed' }));
        throw new Error(error?.message || error?.error || 'Search failed');
      }

      const data = await res.json();
      // Normalize results (handle both mock and raindrop SDK formats)
      const items: MemoryEntry[] = data.results || data.resp?.results || data.resp || [];
      
      let filtered = items;
      if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter(m => (m.type || 'working') === typeFilter);
      }
      
      setMemories(filtered);
    } catch (e) {
      console.error('Failed to load memories:', e);
      toast.error('Failed to load memories');
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSearch = () => {
    loadMemories(searchQuery, filterType);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory('demo_user', id);
      toast.success('Memory deleted');
      loadMemories(searchQuery, filterType);
    } catch (e) {
      toast.error('Failed to delete memory');
    }
  };

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) {
      toast.error('Please enter memory text');
      return;
    }
    try {
      await storeMemory(
        'demo_user',
        newMemoryType,
        newMemoryText,
        { source: 'manual', page: '/ai-memory' }
      );
      setNewMemoryText('');
      toast.success('Memory added successfully');
      loadMemories(searchQuery, filterType);
    } catch (e) {
      toast.error('Failed to add memory');
    }
  };

  const handleEdit = (memory: MemoryEntry) => {
    setSelectedMemory(memory);
    setEditText(memory.text);
    setEditType(memory.type);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory || !editText.trim()) {
      toast.error('Please enter memory text');
      return;
    }
    try {
      await updateMemory('demo_user', selectedMemory.id, editText, editType);
      toast.success('Memory updated');
      setEditDialogOpen(false);
      setSelectedMemory(null);
      loadMemories(searchQuery, filterType);
    } catch (e) {
      toast.error('Failed to update memory');
    }
  };

  const handleClearAll = async () => {
    try {
      clearAllMemories();
      toast.success('All memories cleared');
      setMemories([]);
    } catch (e) {
      toast.error('Failed to clear memories');
    }
  };

  const handleExport = () => {
    try {
      const data = JSON.stringify(memories, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `style-shepherd-memories-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Memories exported successfully');
    } catch (e) {
      toast.error('Failed to export memories');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importedMemories = Array.isArray(data) ? data : data.memories || [];
      
      let imported = 0;
      for (const memory of importedMemories) {
        if (memory.text) {
          await storeMemory(
            'demo_user',
            memory.type || 'working',
            memory.text,
            { ...memory.metadata, imported: true, importedAt: new Date().toISOString() }
          );
          imported++;
        }
      }
      
      toast.success(`Imported ${imported} memories`);
      setImportDialogOpen(false);
      loadMemories(searchQuery, filterType);
    } catch (e) {
      toast.error('Failed to import memories. Please check the file format.');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      toast.error('Failed to copy');
    }
  };

  const formatDate = (dateString: string) => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const filteredMemories = memories.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (searchQuery && !m.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  AI Memory
                  <Sparkles className="w-5 h-5 text-primary" />
                </h1>
                <p className="text-muted-foreground">Powered by Raindrop SmartMemory</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => setImportDialogOpen(true)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setClearAllDialogOpen(true)}
                className="gap-2"
                disabled={memories.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Add Memory Card */}
          <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Memory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={newMemoryType} onValueChange={(v) => setNewMemoryType(v as MemoryType)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Enter style preference, measurement, or any information to remember..."
                  className="flex-1 min-h-[100px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddMemory();
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddMemory} className="w-full sm:w-auto" disabled={!newMemoryText.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Memory
              </Button>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories..."
                    className="pl-10 pr-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as MemoryType | 'all')}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Memory List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredMemories.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Brain className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No memories found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {searchQuery || filterType !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Add memories to build your style profile and help the AI understand your preferences'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMemories.map((memory) => (
                <Card 
                  key={memory.id}
                  className="group hover:shadow-md transition-all duration-200 hover:border-primary/50"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {memory.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs font-medium", MEMORY_TYPE_COLORS[memory.type])}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {MEMORY_TYPE_LABELS[memory.type]}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(memory.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleCopy(memory.text, memory.id)}
                          title="Copy to clipboard"
                        >
                          {copiedId === memory.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(memory)}
                          title="Edit memory"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedMemory(memory);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete memory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Stats */}
          {memories.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Memories</p>
                      <p className="text-2xl font-bold text-foreground">{memories.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Showing</p>
                      <p className="text-2xl font-bold text-foreground">{filteredMemories.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage</p>
                      <p className="text-sm font-medium text-foreground">Mock (localStorage)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactive Integration Panel */}
          <div className="mt-8">
            <InteractiveIntegrationPanel userId="demo_user" />
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
              {selectedMemory && (
                <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                  {selectedMemory.text.substring(0, 100)}
                  {selectedMemory.text.length > 100 && '...'}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMemory(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedMemory) {
                  handleDelete(selectedMemory.id);
                  setDeleteDialogOpen(false);
                  setSelectedMemory(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {memories.length} memories. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleClearAll();
                setClearAllDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
            <DialogDescription>
              Update the memory content and type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={editType} onValueChange={(v) => setEditType(v as MemoryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Enter memory text..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editText.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Memories</DialogTitle>
            <DialogDescription>
              Select a JSON file to import memories. The file should contain an array of memory objects or an object with a "memories" array.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="cursor-pointer"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
