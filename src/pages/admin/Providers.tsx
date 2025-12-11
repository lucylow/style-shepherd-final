/**
 * Admin Provider Management UI
 * Register, manage, and monitor AI providers (LLM, embeddings, TTS, vector DBs)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

type ProviderKind = 'llm' | 'embeddings' | 'tts' | 'vectordb';

type ProviderMeta = {
  id: string;
  kind: ProviderKind;
  name?: string;
  priority?: number;
  region?: string;
  enabled?: boolean;
};

type ProviderMetrics = {
  [key: string]: {
    enabled?: boolean;
    priority?: number;
    lastChecked?: string;
    successCount?: number;
    errorCount?: number;
    avgLatency?: number;
  };
};

export default function AdminProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [metrics, setMetrics] = useState<ProviderMetrics>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'openai-llm',
    apiKey: '',
    model: '',
    voiceId: '',
    tableName: 'product_embeddings',
    priority: '10',
    configJson: '{}',
  });

  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || '';

  async function fetchProviders() {
    setLoading(true);
    try {
      const response = await api.get('/admin/providers', {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });
      const allProviders = response.data.providers || {};
      const flatProviders: ProviderMeta[] = [
        ...(allProviders.llm || []),
        ...(allProviders.embeddings || []),
        ...(allProviders.tts || []),
        ...(allProviders.vectordb || []),
      ];
      setProviders(flatProviders);
    } catch (e: any) {
      console.error(e);
      alert('Failed to fetch providers: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetrics() {
    try {
      const response = await api.get('/admin/metrics', {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });
      setMetrics(response.data.metrics || {});
    } catch (e: any) {
      console.warn('metrics fetch failed', e);
    }
  }

  useEffect(() => {
    fetchProviders();
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    try {
      const config: any = {};
      if (form.type === 'openai-llm' || form.type === 'openai-emb') {
        if (!form.apiKey) {
          return alert('API key required');
        }
        config.apiKey = form.apiKey;
        if (form.type === 'openai-emb' && form.model) {
          config.model = form.model;
        }
      } else if (form.type === 'elevenlabs') {
        if (!form.apiKey) {
          return alert('API key required');
        }
        config.apiKey = form.apiKey;
        if (form.voiceId) {
          config.voiceId = form.voiceId;
        }
      } else if (form.type === 'postgres-vectordb') {
        config.tableName = form.tableName;
      }

      const body = {
        type: form.type,
        config,
        priority: Number(form.priority || 10),
      };

      const response = await api.post('/admin/providers', body, {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });

      if (!response.data.success) {
        return alert('Register failed: ' + (response.data.error || JSON.stringify(response.data)));
      }

      setForm({
        type: 'openai-llm',
        apiKey: '',
        model: '',
        voiceId: '',
        tableName: 'product_embeddings',
        priority: '10',
        configJson: '{}',
      });
      fetchProviders();
      fetchMetrics();
    } catch (err: any) {
      alert('Register error: ' + (err.response?.data?.error || err.message));
    }
  }

  async function handleUnregister(kind: ProviderKind, id: string) {
    if (!confirm(`Unregister provider ${id}?`)) return;

    try {
      const response = await api.delete('/admin/providers', {
        data: { kind, id },
        headers: { 'x-admin-token': ADMIN_TOKEN },
      });

      if (!response.data.success) {
        return alert('Failed: ' + (response.data.error || JSON.stringify(response.data)));
      }

      fetchProviders();
      fetchMetrics();
    } catch (e: any) {
      alert('Unregister error: ' + (e.response?.data?.error || e.message));
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin — Provider Registry & Metrics</h1>
          <p className="text-muted-foreground mt-2">
            Manage AI providers (LLM, embeddings, TTS, vector DBs) without vendor lock-in
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Registered Providers</CardTitle>
            <CardDescription>View and manage registered providers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          <em>No providers registered</em>
                        </TableCell>
                      </TableRow>
                    ) : (
                      providers.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.kind}</Badge>
                          </TableCell>
                          <TableCell>{p.name || '-'}</TableCell>
                          <TableCell>{p.priority ?? 50}</TableCell>
                          <TableCell>
                            <Badge variant={p.enabled !== false ? 'default' : 'secondary'}>
                              {p.enabled !== false ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnregister(p.kind, p.id)}
                            >
                              Unregister
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Register Provider</CardTitle>
            <CardDescription>Add a new provider adapter</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="type">Provider Type</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai-llm">OpenAI LLM</SelectItem>
                    <SelectItem value="openai-emb">OpenAI Embeddings</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs TTS</SelectItem>
                    <SelectItem value="postgres-vectordb">PostgreSQL Vector DB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.type === 'openai-llm' || form.type === 'openai-emb' || form.type === 'elevenlabs') && (
                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    required
                    placeholder="Enter API key"
                  />
                </div>
              )}

              {form.type === 'openai-emb' && (
                <div>
                  <Label htmlFor="model">Model (optional)</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="text-embedding-3-small"
                  />
                </div>
              )}

              {form.type === 'elevenlabs' && (
                <div>
                  <Label htmlFor="voiceId">Voice ID (optional)</Label>
                  <Input
                    id="voiceId"
                    value={form.voiceId}
                    onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
                    placeholder="21m00Tcm4TlvDq8ikWAM"
                  />
                </div>
              )}

              {form.type === 'postgres-vectordb' && (
                <div>
                  <Label htmlFor="tableName">Table Name</Label>
                  <Input
                    id="tableName"
                    value={form.tableName}
                    onChange={(e) => setForm({ ...form, tableName: e.target.value })}
                    placeholder="product_embeddings"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="priority">Priority (lower = preferred)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  min="1"
                  max="100"
                />
              </div>

              <Button type="submit" className="w-full">
                Register Provider
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Provider Metrics (live)</h3>
              {Object.keys(metrics).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  <em>No metrics yet</em>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(metrics).map(([id, m]) => (
                    <div key={id} className="border rounded p-3 text-sm">
                      <div className="font-semibold">{id}</div>
                      <div className="text-muted-foreground mt-1">
                        Priority: {m.priority ?? '-'} | Status:{' '}
                        {m.enabled !== false ? 'Enabled' : 'Disabled'}
                        {m.avgLatency !== undefined && ` | Latency: ${m.avgLatency.toFixed(1)}ms`}
                        {m.successCount !== undefined && ` | Successes: ${m.successCount}`}
                        {m.errorCount !== undefined && ` | Errors: ${m.errorCount}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={fetchProviders}>
              Refresh Providers
            </Button>
            <Button variant="outline" onClick={fetchMetrics}>
              Refresh Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> This page uses a simple ADMIN_TOKEN header (x-admin-token) for
          authentication. Replace with proper SSO role-check in production.
        </p>
      </div>
    </div>
  );
}
