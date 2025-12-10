import React, { useEffect, useState } from 'react';

interface MemoryTimelineProps {
  userId?: string;
  onSelect?: (memory: MemoryItem) => void;
}

interface MemoryItem {
  id?: string;
  text?: string;
  createdAt?: string;
  resp?: {
    id?: string;
    text?: string;
    createdAt?: string;
  };
  message?: string;
}

function formatDate(d: string | undefined) {
  try { 
    if (!d) return '';
    return new Date(d).toLocaleString(); 
  } catch { 
    return d || ''; 
  }
}

export default function MemoryTimeline({ userId = 'demo_user', onSelect }: MemoryTimelineProps) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(q = '') {
    setLoading(true);
    try {
      const res = await fetch('/api/raindrop/search-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, q, topK: 200 })
      });
      const j = await res.json();
      const list = j.results || j.resp?.results || j.resp || [];
      // sort by createdAt ascending
      const sortedList = Array.isArray(list) ? [...list] : [];
      sortedList.sort((a: MemoryItem, b: MemoryItem) => {
        const aDate = a.createdAt || a?.resp?.createdAt || 0;
        const bDate = b.createdAt || b?.resp?.createdAt || 0;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
      setItems(sortedList);
    } catch (e) {
      console.warn('timeline load', e);
      setItems([]);
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    load(); 
  }, [userId]);

  async function handleDelete(id: string | undefined) {
    if (!id) return;
    if (!confirm('Delete memory?')) return;
    try {
      const r = await fetch('/api/raindrop/delete-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id })
      });
      await r.json();
      load();
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <div style={{ padding: 12, borderRadius: 10, background: '#fff', minHeight: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Memory Timeline</h4>
        <div style={{ color: '#666', fontSize: 13 }}>{loading ? 'Loading…' : `${items.length} items`}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {items.length === 0 && <div style={{ color: '#666' }}>No memories — add one from the chat.</div>}
          {items.map(it => {
            const text = it.text || it?.resp?.text || (it?.message || '');
            const id = it.id || it?.resp?.id;
            const ts = it.createdAt || it?.resp?.createdAt;
            return (
              <div key={id || Math.random()} style={{
                minWidth: 240, borderRadius: 10, border: '1px solid #eef2f6', padding: 10, background: '#fbfcff', boxShadow: '0 2px 6px #00000006'
              }}>
                <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.3, maxHeight: 72, overflow: 'hidden' }}>{text}</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatDate(ts)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onSelect && onSelect(it)} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 8, border: '1px solid #eef2f6', background: '#fff', cursor: 'pointer' }}>Open</button>
                    <button onClick={() => handleDelete(id)} style={{ fontSize: 12, padding: '6px 8px', borderRadius: 8, background: '#fee', border: '1px solid #fcc', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
