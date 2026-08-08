import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

/**
 * GET /api/health
 * Returns server status, SQLite connectivity, and uptime.
 * Used for startup verification and future monitoring.
 */
router.get('/', (req, res) => {
  let dbStatus = 'ok';
  let dbError = null;

  try {
    const db = getDb();
    // Lightweight connectivity check — single row read from sqlite_master
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  const payload = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    service: 'SLAVE API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
    db: {
      status: dbStatus,
      ...(dbError ? { error: dbError } : {}),
    },
  };

  const httpStatus = dbStatus === 'ok' ? 200 : 503;
  res.status(httpStatus).json(payload);
});

export default router;
