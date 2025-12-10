import React, { useEffect, useState } from 'react';

interface TagCloudProps {
  userId?: string;
  onTag?: (tag: string) => void;
}

interface TagItem {
  k: string;
  v: number;
}

function extractWords(text = '') {
  return (text || '').toLowerCase().match(/[a-z0-9'-]{2,}/g) || [];
}

export default function TagCloud({ userId = 'demo_user', onTag }: TagCloudProps) {
  const [tags, setTags] = useState<TagItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/raindrop/search-memory', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId, q: '', topK: 400 })
        });
        const j = await res.json();
        const list = j.results || j.resp || [];
        const freq: Record<string, number> = {};
        list.forEach((item: { text?: string; resp?: { text?: string } }) => {
          const text = item.text || item?.resp?.text || '';
          extractWords(text).forEach(w => freq[w] = (freq[w] || 0) + 1);
        });
        const arr = Object.keys(freq).map(k => ({ k, v: freq[k] })).sort((a, b) => b.v - a.v).slice(0, 60);
        setTags(arr);
      } catch (e) {
        console.warn('tagcloud', e);
      }
    })();
  }, [userId]);

  if (!tags.length) return <div style={{ padding: 12, color: '#666' }}>No tags</div>;

  const max = Math.max(...tags.map(t => t.v));
  return (
    <div style={{ padding: 12, borderRadius: 10, background: '#fff' }}>
      <h4 style={{ marginTop: 0 }}>Tag Cloud</h4>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {tags.map(t => {
          const size = 12 + Math.round((t.v / max) * 18);
          return (
            <button 
              key={t.k} 
              onClick={() => onTag && onTag(t.k)} 
              style={{
                fontSize: size,
                padding: '6px 8px',
                borderRadius: 8,
                border: '1px solid #eef2f6',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              {t.k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
