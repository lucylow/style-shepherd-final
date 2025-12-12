import React, { useEffect, useState } from 'react';

interface SizeDistributionProps {
  userId?: string;
}

interface ParsedData {
  weight?: number;
  heightInInches?: number;
  measurements?: number[];
}

function parseNumbersFromText(text = '') {
  // small heuristics: find weights in lbs and heights like 5'3" and BUST-WAIST-HIP patterns
  const res: ParsedData = {};
  const weightMatch = text.match(/(\d{2,3})\s?(lbs|lb)/i);
  if (weightMatch) res.weight = parseInt(weightMatch[1], 10);
  const heightMatch = text.match(/(\d)'(\d{1,2})/);
  if (heightMatch) res.heightInInches = parseInt(heightMatch[1], 10) * 12 + parseInt(heightMatch[2], 10);
  const measurements = text.match(/(\d{2,3})[-\s]?(?:\/)?(\d{2,3})[-\s]?(?:\/)?(\d{2,3})/);
  if (measurements) res.measurements = measurements.slice(1, 4).map(n => parseInt(n, 10));
  return res;
}

export default function SizeDistribution({ userId = 'demo_user' }: SizeDistributionProps) {
  const [distribution, setDistribution] = useState<{ weights: number[] }>({ weights: [] });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/raindrop/search-memory', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId, q: '', topK: 500 })
        });
        const j = await res.json();
        const list = j.results || j.resp || [];
        const weights: number[] = [];
        list.forEach((it: { text?: string; resp?: { text?: string } }) => {
          const text = it.text || it?.resp?.text || '';
          const parsed = parseNumbersFromText(text);
          if (parsed.weight) weights.push(parsed.weight);
        });
        setDistribution({ weights });
      } catch (e) {
        console.warn(e);
        setDistribution({ weights: [] });
      }
    })();
  }, [userId]);

  const weights = distribution.weights || [];
  if (!weights.length) return (
    <div style={{ padding: 12, borderRadius: 10, background: '#fff', color: '#666' }}>
      <h4 style={{ marginTop: 0 }}>Size Distribution</h4>
      <div>No numeric size data found.</div>
    </div>
  );

  // compute histogram 40..220 step 10
  const min = Math.max(40, Math.min(...weights) - 5);
  const max = Math.min(240, Math.max(...weights) + 5);
  const step = 10;
  const bins: Array<{ range: string; count: number }> = [];
  for (let b = min; b <= max; b += step) bins.push({ range: `${b}-${b + step - 1}`, count: 0 });
  weights.forEach(w => {
    const idx = Math.min(bins.length - 1, Math.floor((w - min) / step));
    if (idx >= 0) bins[idx].count++;
  });

  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const svgWidth = 360, svgHeight = 120, padding = 10;
  const barWidth = (svgWidth - padding * 2) / bins.length;

  return (
    <div style={{ padding: 12, borderRadius: 10, background: '#fff' }}>
      <h4 style={{ marginTop: 0 }}>Size Distribution (weights)</h4>
      <svg width={svgWidth} height={svgHeight}>
        <g transform={`translate(${padding},8)`}>
          {bins.map((b, i) => {
            const barH = ((b.count / maxCount) * (svgHeight - 40));
            return (
              <g key={i} transform={`translate(${i * barWidth}, ${svgHeight - barH - 40})`}>
                <rect x={0} y={0} width={Math.max(6, barWidth - 4)} height={barH} rx={3} fill="#06b6d4" opacity={0.9} />
                {/* label */}
                <text x={(barWidth - 4) / 2} y={barH + 14} fontSize="9" fill="#334155" textAnchor="middle">{b.count > 0 ? b.range : ''}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>Samples: {weights.length}</div>
    </div>
  );
}

