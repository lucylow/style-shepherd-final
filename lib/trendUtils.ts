/**
 * Trend Analysis Utilities
 * Mock data generation, scoring, forecasting, and image classification simulation
 */

const COLORS = [
  { name: 'Pastel Pink', hex: '#F4C2C2' },
  { name: 'Mint Green', hex: '#98FF98' },
  { name: 'Cobalt Blue', hex: '#0047AB' },
  { name: 'Warm Beige', hex: '#D5C2A8' },
  { name: 'Sunset Orange', hex: '#FF6F3C' },
  { name: 'Charcoal', hex: '#36454F' },
];

const STYLES = [
  'Cottagecore',
  'Vintage',
  'Streetwear',
  'Minimalist',
  'Bohemian',
  'Athleisure',
  'Preppy',
  'Gothic',
  'Business Casual',
  'Techwear',
];

const FABRICS = ['Linen', 'Silk', 'Cotton', 'Wool', 'Denim', 'Polyester', 'Rayon'];

function rand(seedMin = 0, seedMax = 1): number {
  return seedMin + Math.random() * (seedMax - seedMin);
}

/**
 * Generate time series history array
 */
function genHistory(
  months = 6,
  base = 10,
  volatility = 3,
  trend = 1.2
): Array<{ month: string; popularity: number }> {
  const out: Array<{ month: string; popularity: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toISOString().slice(0, 7);
    // base trend grows slowly; add noise
    const val = Math.max(
      0,
      base * Math.pow(trend, months - i - 1) + rand(-volatility, volatility)
    );
    out.push({ month: monthStr, popularity: Number(val.toFixed(2)) });
  }

  return out;
}

/**
 * Simple least squares linear regression prediction
 */
function linearFitPredict(
  history: Array<{ month: string; popularity: number }>,
  predictSteps = 3
): Array<{ step: number; predicted: number }> {
  if (!history || history.length === 0) {
    return Array.from({ length: predictSteps }, (_, i) => ({
      step: i + 1,
      predicted: 0,
    }));
  }

  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => Number(h.popularity));
  const xMean = xs.reduce((s, a) => s + a, 0) / n;
  const yMean = ys.reduce((s, a) => s + a, 0) / n;

  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) * (xs[i] - xMean);
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const preds: Array<{ step: number; predicted: number }> = [];
  for (let k = 1; k <= predictSteps; k++) {
    const xk = n + (k - 1);
    const yk = intercept + slope * xk;
    preds.push({
      monthIndex: k,
      predicted: Number(Math.max(0, yk).toFixed(2)),
    });
  }

  return preds;
}

/**
 * Forecast wrapper: returns array of future month strings w/ predicted value
 */
export function forecastSeries(
  history: Array<{ month: string; popularity: number }>,
  futureMonths = 3
): Array<{ month: string; predicted: number }> {
  const preds = linearFitPredict(history, futureMonths);

  const lastMonthStr =
    history.length > 0
      ? history[history.length - 1].month
      : new Date().toISOString().slice(0, 7);
  const [y, m] = lastMonthStr.split('-').map(Number);

  const out = preds.map((p, idx) => {
    const date = new Date(y, m - 1 + (idx + 1), 1);
    return { month: date.toISOString().slice(0, 7), predicted: p.predicted };
  });

  return out;
}

/**
 * Score items by latest popularity, percent change, and a small boost for recency
 */
export function computeTrendScores(
  items: Array<{
    name: string;
    history?: Array<{ month: string; popularity: number }>;
    score?: number;
  }>
): Array<{
  name: string;
  score: number;
  latest?: number;
  pctChange?: number;
  history?: Array<{ month: string; popularity: number }>;
}> {
  const arr: Array<{
    name: string;
    score: number;
    latest?: number;
    pctChange?: number;
    history?: Array<{ month: string; popularity: number }>;
  }> = [];

  for (const it of items) {
    if (it.history && it.history.length >= 1) {
      const hist = it.history;
      const latest = hist[hist.length - 1].popularity || 0;
      const prev = hist.length >= 2 ? hist[hist.length - 2].popularity : latest;
      const pctChange = prev === 0 ? 0 : (latest - prev) / prev;
      const score = latest * (1 + Math.max(0, pctChange)); // naive composite

      arr.push({
        name: it.name,
        score: Number(score.toFixed(3)),
        latest,
        pctChange: Number(pctChange.toFixed(3)),
        history: hist,
      });
    } else if (typeof it.score === 'number') {
      arr.push({ name: it.name, score: Number(it.score) });
    } else {
      // fallback: random
      arr.push({ name: it.name, score: Number(rand(0.2, 1.0).toFixed(3)) });
    }
  }

  // sort descending
  arr.sort((a, b) => b.score - a.score);
  return arr;
}

/**
 * Generate mock market trends for a region/city
 */
export function generateMarketTrends({
  region = 'Global',
  city = null,
  category = 'apparel',
  months = 6,
}: {
  region?: string;
  city?: string | null;
  category?: string;
  months?: number;
} = {}) {
  // create colors with histories
  const colors = COLORS.map((c) => {
    const base = 8 + Math.random() * 8;
    const trend = 1 + (Math.random() - 0.4) * 0.2; // slight trending
    const history = genHistory(months, base, 3, trend);
    return { name: c.name, hex: c.hex, history };
  });

  // styles
  const styles = STYLES.map((s) => {
    const base = 4 + Math.random() * 10;
    const trend = 1 + (Math.random() - 0.3) * 0.3;
    const history = genHistory(months, base, 4, trend);
    return { name: s, history };
  });

  // fabrics
  const fabrics = FABRICS.map((f) => {
    const base = 3 + Math.random() * 6;
    const trend = 1 + (Math.random() - 0.3) * 0.2;
    const history = genHistory(months, base, 2, trend);
    return { name: f, history };
  });

  // supply maps for styleHistory simple access
  const styleHistory: Record<string, Array<{ month: string; popularity: number }>> =
    {};
  for (const s of styles) {
    styleHistory[s.name] = s.history;
  }

  // maybe tune by city / region
  const regionNote = `${city ? city + ', ' : ''}${region}`;

  return {
    region: regionNote,
    generatedAt: new Date().toISOString(),
    colors,
    styles,
    fabrics,
    styleHistory,
  };
}

/**
 * Simple fake image classifier (no ML) - returns detected styles and dominant color hex
 */
export function mockClassifyImage(
  base64ImageOrId: string,
  opts: { region?: string; category?: string } = {}
): {
  success: boolean;
  detectedStyles: string[];
  confidence: number[];
  dominantColor: string;
  notes: string;
} {
  // ignore actual image; pick deterministic-ish picks based on hash
  const seed = Math.abs(hashString(String(base64ImageOrId || 'demo'))) % 100;
  const style = STYLES[seed % STYLES.length];
  const style2 = STYLES[(seed + 3) % STYLES.length];
  const color = COLORS[seed % COLORS.length];
  const confidence = [
    Number((0.6 + Math.random() * 0.35).toFixed(2)),
    Number((0.25 + Math.random() * 0.2).toFixed(2)),
  ];

  return {
    success: true,
    detectedStyles: [style, style2],
    confidence,
    dominantColor: color.hex,
    notes: 'Mock classifier output for demo',
  };
}

function hashString(s: string): number {
  // simple deterministic hash without crypto module dependency
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

/**
 * Simple rule-based recommendations
 */
export function generateRecommendations({
  topStyles = [],
  topColors = [],
  topFabrics = [],
  userProfile = null,
  category = 'apparel',
}: {
  topStyles?: Array<{ name: string; score: number }>;
  topColors?: Array<{ name: string; hex?: string; score: number }>;
  topFabrics?: Array<{ name: string; score: number }>;
  userProfile?: { preferences?: string[] } | null;
  category?: string;
}): Array<{
  type: string;
  picks?: Array<{ text: string; score: number }>;
  palette?: Array<{ name: string; hex: string | null; score: number }>;
  fabricPick?: Array<{ name: string; score: number }>;
  rationale?: string;
  text?: string;
}> {
  const recs: Array<{
    type: string;
    picks?: Array<{ text: string; score: number }>;
    palette?: Array<{ name: string; hex: string | null; score: number }>;
    fabricPick?: Array<{ name: string; score: number }>;
    rationale?: string;
    text?: string;
  }> = [];

  // Suggest top 3 styles as editorial picks
  const editorial = topStyles.slice(0, 3).map((s) => ({
    text: `Editorial pick: ${s.name}`,
    score: s.score,
  }));
  recs.push({ type: 'editorial', picks: editorial });

  // Suggest color palettes
  const palette = topColors.slice(0, 5).map((c) => ({
    name: c.name,
    hex: c.hex || null,
    score: c.score,
  }));
  recs.push({ type: 'palette', palette });

  // Offer fabric recommendation by category
  const fabricPick = topFabrics.slice(0, 2).map((f) => ({
    name: f.name,
    score: f.score,
  }));
  recs.push({
    type: 'fabric',
    fabricPick,
    rationale: `These fabrics show strong regional momentum for ${category}.`,
  });

  // Personalized suggestion
  if (
    userProfile &&
    Array.isArray(userProfile.preferences) &&
    userProfile.preferences.length > 0
  ) {
    recs.push({
      type: 'personalized',
      text: `Because you like ${userProfile.preferences.join(', ')}, consider items in ${
        topStyles[0]?.name || 'featured'
      }.`,
    });
  } else {
    recs.push({
      type: 'cta',
      text: 'Create a profile to get personalized trend feeds.',
    });
  }

  return recs;
}
