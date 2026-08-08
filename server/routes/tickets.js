import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateTicketBody(body) {
  const errors = [];
  if (!body.subject?.trim()) errors.push('subject is required');
  if (!body.body?.trim()) errors.push('body is required');
  if (!body.customer_name?.trim()) errors.push('customer_name is required');
  if (!body.customer_email?.trim()) errors.push('customer_email is required');
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/tickets
 * List all tickets, newest first.
 * Query params: status, priority, limit (default 50), offset (default 0)
 */
router.get('/', (req, res) => {
  const db = getDb();
  const { status, priority, limit = 50, offset = 0 } = req.query;

  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const tickets = db.prepare(query).all(...params);
  res.json({ tickets, count: tickets.length });
});

/**
 * GET /api/tickets/:id
 * Single ticket with its full audit log and automation run record.
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const auditLog = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  const automationRun = db
    .prepare('SELECT * FROM automation_runs WHERE ticket_id = ? ORDER BY started_at DESC LIMIT 1')
    .get(id);

  res.json({ ticket, audit_log: auditLog, automation_run: automationRun ?? null });
});

/**
 * POST /api/tickets
 * Submit a new support ticket.
 * Phase 2 will fire the automation pipeline from here.
 */
router.post('/', (req, res) => {
  const db = getDb();
  const errors = validateTicketBody(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const { subject, body, customer_name, customer_email } = req.body;

  const result = db
    .prepare(
      `INSERT INTO tickets (subject, body, customer_name, customer_email)
       VALUES (?, ?, ?, ?)`
    )
    .run(subject.trim(), body.trim(), customer_name.trim(), customer_email.trim());

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);

  // Phase 2: pipeline.run(ticket.id) will be called here (async, non-blocking)

  res.status(201).json({ ticket });
});

/**
 * GET /api/tickets/:id/audit
 * Dedicated endpoint for the audit trail of a specific ticket.
 */
router.get('/:id/audit', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const auditLog = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  res.json({ ticket_id: Number(id), audit_log: auditLog });
});

/**
 * GET /api/tickets/metrics/summary
 * Basic aggregate metrics for the dashboard.
 * Returns counts by status and priority, plus automation run stats.
 */
router.get('/metrics/summary', (req, res) => {
  const db = getDb();

  const byStatus = db
    .prepare(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`)
    .all();

  const byPriority = db
    .prepare(`SELECT priority, COUNT(*) as count FROM tickets WHERE priority IS NOT NULL GROUP BY priority`)
    .all();

  const runStats = db
    .prepare(
      `SELECT
         COUNT(*) as total_runs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END) as avg_duration_ms
       FROM automation_runs`
    )
    .get();

  res.json({ by_status: byStatus, by_priority: byPriority, run_stats: runStats });
});

export default router;
