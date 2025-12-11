/**
 * Evidence Logger
 * Create immutable evidence records: writes to file-system or DB (Prisma) and returns hash and path.
 * If Prisma is available, it will persist there. Otherwise, fallback to JSON file store.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR =
  process.env.EVIDENCE_STORAGE_PATH ||
  path.join(process.cwd(), 'data', 'evidence');
const SALT = process.env.EVIDENCE_SALT || 'please-change-this-secret';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function hashEvidence(payload: any): string {
  const h = crypto.createHmac('sha256', SALT);
  h.update(JSON.stringify(payload));
  return h.digest('hex');
}

export interface EvidenceLogParams {
  action: string;
  userId?: string;
  payload?: Record<string, any>;
  note?: string;
}

export interface EvidenceLogResult {
  id: string;
  hash: string;
  path: string;
  createdAt: string;
}

/**
 * logEvidence
 * @param params - Evidence logging parameters
 * @returns Evidence record with hash and path
 */
export async function logEvidence(
  params: EvidenceLogParams = { action: 'unknown' }
): Promise<EvidenceLogResult> {
  const { action, userId, payload = {}, note = '' } = params;
  ensureDir(EVIDENCE_DIR);
  const timestamp = new Date().toISOString();
  const record = { action, userId, payload, note, timestamp };
  const hash = hashEvidence(record);
  const id = crypto.randomBytes(12).toString('hex');
  const filename = `${timestamp.replace(/[:.]/g, '_')}_${id}.json`;
  const filepath = path.join(EVIDENCE_DIR, filename);
  try {
    fs.writeFileSync(
      filepath,
      JSON.stringify({ id, hash, record }, null, 2),
      { encoding: 'utf8' }
    );
  } catch (err) {
    console.error('logEvidence write failed', err);
  }

  // Optional: if Prisma is installed, persist to DB
  try {
    // lazy require prisma to avoid crashing if not installed
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.evidence.create({
      data: {
        id,
        action,
        userId: userId || undefined,
        payload,
        hash,
      },
    });
    await prisma.$disconnect();
  } catch (e) {
    // prisma not available or error: ignore (we still have file store)
  }

  return { id, hash, path: filepath, createdAt: timestamp };
}

export interface EvidenceFile {
  file: string;
  path: string;
}

export function listEvidenceFiles(limit: number = 100): EvidenceFile[] {
  ensureDir(EVIDENCE_DIR);
  const files = fs
    .readdirSync(EVIDENCE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .slice(0, limit);
  return files.map((f) => ({ file: f, path: path.join(EVIDENCE_DIR, f) }));
}
