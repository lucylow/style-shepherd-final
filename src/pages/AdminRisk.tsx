/**
 * Admin Risk & Compliance Page
 * View and approve/reject risk incidents
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface RiskIncident {
  id: string;
  action: string;
  userId?: string;
  score: number;
  decision: string;
  reasons?: Array<{
    key: string;
    weight: number;
    contribution: number;
    note: string;
  }>;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
  evidence?: {
    id: string;
    hash: string;
  };
}

interface EvidenceFile {
  file: string;
  path: string;
}

export default function AdminRiskPage() {
  const [incidents, setIncidents] = useState<RiskIncident[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adminToken = import.meta.env.VITE_ADMIN_TOKEN || '';

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/audit/list', {
        headers: { 'x-admin-token': adminToken },
      });
      const j = await r.json();
      if (j.incidents) {
        setIncidents(j.incidents);
      } else if (j.evidenceFiles) {
        setEvidenceFiles(j.evidenceFiles);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to fetch incidents: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  async function handleApproval(incidentId: string) {
    const decision = prompt('Approve (allow) or deny? Type "allow" or "deny"', 'allow');
    if (!decision || !['allow', 'deny'].includes(decision.toLowerCase())) {
      return;
    }

    try {
      const r = await fetch('/api/risk/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          incidentId,
          decision: decision.toLowerCase(),
          adminId: 'admin_demo',
        }),
      });
      const j = await r.json();
      if (j.success) {
        alert('Approval processed successfully');
        fetchIncidents();
      } else {
        alert('Error: ' + (j.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Failed to process approval: ' + (e.message || 'Unknown error'));
    }
  }

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <Badge className="bg-green-500">Allow</Badge>;
      case 'require_approval':
        return <Badge className="bg-yellow-500">Requires Approval</Badge>;
      case 'deny':
        return <Badge className="bg-red-500">Deny</Badge>;
      default:
        return <Badge>{decision}</Badge>;
    }
  };

  const getRiskLevel = (score: number) => {
    if (score < 0.3) return { level: 'Low', color: 'text-green-600' };
    if (score < 0.6) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'High', color: 'text-red-600' };
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Risk & Compliance — Incidents</h1>
        <p className="text-muted-foreground">
          Review and manage risk assessments and compliance incidents
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <Button onClick={fetchIncidents} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && incidents.length === 0 && evidenceFiles.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && incidents.length === 0 && evidenceFiles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No incidents found</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {incidents.map((incident) => {
          const riskLevel = getRiskLevel(incident.score);
          return (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {incident.action || 'Unknown Action'}
                    </CardTitle>
                    <CardDescription>
                      Incident ID: {incident.id}
                      {incident.userId && ` • User: ${incident.userId}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDecisionBadge(incident.decision)}
                    <span className={`font-semibold ${riskLevel.color}`}>
                      {riskLevel.level} Risk ({Math.round(incident.score * 100)}%)
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Risk Score Breakdown</h4>
                    <div className="space-y-1">
                      {incident.reasons && Array.isArray(incident.reasons) ? (
                        incident.reasons.map((reason, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                          >
                            <span className="font-medium">{reason.key}</span>
                            <span className="text-muted-foreground">
                              {Math.round(reason.contribution * 100)}% • {reason.note}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No breakdown available</p>
                      )}
                    </div>
                  </div>

                  {incident.evidence && (
                    <div className="text-sm">
                      <span className="font-medium">Evidence Hash: </span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {incident.evidence.hash.substring(0, 16)}...
                      </code>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Created: {new Date(incident.createdAt).toLocaleString()}
                    </span>
                    {incident.handledBy && (
                      <span>
                        Handled by {incident.handledBy} at{' '}
                        {incident.handledAt
                          ? new Date(incident.handledAt).toLocaleString()
                          : 'N/A'}
                      </span>
                    )}
                  </div>

                  {incident.decision === 'require_approval' && !incident.handledBy && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApproval(incident.id)}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve/Handle
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {evidenceFiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Evidence Files (File System)</h3>
            {evidenceFiles.map((file) => (
              <Card key={file.file}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">{file.file}</code>
                    <Button
                      onClick={() => handleApproval(file.file)}
                      variant="outline"
                      size="sm"
                    >
                      View/Handle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
