/**
 * Small harness to evaluate model outputs against simple checks.
 * Returns a result per sample with boolean checks and notes.
 */

import { generateFashioniResponse } from './ragClient.js';

interface Sample {
  id?: string;
  userId?: string;
  prompt: string;
  expected?: {
    size?: string;
    fabric?: string;
    contains?: string[];
  };
}

interface EvaluationOptions {
  model?: string;
}

interface EvaluationResult {
  id: string;
  prompt: string;
  assistant: string;
  extracted: {
    raw: string;
    size: string | null;
    fabrics: string[];
    colors: string[];
  };
  checks: {
    size?: boolean;
    fabric?: boolean;
    contains?: boolean;
  };
  score: number;
  raw?: any;
}

export async function evaluateSamples(
  samples: Sample[] = [],
  opts: EvaluationOptions = {}
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const s of samples) {
    const resp = await generateFashioniResponse({
      userId: s.userId || 'demo_user',
      userMessage: s.prompt,
      model: opts.model
    });

    const text = resp.assistantText || '';
    const extracted = resp.fields || { raw: text, size: null, fabrics: [], colors: [] };
    const expected = s.expected || {};
    const checks: Record<string, boolean> = {};

    if (expected.size) {
      checks.size = (String(extracted.size || '').toLowerCase().includes(String(expected.size).toLowerCase()));
    }

    if (expected.fabric) {
      checks.fabric = (extracted.fabrics || []).some(f => f.includes(expected.fabric!.toLowerCase()));
    }

    if (expected.contains) {
      checks.contains = expected.contains.every(substr => text.toLowerCase().includes(substr.toLowerCase()));
    }

    // Basic quality score heuristic
    const score = (Object.values(checks).filter(Boolean).length) / (Object.keys(checks).length || 1);

    results.push({
      id: s.id || (s.prompt.slice(0, 40)),
      prompt: s.prompt,
      assistant: text,
      extracted,
      checks,
      score,
      raw: resp.raw
    });
  }

  return results;
}

