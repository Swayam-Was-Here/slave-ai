/**
 * server/automation/pipeline.js
 *
 * Automation pipeline orchestrator.
 *
 * This module sequences the autonomous workflow steps for a ticket.
 * Each step is implemented in its own module; the pipeline wires them together
 * and owns the ticket lifecycle transitions.
 *
 * Current state (Phase 3):
 *   classify → decide
 *
 * Planned extensions (Phase 4+):
 *   classify → decide → execute → respond → complete
 *
 * DESIGN NOTES:
 * - The pipeline does NOT duplicate classify/decide logic — it delegates to
 *   lib/classify.js and automation/decide.js respectively.
 * - Each step writes to audit_log before and after execution.
 * - On any step failure, the ticket is marked 'failed' and the pipeline halts.
 * - The pipeline is fire-and-forget from the POST /api/tickets route (Phase 4).
 *   For Phase 3, each step is still exposed as an individual API endpoint so
 *   you can drive the pipeline manually step-by-step.
 */

import { classifyTicket }  from '../lib/classify.js';
import { decideAction }    from './decide.js';
import { getDb }           from '../db/database.js';

// ─── Helpers (shared across steps) ───────────────────────────────────────────

/**
 * Write an audit_log row.
 * @param {object} db       - better-sqlite3 instance
 * @param {number} ticketId
 * @param {string} step     - classify | decide | execute | respond | complete
 * @param {string} status   - started | done | error
 * @param {any}    detail   - string or object (serialised to JSON)
 */
function writeAudit(db, ticketId, step, status, detail = null) {
  const detailStr = detail
    ? typeof detail === 'string' ? detail : JSON.stringify(detail)
    : null;
  db.prepare(
    `INSERT INTO audit_log (ticket_id, step, status, detail)
     VALUES (?, ?, ?, ?)`
  ).run(ticketId, step, status, detailStr);
}

/**
 * Update ticket columns + always touch updated_at.
 */
function patchTicket(db, id, patch) {
  const cols = Object.keys(patch);
  if (cols.length === 0) return;
  const sets = [...cols.map((c) => `${c} = ?`), "updated_at = datetime('now')"].join(', ');
  const vals = [...cols.map((c) => patch[c]), id];
  db.prepare(`UPDATE tickets SET ${sets} WHERE id = ?`).run(...vals);
}

// ─── Individual step functions ────────────────────────────────────────────────
// These are used both by the pipeline and by the individual API endpoints
// (POST /api/tickets/:id/analyze and POST /api/tickets/:id/decide).
// Keeping them here means there is exactly ONE implementation of each step.

/**
 * Step 1: AI Classification
 * Sends the ticket to Gemini (or fallback) and stores the result.
 *
 * @param {object} db       - better-sqlite3 instance
 * @param {object} ticket   - ticket row from DB
 * @returns {object} classification result
 * @throws {Error} if classification fails
 */
export async function stepClassify(db, ticket) {
  writeAudit(db, ticket.id, 'classify', 'started', {
    model:    process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    fallback: process.env.AI_FALLBACK === 'true',
  });

  let classification;
  try {
    classification = await classifyTicket(ticket);
  } catch (err) {
    writeAudit(db, ticket.id, 'classify', 'error', { error: err.message });
    patchTicket(db, ticket.id, { status: 'failed' });
    throw err;
  }

  const { analysis_source, ...fields } = classification;
  patchTicket(db, ticket.id, {
    category:           fields.category,
    priority:           fields.priority,
    department:         fields.department,
    summary:            fields.summary,
    intent:             fields.intent,
    recommended_action: fields.recommended_action,
    analysis_source,
  });

  writeAudit(db, ticket.id, 'classify', 'done', {
    category:           fields.category,
    priority:           fields.priority,
    department:         fields.department,
    recommended_action: fields.recommended_action,
    analysis_source,
  });

  return { ...fields, analysis_source };
}

/**
 * Step 2: Deterministic Decision
 * Runs the rule engine on the classification and stores the chosen action.
 *
 * @param {object} db             - better-sqlite3 instance
 * @param {object} ticket         - ticket row from DB (must have classification)
 * @param {object} classification - output from stepClassify
 * @returns {object} decision result { action, reason, confidence }
 */
export function stepDecide(db, ticket, classification) {
  writeAudit(db, ticket.id, 'decide', 'started', {
    category:           classification.category,
    priority:           classification.priority,
    recommended_action: classification.recommended_action,
  });

  const decision = decideAction(classification);

  // Store the decision on the ticket
  patchTicket(db, ticket.id, {
    action_taken:  decision.action,
    action_detail: JSON.stringify({
      action:      decision.action,
      reason:      decision.reason,
      confidence:  decision.confidence,
      source:      'deterministic_rule',
      priority:    classification.priority,
      category:    classification.category,
      department:  classification.department,
    }),
  });

  writeAudit(db, ticket.id, 'decide', 'done', {
    action:     decision.action,
    reason:     decision.reason,
    confidence: decision.confidence,
    source:     'deterministic_rule',
  });

  return decision;
}

// ─── Phase 4 stubs ────────────────────────────────────────────────────────────
// These functions will be implemented in Phase 4.
// They are declared here so the pipeline structure is complete.

// export async function stepExecute(db, ticket, decision) { /* Phase 4 */ }
// export async function stepRespond(db, ticket, executionResult) { /* Phase 4 */ }
// export function stepComplete(db, ticket) { /* Phase 4 */ }

// ─── Full pipeline ────────────────────────────────────────────────────────────

/**
 * Run the full automation pipeline for a ticket.
 *
 * Phase 3 implements: classify → decide
 * Phase 4 will extend: classify → decide → execute → respond → complete
 *
 * This is intended to be called fire-and-forget from POST /api/tickets
 * once Phase 4 is ready. In Phase 3, the pipeline can be driven step-by-step
 * via individual API endpoints.
 *
 * @param {number} ticketId
 */
export async function runPipeline(ticketId) {
  const db = getDb();

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) {
    console.error(`[pipeline] ticket #${ticketId} not found`);
    return;
  }

  console.log(`[pipeline] Starting pipeline for ticket #${ticketId}`);

  // Mark ticket as processing at pipeline start
  patchTicket(db, ticketId, { status: 'processing' });

  try {
    // ── Step 1: Classify ───────────────────────────────────────────────────
    const classification = await stepClassify(db, ticket);
    console.log(`[pipeline] #${ticketId} classified: ${classification.category} / ${classification.priority}`);

    // ── Step 2: Decide ─────────────────────────────────────────────────────
    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    const decision = stepDecide(db, updatedTicket, classification);
    console.log(`[pipeline] #${ticketId} decision: ${decision.action} (${decision.confidence})`);

    // ── Steps 3-5: Execute / Respond / Complete (Phase 4) ─────────────────
    // TODO Phase 4: const executionResult = await stepExecute(db, updatedTicket, decision);
    // TODO Phase 4: await stepRespond(db, updatedTicket, executionResult);
    // TODO Phase 4: stepComplete(db, updatedTicket);

    console.log(`[pipeline] #${ticketId} pipeline complete (Phase 3: classify + decide)`);
  } catch (err) {
    console.error(`[pipeline] #${ticketId} pipeline failed:`, err.message);
    // Ticket is already marked 'failed' by the step that threw.
  }
}
