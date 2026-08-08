/**
 * test-phase4.js
 * 
 * Phase 4 test script.
 * 
 * Tests the execution engine and the full /automate flow.
 * Uses AI_FALLBACK=true to test deterministically without hitting the real LLM.
 */

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0;
let failed = 0;

function assert(label, got, expected) {
  if (got === expected) {
    console.log(`  ${GREEN}✓${RESET} ${label}`);
    passed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${label} — expected ${YELLOW}${expected}${RESET} got ${RED}${got}${RESET}`);
    failed++;
  }
}

const TEST_PORT = process.env.TEST_PORT || 3001;
const BASE = `http://localhost:${TEST_PORT}/api`;

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, data: await r.json() };
}

// Access SQLite directly to check if tables exist/records were created correctly
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, 'slave.db');
const db = new Database(DB_PATH);

async function runPhase4Tests() {
  console.log(`\n${BOLD}Phase 4 — Execution & Automate Tests${RESET}\n`);

  // 1. Technical high-priority ticket -> create_incident
  console.log(`${BOLD}Case 1: Technical high-priority -> create_incident${RESET}`);
  const r1 = await post('/tickets', { subject: 'Database down', body: 'Prod DB is unreachable', customer_name: 'Bob', customer_email: 'bob@example.com' });
  const t1 = r1.data.ticket.id;
  await post(`/tickets/${t1}/analyze`);
  // Overwrite classification in DB to ensure it hits our deterministic rule
  db.prepare(`UPDATE tickets SET category='technical', priority='critical', department='engineering' WHERE id=?`).run(t1);
  await post(`/tickets/${t1}/decide`);
  const exec1 = await post(`/tickets/${t1}/execute`);
  assert('POST /execute -> 200', exec1.status, 200);
  assert('action taken was create_incident', exec1.data.executionResult.action, 'create_incident');
  const inc = db.prepare(`SELECT * FROM incidents WHERE ticket_id=?`).get(t1);
  assert('incident created in DB', !!inc, true);
  assert('ticket status is completed', exec1.data.ticket.status, 'completed');

  // 2. Billing ticket -> escalate
  console.log(`\n${BOLD}Case 2: Billing -> escalate${RESET}`);
  const r2 = await post('/tickets', { subject: 'Refund please', body: 'I want a refund', customer_name: 'Alice', customer_email: 'alice@example.com' });
  const t2 = r2.data.ticket.id;
  await post(`/tickets/${t2}/analyze`);
  db.prepare(`UPDATE tickets SET category='billing', priority='high', department='finance' WHERE id=?`).run(t2);
  await post(`/tickets/${t2}/decide`);
  const exec2 = await post(`/tickets/${t2}/execute`);
  assert('POST /execute -> 200', exec2.status, 200);
  assert('action taken was escalate', exec2.data.executionResult.action, 'escalate');
  const esc = db.prepare(`SELECT * FROM escalations WHERE ticket_id=?`).get(t2);
  assert('escalation created in DB', !!esc, true);

  // 3. Simple account ticket -> resolve
  console.log(`\n${BOLD}Case 3: Account -> resolve${RESET}`);
  const r3 = await post('/tickets', { subject: 'Forgot password', body: 'Need password reset', customer_name: 'Charlie', customer_email: 'charlie@example.com' });
  const t3 = r3.data.ticket.id;
  await post(`/tickets/${t3}/analyze`);
  db.prepare(`UPDATE tickets SET category='account', priority='low', department='support' WHERE id=?`).run(t3);
  await post(`/tickets/${t3}/decide`);
  const exec3 = await post(`/tickets/${t3}/execute`);
  assert('POST /execute -> 200', exec3.status, 200);
  assert('action taken was resolve', exec3.data.executionResult.action, 'resolve');
  
  // 4. Low-priority technical how-to -> create_kb
  console.log(`\n${BOLD}Case 4: Technical how-to -> create_kb${RESET}`);
  const r4 = await post('/tickets', { subject: 'How to use API', body: 'How do I authenticate?', customer_name: 'Dave', customer_email: 'dave@example.com' });
  const t4 = r4.data.ticket.id;
  await post(`/tickets/${t4}/analyze`);
  db.prepare(`UPDATE tickets SET category='technical', priority='low', department='engineering', intent='how-to' WHERE id=?`).run(t4);
  await post(`/tickets/${t4}/decide`);
  const exec4 = await post(`/tickets/${t4}/execute`);
  assert('POST /execute -> 200', exec4.status, 200);
  assert('action taken was create_kb', exec4.data.executionResult.action, 'create_kb');
  const kb = db.prepare(`SELECT * FROM knowledge_articles WHERE ticket_id=?`).get(t4);
  assert('KB article created in DB', !!kb, true);

  // 5. Duplicate execute request -> idempotent / rejected
  console.log(`\n${BOLD}Case 5: Duplicate execute${RESET}`);
  const exec4_dup = await post(`/tickets/${t4}/execute`);
  assert('Duplicate execute -> 409 (Conflict)', exec4_dup.status, 409);
  const kb_count = db.prepare(`SELECT COUNT(*) as c FROM knowledge_articles WHERE ticket_id=?`).get(t4).c;
  assert('Does not create duplicate records', kb_count, 1);

  // 6. Execute before decision
  console.log(`\n${BOLD}Case 6: Execute before decision${RESET}`);
  const r6 = await post('/tickets', { subject: 'Test', body: 'Test', customer_name: 'Eve', customer_email: 'eve@example.com' });
  const exec6 = await post(`/tickets/${r6.data.ticket.id}/execute`);
  assert('Execute before decision -> 422', exec6.status, 422);

  // 7. Automate complete flow
  console.log(`\n${BOLD}Case 7: Automate complete flow${RESET}`);
  const r7 = await post('/tickets', { subject: 'Refund please', body: 'I want a refund', customer_name: 'Frank', customer_email: 'frank@example.com' });
  const t7 = r7.data.ticket.id;
  const auto7 = await post(`/tickets/${t7}/automate`);
  assert('POST /automate -> 200', auto7.status, 200);
  assert('executionResult present', !!auto7.data.executionResult, true);
  assert('Ticket status is completed', auto7.data.ticket.status, 'completed');
  assert('Automation run status is completed', auto7.data.automation_run.status, 'completed');
  
  // 8. Unsupported action
  console.log(`\n${BOLD}Case 8: Unsupported action${RESET}`);
  const r8 = await post('/tickets', { subject: 'Test', body: 'Test', customer_name: 'Grace', customer_email: 'grace@example.com' });
  const t8 = r8.data.ticket.id;
  db.prepare(`UPDATE tickets SET status='processing', action_taken='self_destruct' WHERE id=?`).run(t8);
  const exec8 = await post(`/tickets/${t8}/execute`);
  assert('Unsupported action -> 500', exec8.status, 500);
  const run8 = db.prepare(`SELECT * FROM automation_runs WHERE ticket_id=? ORDER BY id DESC LIMIT 1`).get(t8);
  assert('Automation run marked as failed', run8.status, 'failed');
  assert('Error message stored in run', !!run8.error, true);
  
  const audit8 = db.prepare(`SELECT * FROM audit_log WHERE ticket_id=? AND step='execute' AND status='error'`).get(t8);
  assert('Audit error recorded', !!audit8, true);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${BOLD}Phase 4 Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : ''}${failed} failed${RESET}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error(`\n${RED}Tests failed to run:${RESET}`, err.message);
  process.exit(1);
});
