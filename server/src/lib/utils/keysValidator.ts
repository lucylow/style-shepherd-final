/**
 * Centralized key validation helpers used by all integration wrappers.
 * 
 * - Keeps a single source-of-truth for env var names
 * - Provides light-weight validation checks and normalized key extraction
 * - Intended for server-side only (do NOT expose keys to client)
 */

const possibleVultrNames = [
  'VULTR_SERVERLESS_INFERENCE_API_KEY',
  'VULTR_API_KEY',
  'VULTR_KEY'
];

const possibleRaindropNames = [
  'RAINDROP_API_KEY',
  'RAINDROP_KEY'
];

const possibleElevenNames = [
  'ELEVENLABS_API_KEY',
  'ELEVEN_KEY',
  'ELEVEN_LABS_API_KEY' // Legacy support
];

export interface KeyResult {
  envName: string;
  key: string;
  ok: boolean;
}

function findEnv(names: string[]): { name: string; value: string } | null {
  for (const n of names) {
    const value = process.env[n];
    if (value && String(value).trim().length > 0) {
      return { name: n, value: String(value).trim() };
    }
  }
  return null;
}

function simpleKeySanity(key: string): boolean {
  // Very permissive: check not-empty and length 8..1024 and printable chars
  if (!key) return false;
  if (typeof key !== 'string') return false;
  if (key.length < 8 || key.length > 1024) return false;
  // no control characters (check character codes instead of regex)
  for (let i = 0; i < key.length; i++) {
    const charCode = key.charCodeAt(i);
    if (charCode >= 0 && charCode <= 31) {
      return false;
    }
  }
  return true;
}

export function getVultrKey(): KeyResult | null {
  const found = findEnv(possibleVultrNames);
  if (!found) return null;
  return { 
    envName: found.name, 
    key: found.value, 
    ok: simpleKeySanity(found.value) 
  };
}

export function getElevenKey(): KeyResult | null {
  const found = findEnv(possibleElevenNames);
  if (!found) return null;
  return { 
    envName: found.name, 
    key: found.value, 
    ok: simpleKeySanity(found.value) 
  };
}

export function getRaindropKey(): KeyResult | null {
  const found = findEnv(possibleRaindropNames);
  if (!found) return null;
  return { 
    envName: found.name, 
    key: found.value, 
    ok: simpleKeySanity(found.value) 
  };
}

interface ValidationStatus {
  present: boolean;
  envName: string | null;
  ok: boolean;
}

interface ValidationReport {
  vultr: ValidationStatus;
  eleven: ValidationStatus;
  raindrop: ValidationStatus;
  summary: {
    readyForLiveDemo: boolean;
    reasons: string[];
  };
}

/**
 * Returns an object with validation status for all integrations:
 * {
 *   vultr: { present: boolean, envName, ok },
 *   eleven: { ... },
 *   raindrop: { ... },
 *   summary: { readyForLiveDemo: boolean, reasons: [...] }
 * }
 */
export function validateAll(): ValidationReport {
  const vultr = getVultrKey();
  const eleven = getElevenKey();
  const raindrop = getRaindropKey();

  const reasons: string[] = [];
  if (!vultr) {
    reasons.push('Vultr key not set (mock mode)');
  } else if (!vultr.ok) {
    reasons.push(`Vultr key (${vultr.envName}) appears malformed`);
  }

  if (!eleven) {
    reasons.push('ElevenLabs key not set (mock mode)');
  } else if (!eleven.ok) {
    reasons.push(`ElevenLabs key (${eleven.envName}) appears malformed`);
  }

  if (!raindrop) {
    reasons.push('Raindrop key not set (mock mode)');
  } else if (!raindrop.ok) {
    reasons.push(`Raindrop key (${raindrop.envName}) appears malformed`);
  }

  const readyForLiveDemo = Boolean(
    (vultr && vultr.ok) || 
    (eleven && eleven.ok) || 
    (raindrop && raindrop.ok)
  );

  return {
    vultr: vultr 
      ? { present: true, envName: vultr.envName, ok: Boolean(vultr.ok) } 
      : { present: false, envName: null, ok: false },
    eleven: eleven 
      ? { present: true, envName: eleven.envName, ok: Boolean(eleven.ok) } 
      : { present: false, envName: null, ok: false },
    raindrop: raindrop 
      ? { present: true, envName: raindrop.envName, ok: Boolean(raindrop.ok) } 
      : { present: false, envName: null, ok: false },
    summary: { readyForLiveDemo, reasons }
  };
}

// Export candidate names if UI needs to show what's expected
export const _meta = {
  possibleVultrNames,
  possibleElevenNames,
  possibleRaindropNames
};
