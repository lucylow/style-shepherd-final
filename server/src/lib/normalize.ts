/**
 * Utility functions for normalizing size, fabric, and color tokens
 */

export function normalizeSize(size: string | null): string | null {
  if (!size) return null;
  
  const normalized = size.toLowerCase().trim();
  
  // Map common size variations
  const sizeMap: Record<string, string> = {
    'xs': 'XS',
    'extra small': 'XS',
    'small': 'S',
    's': 'S',
    'medium': 'M',
    'm': 'M',
    'large': 'L',
    'l': 'L',
    'xl': 'XL',
    'extra large': 'XL',
    'xxl': 'XXL',
    '2xl': 'XXL',
    'extra extra large': 'XXL'
  };
  
  return sizeMap[normalized] || size.toUpperCase();
}

export function normalizeFabric(fabric: string): string {
  const normalized = fabric.toLowerCase().trim();
  
  // Map common fabric variations
  const fabricMap: Record<string, string> = {
    'cotton': 'cotton',
    'linen': 'linen',
    'silk': 'silk',
    'wool': 'wool',
    'polyester': 'polyester',
    'nylon': 'nylon',
    'jersey': 'jersey',
    'denim': 'denim',
    'leather': 'leather',
    'synthetic': 'polyester',
    'poly': 'polyester'
  };
  
  return fabricMap[normalized] || normalized;
}

export function normalizeColor(color: string): string {
  const normalized = color.toLowerCase().trim();
  
  // Map common color variations
  const colorMap: Record<string, string> = {
    'grey': 'gray',
    'navy': 'navy blue',
    'beige': 'beige',
    'tan': 'tan',
    'burgundy': 'burgundy',
    'maroon': 'maroon'
  };
  
  return colorMap[normalized] || normalized;
}

/**
 * Extract measurements from text (height, weight, etc.)
 */
export function extractMeasurements(text: string): {
  height?: string;
  weight?: string;
  chest?: string;
  waist?: string;
  hips?: string;
} {
  const normalized = text.toLowerCase();
  const measurements: any = {};
  
  // Height patterns: 5'3", 5'3, 5 feet 3 inches, 5ft 3in
  const heightMatch = normalized.match(/(\d+)['']?\s*(\d+)?[""]?|(\d+)\s*(?:feet|ft|')\s*(\d+)?\s*(?:inches|in|"|'')?/);
  if (heightMatch) {
    const feet = heightMatch[1] || heightMatch[3];
    const inches = heightMatch[2] || heightMatch[4] || '0';
    measurements.height = `${feet}'${inches}"`;
  }
  
  // Weight patterns: 135lbs, 135 lbs, 135 pounds
  const weightMatch = normalized.match(/(\d+)\s*(?:lbs?|pounds?)/);
  if (weightMatch) {
    measurements.weight = `${weightMatch[1]}lbs`;
  }
  
  // Chest, waist, hips (numeric measurements)
  const chestMatch = normalized.match(/(?:chest|bust)[:\s]+(\d+)/);
  if (chestMatch) measurements.chest = chestMatch[1];
  
  const waistMatch = normalized.match(/(?:waist)[:\s]+(\d+)/);
  if (waistMatch) measurements.waist = waistMatch[1];
  
  const hipsMatch = normalized.match(/(?:hips)[:\s]+(\d+)/);
  if (hipsMatch) measurements.hips = hipsMatch[1];
  
  return measurements;
}
