import React, { useEffect, useState } from 'react';

const POLL_MS = 10000;

interface BadgeProps {
  label: string;
  status: 'live' | 'warn' | 'mock';
  hint?: string;
}

function Badge({ label, status, hint }: BadgeProps) {
  const color = status === 'live' ? '#06b6d4' : (status === 'warn' ? '#f59e0b' : '#94a3b8');
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid rgba(255,255,255,0.04)`,
      boxShadow: '0 1px 6px rgba(2,6,23,0.08)',
      marginRight: 8
    }} title={hint || ''}>
      <span style={{
        width: 10, height: 10, borderRadius: 20, background: color, boxShadow: `0 0 6px ${color}33`
      }} />
      <strong style={{ fontSize: 13 }}>{label}</strong>
      <span style={{ fontSize: 12, color: '#9aa4b2' }}>· {status}</span>
    </div>
  );
}

interface IntegrationStatusProps {
  poll?: boolean;
}

interface StatusReport {
  report?: {
    vultr?: {
      ok?: boolean;
      present?: boolean;
      message?: string;
      reason?: string;
    };
    eleven?: {
      ok?: boolean;
      present?: boolean;
      message?: string;
      reason?: string;
    };
    raindrop?: {
      ok?: boolean;
      present?: boolean;
      message?: string;
      reason?: string;
    };
  };
  pingResults?: {
    vultr?: {
      reachable?: boolean;
      status?: number;
      error?: string;
    };
    eleven?: {
      reachable?: boolean;
      status?: number;
      error?: string;
    };
  };
  error?: string;
}

export default function IntegrationStatus({ poll = true }: IntegrationStatusProps) {
  const [report, setReport] = useState<StatusReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/status');
      const j = await res.json();
      setReport(j);
    } catch (e) {
      setReport({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    if (!poll) return;
    const t = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  const vultr = report?.report?.vultr || {};
  const eleven = report?.report?.eleven || {};
  const raindrop = report?.report?.raindrop || {};

  return (
    <div style={{ padding: 12, borderRadius: 10, background: 'linear-gradient(180deg,#071127 0%, #061428 100%)', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Integrations</h3>
        {loading && <div style={{ fontSize: 13, color: '#9aa4b2' }}>Refreshing…</div>}
      </div>

      <div style={{ marginTop: 12 }}>
        <Badge label="Vultr" status={vultr.ok ? 'live' : (vultr.present ? 'warn' : 'mock')} hint={vultr.message || vultr.reason || ''} />
        <Badge label="ElevenLabs" status={eleven.ok ? 'live' : (eleven.present ? 'warn' : 'mock')} hint={eleven.message || eleven.reason || ''} />
        <Badge label="Raindrop" status={raindrop.ok ? 'live' : (raindrop.present ? 'warn' : 'mock')} hint={raindrop.message || raindrop.reason || ''} />
      </div>

      <div style={{ marginTop: 10, fontSize: 13, color: '#9aa4b2' }}>
        {report?.pingResults ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div>Vultr reachable: {String(report.pingResults.vultr?.reachable ?? 'unknown')}</div>
            <div>ElevenLabs reachable: {String(report.pingResults.eleven?.reachable ?? 'unknown')}</div>
          </div>
        ) : (
          <div>Status details unavailable</div>
        )}
      </div>
    </div>
  );
}
