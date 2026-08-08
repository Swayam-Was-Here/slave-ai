import { Router } from 'express';
import { getDb } from '../db/database.js';
import { stepClassify, stepDecide } from '../automation/pipeline.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateTicketBody(body) {
  const errors = [];
  if (!body.subject?.trim())        errors.push('subject is required');
  if (!body.body?.trim())           errors.push('body is required');
  if (!body.customer_name?.trim())  errors.push('customer_name is required');
  if (!body.customer_email?.trim()) errors.push('customer_email is required');
  return errors;
}

/** Update ticket columns + always touch updated_at. */
function patchTicket(db, id, patch) {
  const cols = Object.keys(patch);
  if (cols.length === 0) return;
  const sets = [...cols.map((c) => `${c} = ?`), "updated_at = datetime('now')"].join(', ');
  const vals = [...cols.map((c) => patch[c]), id];
  db.prepare(`UPDATE tickets SET ${sets} WHERE id = ?`).run(...vals);
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: static / named routes MUST come before parameterised routes
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

  if (status)   { query += ' AND status = ?';   params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const tickets = db.prepare(query).all(...params);
  res.json({ tickets, count: tickets.length });
});

/**
 * GET /api/tickets/metrics/summary
 * Aggregate metrics for the dashboard header.
 * Defined BEFORE /:id to avoid being swallowed by the parameterised route.
 */
router.get('/metrics/summary', (req, res) => {
  const db = getDb();

  const byStatus = db
    .prepare(`SELECT status, COUNT(*) as count FROM tickets GROUP BY status`)
    .all();

  const byPriority = db
    .prepare(
      `SELECT priority, COUNT(*) as count FROM tickets
       WHERE priority IS NOT NULL GROUP BY priority`
    )
    .all();

  const byAction = db
    .prepare(
      `SELECT action_taken, COUNT(*) as count FROM tickets
       WHERE action_taken IS NOT NULL GROUP BY action_taken`
    )
    .all();

  const runStats = db
    .prepare(
      `SELECT
         COUNT(*) as total_runs,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) as failed,
         AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END) as avg_duration_ms
       FROM automation_runs`
    )
    .get();

  res.json({ by_status: byStatus, by_priority: byPriority, by_action: byAction, run_stats: runStats });
});

/**
 * POST /api/tickets
 * Submit a new support ticket.
 * Phase 4 will fire the full pipeline from here (fire-and-forget).
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

  // Phase 4: runPipeline(ticket.id) fire-and-forget goes here

  res.status(201).json({ ticket });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameterised routes — after all static ones
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/tickets/:id
 * Single ticket with its audit log and automation run record.
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const auditLog = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  const automationRun = db
    .prepare(
      'SELECT * FROM automation_runs WHERE ticket_id = ? ORDER BY started_at DESC LIMIT 1'
    )
    .get(id);

  res.json({ ticket, audit_log: auditLog, automation_run: automationRun ?? null });
});

/**
 * GET /api/tickets/:id/audit
 * Dedicated audit trail endpoint for a specific ticket.
 */
router.get('/:id/audit', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const auditLog = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  res.json({ ticket_id: Number(id), audit_log: auditLog });
});

/**
 * POST /api/tickets/:id/analyze
 *
 * Phase 2 endpoint: runs AI classification only.
 * Delegates to stepClassify from pipeline.js — no duplicated logic.
 *
 * Lifecycle:  pending → processing (classification done, awaiting decide)
 *             processing → failed (on AI error)
 */
router.post('/:id/analyze', async (req, res) => {
  const db     = getDb();
  const { id } = req.params;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (ticket.status === 'processing') {
    return res.status(409).json({ error: 'Ticket is already being processed', ticket_id: ticket.id });
  }
  if (ticket.status === 'completed') {
    return res.status(409).json({ error: 'Ticket has already been completed', ticket_id: ticket.id });
  }

  // Mark processing before the async AI call
  patchTicket(db, id, { status: 'processing' });

  let classification;
  try {
    classification = await stepClassify(db, ticket);
  } catch (err) {
    console.error(`[analyze] ticket #${id} failed:`, err.message);
    return res.status(502).json({
      error:     'AI classification failed',
      detail:    err.message,
      ticket_id: Number(id),
    });
  }

  const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const auditLog      = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  res.json({ ticket: updatedTicket, classification, audit_log: auditLog });
});

/**
 * POST /api/tickets/:id/decide
 *
 * Phase 3 endpoint: runs the deterministic decision engine on a classified ticket.
 *
 * Prerequisites: ticket must be in 'processing' status with classification data.
 * Stores action_taken and action_detail.
 * Does NOT execute the action yet (Phase 4).
 *
 * Lifecycle:  processing (classified) → processing (decision made, awaiting execution)
 *             → failed on unexpected engine error (should not happen in practice)
 */
router.post('/:id/decide', (req, res) => {
  const db     = getDb();
  const { id } = req.params;

  // ── 1. Retrieve ticket ────────────────────────────────────────────────────
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // ── 2. Ensure classification is present ───────────────────────────────────
  if (!ticket.category || !ticket.priority) {
    return res.status(422).json({
      error:     'Ticket has not been classified yet. Run POST /api/tickets/:id/analyze first.',
      ticket_id: ticket.id,
      status:    ticket.status,
    });
  }

  if (ticket.status === 'completed') {
    return res.status(409).json({
      error:     'Ticket has already been completed',
      ticket_id: ticket.id,
    });
  }

  // ── 3. Run the deterministic decision engine ──────────────────────────────
  const classification = {
    category:           ticket.category,
    priority:           ticket.priority,
    department:         ticket.department,
    intent:             ticket.intent,
    summary:            ticket.summary,
    recommended_action: ticket.recommended_action,
  };

  let decision;
  try {
    decision = stepDecide(db, ticket, classification);
  } catch (err) {
    console.error(`[decide] ticket #${id} decision engine error:`, err.message);

    // Record error audit
    db.prepare(
      `INSERT INTO audit_log (ticket_id, step, status, detail) VALUES (?, ?, ?, ?)`
    ).run(id, 'decide', 'error', JSON.stringify({ error: err.message }));

    return res.status(500).json({
      error:     'Decision engine error',
      detail:    err.message,
      ticket_id: Number(id),
    });
  }

  // ── 4. Return result ──────────────────────────────────────────────────────
  const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const auditLog      = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  res.json({
    ticket:   updatedTicket,
    decision: {
      action:      decision.action,
      reason:      decision.reason,
      confidence:  decision.confidence,
      source:      'deterministic_rule',
    },
    next_step: 'POST /api/tickets/:id/execute (Phase 4)',
    audit_log: auditLog,
  });
});

export default router;
