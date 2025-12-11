// pages/admin/fraud.tsx
import React, { useEffect, useState } from 'react';

interface FraudIncident {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userIp?: string | null;
  userAgent?: string | null;
  action: string;
  amount?: number | null;
  currency?: string | null;
  score: number;
  modelScore?: number | null;
  ruleScores?: any;
  rulesFired?: string[] | null;
  decision: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFraudPage() {
  const [incidents, setIncidents] = useState<FraudIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await fetch('/api/admin/fraud/incidents');
        const j = await res.json();
        setIncidents(j || []);
      } catch (e) {
        console.error('fetch incidents error', e);
      } finally {
        setLoading(false);
      }
    }
    fetchIncidents();
  }, []);

  async function doAction(id: string, action: string) {
    try {
      await fetch('/api/admin/fraud/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      // refresh
      setIncidents(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('action error', e);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Fraud Incidents (Admin)</h1>
      {loading && <div>Loading...</div>}
      {!loading && incidents.length === 0 && <div>No incidents found.</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th>ID</th><th>When</th><th>User</th><th>Action</th><th>Score</th><th>Decision</th><th>Rules</th><th>Notes</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map(i => (
              <tr key={i.id} style={{ borderTop: '1px solid #f6f6f6' }}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.id}</td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>{i.userEmail || i.userId || '—'}</td>
                <td>{i.action}</td>
                <td>{(i.score || 0).toFixed(2)}</td>
                <td>{i.decision}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{(i.rulesFired || []).join(', ')}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.notes || ''}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => doAction(i.id, 'mark_safe')}>Mark Safe</button>
                    <button onClick={() => doAction(i.id, 'block_user')}>Block User</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
