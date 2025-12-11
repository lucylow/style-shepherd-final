/**
 * Extract structured fields (size, fabric, color) from assistant text
 */

import { normalizeSize, normalizeFabric, normalizeColor } from './normalize.js';

export interface ExtractedFields {
  raw: string;
  size: string | null;
  fabrics: string[];
  colors: string[];
}

export function extractStructuredFields(text: string = ''): ExtractedFields {
  // Heuristics to extract size/fabric/color tokens
  const normalized = (text || '').toLowerCase();

  const sizeMatch = normalized.match(/\b(xs|s|m|l|xl|xxl|small|medium|large|\d{2,3}\s?lbs|\d'\d{1,2})\b/gi);
  const fabricMatch = normalized.match(/\b(linen|cotton|silk|denim|wool|polyester|nylon|jersey|leather|spandex|rayon|viscose|modal|bamboo)\b/gi);
  const colorMatch = normalized.match(/\b(black|white|red|blue|green|pink|beige|brown|grey|gray|yellow|navy|burgundy|maroon|tan|cream|ivory|khaki)\b/gi);

  // Size normalization
  let size: string | null = null;
  if (sizeMatch && sizeMatch.length) {
    // Pick the most semantically useful token (prefer explicit size mentions)
    const explicitSize = sizeMatch.find(s => /^(xs|s|m|l|xl|xxl|small|medium|large)$/i.test(s.trim()));
    size = explicitSize ? normalizeSize(explicitSize.trim()) : normalizeSize(sizeMatch[0].trim());
  }

  return {
    raw: text,
    size: size || null,
    fabrics: [...new Set((fabricMatch || []).map(s => normalizeFabric(s.toLowerCase().trim())))],
    colors: [...new Set((colorMatch || []).map(s => normalizeColor(s.toLowerCase().trim())))]
  };
}
