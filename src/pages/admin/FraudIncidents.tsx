/**
 * Admin Fraud Incidents Page
 * View and manage fraud incidents
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface FraudIncident {
  id: string;
  user_id?: string;
  user_email?: string;
  user_ip?: string;
  action: string;
  amount?: number;
  currency: string;
  score: number;
  model_score?: number;
  rule_scores: Record<string, any>;
  rules_fired: string[];
  decision: 'allow' | 'challenge' | 'deny' | 'manual_review';
  notes?: string;
  created_at: string;
}

export default function FraudIncidents() {
  const [incidents, setIncidents] = useState<FraudIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadIncidents();
    loadStats();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      // In production, add admin authentication header
      const adminKey = localStorage.getItem('admin_key'); // You should implement proper auth
      const response = await fetch('/api/admin/fraud/incidents', {
        headers: adminKey ? { 'x-admin-key': adminKey } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to load incidents');
      }

      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load fraud incidents');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const adminKey = localStorage.getItem('admin_key');
      const response = await fetch('/api/admin/fraud/stats?days=30', {
        headers: adminKey ? { 'x-admin-key': adminKey } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      // Ignore stats errors
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const adminKey = localStorage.getItem('admin_key');
      const response = await fetch('/api/admin/fraud/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey && { 'x-admin-key': adminKey }),
        },
        body: JSON.stringify({ id, action }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      // Reload incidents
      loadIncidents();
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Failed to perform action');
    }
  };

  const getDecisionBadge = (decision: string) => {
    const colors: Record<string, string> = {
      allow: 'bg-green-100 text-green-800',
      challenge: 'bg-yellow-100 text-yellow-800',
      deny: 'bg-red-100 text-red-800',
      manual_review: 'bg-orange-100 text-orange-800',
    };
    return (
      <Badge className={colors[decision] || 'bg-gray-100 text-gray-800'}>
        {decision}
      </Badge>
    );
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fraud Incidents</h1>
        <Button onClick={loadIncidents} variant="outline">
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatScore(stats.averageScore)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highRiskCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.highRiskPercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byDecision?.deny || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>
            Review and manage fraud detection incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No incidents found
                  </TableCell>
                </TableRow>
              ) : (
                incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-mono text-xs">
                      {incident.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {new Date(incident.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {incident.user_email || incident.user_id || 'N/A'}
                    </TableCell>
                    <TableCell>{incident.action}</TableCell>
                    <TableCell>
                      {incident.amount
                        ? `$${((incident.amount || 0) / 100).toFixed(2)}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          incident.score > 0.7
                            ? 'text-red-600 font-semibold'
                            : incident.score > 0.45
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }
                      >
                        {formatScore(incident.score)}
                      </span>
                    </TableCell>
                    <TableCell>{getDecisionBadge(incident.decision)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {incident.rules_fired?.slice(0, 3).map((rule) => (
                          <Badge key={rule} variant="outline" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                        {incident.rules_fired?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{incident.rules_fired.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {incident.decision !== 'allow' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(incident.id, 'mark_safe')}
                          >
                            Mark Safe
                          </Button>
                        )}
                        {incident.user_id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(incident.id, 'block_user')}
                          >
                            Block User
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

