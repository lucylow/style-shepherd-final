/**
 * Audit API Routes
 * List evidence and incidents for admin review
 */

import { Router, Request, Response, NextFunction } from 'express';
import { listEvidenceFiles } from '../lib/evidence.js';

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function checkAdminAuth(req: Request): boolean {
  const header = req.headers['x-admin-token'] || (req.query?.adminToken as string);
  return header === ADMIN_TOKEN;
}

/**
 * GET /api/audit/list
 * List evidence / incidents (admin)
 */
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ success: false, error: 'unauthorized' });
  }

  try {
    // Prefer DB incidents if Prisma set up
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const incidents = await prisma.riskIncident.findMany({
        include: { evidence: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      await prisma.$disconnect();
      return res.json({ success: true, incidents });
    } catch (e) {
      // Fallback to filesystem evidence
      const files = listEvidenceFiles(200);
      return res.json({ success: true, evidenceFiles: files });
    }
  } catch (err) {
    console.error('audit/list', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
