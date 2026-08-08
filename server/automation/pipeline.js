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

import { executeAction }   from './execute.js';
import { generateResponse } from './respond.js';

// ─── Phase 4 ──────────────────────────────────────────────────────────────────

/**
 * Step 3: Execute Action
 */
export function stepExecute(db, ticket, decision) {
  writeAudit(db, ticket.id, 'execute', 'started', { action: decision.action });

  let result;
  try {
    result = executeAction(db, ticket, decision);
  } catch (err) {
    writeAudit(db, ticket.id, 'execute', 'error', { error: err.message });
    patchTicket(db, ticket.id, { status: 'failed' });
    throw err;
  }

  writeAudit(db, ticket.id, 'execute', 'done', result);
  return result;
}

// ─── Phase 5 ──────────────────────────────────────────────────────────────────

/**
 * Step 4: Respond
 * Generates the customer-facing response based on the execution result.
 */
export async function stepRespond(db, ticket, executionResult) {
  writeAudit(db, ticket.id, 'respond', 'started');

  let responseData;
  try {
    responseData = await generateResponse(ticket, executionResult);
  } catch (err) {
    writeAudit(db, ticket.id, 'respond', 'error', { error: err.message });
    patchTicket(db, ticket.id, { status: 'failed' });
    throw err;
  }

  // Store response in DB
  patchTicket(db, ticket.id, {
    customer_response: responseData.customerResponse,
    response_source: responseData.responseSource
  });

  writeAudit(db, ticket.id, 'respond', 'done', {
    source: responseData.responseSource,
    response_length: responseData.customerResponse.length
  });

  return responseData;
}

/**
 * Step 5: Complete
 * Finalizes the pipeline. (Status is actually already set to 'completed' by the execute action, 
 * but this serves as a final pipeline checkpoint).
 */
export function stepComplete(db, ticket) {
  writeAudit(db, ticket.id, 'complete', 'done', { status: 'Pipeline fully executed' });
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

/**
 * Run the full automation pipeline for a ticket.
 *
 * Phase 5 implements: classify → decide → execute → respond → complete
 *
 * @param {number} ticketId
 */
export async function runPipeline(ticketId) {
  const db = getDb();

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) {
    console.error(`[pipeline] ticket #${ticketId} not found`);
    return null;
  }

  console.log(`[pipeline] Starting pipeline for ticket #${ticketId}`);

  const runResult = db.prepare(
    `INSERT INTO automation_runs (ticket_id, status) VALUES (?, 'running')`
  ).run(ticketId);
  const runId = runResult.lastInsertRowid;
  const startTime = Date.now();

  patchTicket(db, ticketId, { status: 'processing' });

  try {
    // ── Step 1: Classify ───────────────────────────────────────────────────
    const classification = await stepClassify(db, ticket);
    console.log(`[pipeline] #${ticketId} classified: ${classification.category} / ${classification.priority}`);

    // ── Step 2: Decide ─────────────────────────────────────────────────────
    const ticketAfterClassify = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    const decision = stepDecide(db, ticketAfterClassify, classification);
    console.log(`[pipeline] #${ticketId} decision: ${decision.action} (${decision.confidence})`);

    // ── Step 3: Execute ────────────────────────────────────────────────────
    const ticketAfterDecide = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    const executionResult = stepExecute(db, ticketAfterDecide, decision);
    console.log(`[pipeline] #${ticketId} executed:`, executionResult.result);

    // ── Step 4: Respond ────────────────────────────────────────────────────
    const ticketAfterExecute = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    const responseData = await stepRespond(db, ticketAfterExecute, executionResult);
    console.log(`[pipeline] #${ticketId} responded via ${responseData.responseSource}`);

    // ── Step 5: Complete ───────────────────────────────────────────────────
    const ticketAfterRespond = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    stepComplete(db, ticketAfterRespond);

    const duration = Date.now() - startTime;
    db.prepare(`
      UPDATE automation_runs 
      SET status = 'completed', completed_at = datetime('now'), duration_ms = ? 
      WHERE id = ?
    `).run(duration, runId);

    console.log(`[pipeline] #${ticketId} pipeline complete in ${duration}ms`);
    return {
       ticket: db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId),
       classification,
       decision,
       executionResult,
       customerResponse: responseData.customerResponse,
       responseSource: responseData.responseSource
    };
  } catch (err) {
    console.error(`[pipeline] #${ticketId} pipeline failed:`, err.message);
    const duration = Date.now() - startTime;
    db.prepare(`
      UPDATE automation_runs 
      SET status = 'failed', completed_at = datetime('now'), duration_ms = ?, error = ? 
      WHERE id = ?
    `).run(duration, err.message, runId);
    return null;
  }
}
