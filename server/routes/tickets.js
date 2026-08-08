import { Router } from 'express';
import { getDb } from '../db/database.js';
import { classifyTicket } from '../lib/classify.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateTicketBody(body) {
  const errors = [];
  if (!body.subject?.trim())         errors.push('subject is required');
  if (!body.body?.trim())            errors.push('body is required');
  if (!body.customer_name?.trim())   errors.push('customer_name is required');
  if (!body.customer_email?.trim())  errors.push('customer_email is required');
  return errors;
}

/** Write an audit_log row. detail can be a string or object (serialised to JSON). */
function writeAudit(db, ticketId, step, status, detail = null) {
  const detailStr = detail
    ? typeof detail === 'string' ? detail : JSON.stringify(detail)
    : null;
  db.prepare(
    `INSERT INTO audit_log (ticket_id, step, status, detail)
     VALUES (?, ?, ?, ?)`
  ).run(ticketId, step, status, detailStr);
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
// so that e.g. GET /metrics/summary is not swallowed by GET /:id
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

  if (status) { query += ' AND status = ?'; params.push(status); }
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

  res.json({ by_status: byStatus, by_priority: byPriority, run_stats: runStats });
});

/**
 * POST /api/tickets
 * Submit a new support ticket.
 * Validates required fields, inserts with status='pending', returns the new ticket.
 * Phase 3 will fire the full automation pipeline from here.
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

  // Phase 3: pipeline.run(ticket.id) async call goes here

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
 * Sends the ticket to Gemini for structured classification.
 * This is the Phase 2 automation entry point — it runs classification only.
 * The full pipeline (execute + respond) is implemented in Phase 3.
 *
 * Lifecycle:
 *   pending → processing (on start)
 *   processing → stays processing (classification done, pipeline not yet complete)
 *   processing → failed (on AI error)
 *
 * All transitions are recorded in audit_log.
 */
router.post('/:id/analyze', async (req, res) => {
  const db     = getDb();
  const { id } = req.params;

  // ── 1. Retrieve the ticket ─────────────────────────────────────────────
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Prevent re-analyzing a ticket that is already done or in-flight.
  // Allow re-analysis if it previously failed (retry semantics).
  if (ticket.status === 'processing') {
    return res.status(409).json({
      error: 'Ticket is already being processed',
      ticket_id: ticket.id,
    });
  }
  if (ticket.status === 'completed') {
    return res.status(409).json({
      error: 'Ticket has already been completed. Use the existing classification.',
      ticket_id: ticket.id,
    });
  }

  // ── 2. Mark as processing ──────────────────────────────────────────────
  patchTicket(db, id, { status: 'processing' });

  // ── 3. Audit: classify started ─────────────────────────────────────────
  writeAudit(db, id, 'classify', 'started', {
    model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
    fallback: process.env.AI_FALLBACK === 'true',
  });

  // ── 4. Call Gemini ─────────────────────────────────────────────────────
  let classification;
  try {
    classification = await classifyTicket(ticket);
  } catch (err) {
    console.error(`[analyze] ticket #${id} classification failed:`, err.message);

    // Record failure in audit and mark ticket as failed
    writeAudit(db, id, 'classify', 'error', { error: err.message });
    patchTicket(db, id, { status: 'failed' });

    return res.status(502).json({
      error: 'AI classification failed',
      detail: err.message,
      ticket_id: Number(id),
    });
  }

  // ── 5 & 6. Validate (done inside classifyTicket) + store ──────────────
  const { analysis_source, ...fields } = classification;

  patchTicket(db, id, {
    category:           fields.category,
    priority:           fields.priority,
    department:         fields.department,
    summary:            fields.summary,
    intent:             fields.intent,
    recommended_action: fields.recommended_action,
    analysis_source,
    // Keep status as 'processing' — the pipeline (Phase 3) will mark 'completed'
  });

  // ── 7. Audit: classify done ────────────────────────────────────────────
  writeAudit(db, id, 'classify', 'done', {
    category:           fields.category,
    priority:           fields.priority,
    department:         fields.department,
    recommended_action: fields.recommended_action,
    analysis_source,
  });

  // ── 8. Return updated ticket + classification ──────────────────────────
  const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  const auditLog      = db
    .prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id);

  res.json({
    ticket:         updatedTicket,
    classification: { ...fields, analysis_source },
    audit_log:      auditLog,
  });
});

export default router;
