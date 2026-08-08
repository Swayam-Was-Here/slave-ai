/**
 * test-phase5.js
 * 
 * Phase 5 test script.
 * 
 * Tests the complete automation pipeline including response generation.
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

const BASE = 'http://localhost:3001/api';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'slave.db'));

async function runPhase5Tests() {
  console.log(`\n${BOLD}Phase 5 — Complete Workflow Tests${RESET}\n`);

  // 1. Complete technical incident workflow
  console.log(`${BOLD}Case 1: Technical high-priority -> create_incident -> respond${RESET}`);
  const r1 = await post('/tickets', { subject: 'Database outage', body: 'Prod DB is unreachable critical', customer_name: 'Bob', customer_email: 'bob@example.com' });
  const t1 = r1.data.ticket.id;
  const auto1 = await post(`/tickets/${t1}/automate`);
  assert('POST /automate -> 200', auto1.status, 200);
  assert('action taken was create_incident', auto1.data.executionResult.action, 'create_incident');
  const inc = db.prepare(`SELECT * FROM incidents WHERE ticket_id=?`).get(t1);
  assert('incident created in DB', !!inc, true);
  assert('customer response generated', !!auto1.data.customerResponse, true);
  assert('ticket status is completed', auto1.data.ticket.status, 'completed');
  assert('response source is fallback', auto1.data.responseSource, 'fallback');
  
  // Verify complete audit trail
  const steps = auto1.data.audit_log.map(a => a.step);
  const hasAllSteps = steps.includes('classify') && steps.includes('decide') && steps.includes('execute') && steps.includes('respond') && steps.includes('complete');
  assert('Complete audit trail present', hasAllSteps, true);

  // 2. Billing escalation workflow
  console.log(`\n${BOLD}Case 2: Billing -> escalate -> respond${RESET}`);
  const r2 = await post('/tickets', { subject: 'Refund please', body: 'I want a refund', customer_name: 'Alice', customer_email: 'alice@example.com' });
  const t2 = r2.data.ticket.id;
  db.prepare(`UPDATE tickets SET category='billing', priority='high', department='finance' WHERE id=?`).run(t2);
  const auto2 = await post(`/tickets/${t2}/automate`);
  assert('action taken was escalate', auto2.data.executionResult.action, 'escalate');
  const esc = db.prepare(`SELECT * FROM escalations WHERE ticket_id=?`).get(t2);
  assert('escalation created in DB', !!esc, true);
  assert('response describes escalation', auto2.data.customerResponse.includes('escalated'), true);

  // 3. Account resolution workflow
  console.log(`\n${BOLD}Case 3: Account -> resolve -> respond${RESET}`);
  const r3 = await post('/tickets', { subject: 'Forgot password', body: 'Need password reset', customer_name: 'Charlie', customer_email: 'charlie@example.com' });
  const t3 = r3.data.ticket.id;
  db.prepare(`UPDATE tickets SET category='account', priority='low', department='support' WHERE id=?`).run(t3);
  const auto3 = await post(`/tickets/${t3}/automate`);
  assert('action taken was resolve', auto3.data.executionResult.action, 'resolve');
  assert('ticket completed', auto3.data.ticket.status, 'completed');
  assert('response describes resolution', auto3.data.customerResponse.includes('resolved'), true);

  // 4. Knowledge-base workflow
  console.log(`\n${BOLD}Case 4: Technical how-to -> create_kb -> respond${RESET}`);
  const r4 = await post('/tickets', { subject: 'How to fix bug', body: 'How do I fix this error?', customer_name: 'Dave', customer_email: 'dave@example.com' });
  const t4 = r4.data.ticket.id;
  const auto4 = await post(`/tickets/${t4}/automate`);
  assert('action taken was create_kb', auto4.data.executionResult.action, 'create_kb');
  const kb = db.prepare(`SELECT * FROM knowledge_articles WHERE ticket_id=?`).get(t4);
  assert('KB article created in DB', !!kb, true);
  assert('response mentions KB', auto4.data.customerResponse.includes('knowledge-base'), true);

  // 5. Verify response is generated AFTER execution
  console.log(`\n${BOLD}Case 5: Sequence verification (Execute before Respond)${RESET}`);
  const executeDoneIndex = auto4.data.audit_log.findIndex(a => a.step === 'execute' && a.status === 'done');
  const respondStartedIndex = auto4.data.audit_log.findIndex(a => a.step === 'respond' && a.status === 'started');
  assert('Respond started AFTER Execute done', respondStartedIndex > executeDoneIndex, true);

  // 6. Verify response contains no unsupported action claims
  console.log(`\n${BOLD}Case 6: No unsupported claims in resolve response${RESET}`);
  assert('Resolve response does NOT claim incident', auto3.data.customerResponse.includes('incident'), false);
  
  // 7. Gemini failure -> fallback
  // This is implicitly tested by AI_FALLBACK=true which forces fallback.
  console.log(`\n${BOLD}Case 7: Gemini failure uses fallback${RESET}`);
  assert('Fallback correctly used', auto1.data.responseSource, 'fallback');

  // 8. Execution failure -> no successful response
  console.log(`\n${BOLD}Case 8: Execution failure -> handles gracefully${RESET}`);
  const r8 = await post('/tickets', { subject: 'Test', body: 'Test', customer_name: 'Eve', customer_email: 'eve@example.com' });
  const t8 = r8.data.ticket.id;
  db.prepare(`UPDATE tickets SET status='processing', action_taken='self_destruct' WHERE id=?`).run(t8);
  const exec8 = await post(`/tickets/${t8}/execute`);
  assert('Unsupported action -> 500', exec8.status, 500);
  const respond8 = await post(`/tickets/${t8}/respond`);
  assert('Fallback response generated due to failure', respond8.data.ticket.customer_response.includes('Our team will investigate'), true);

  // 9. Duplicate /automate request -> idempotent
  console.log(`\n${BOLD}Case 9: Duplicate /automate request${RESET}`);
  const auto4_dup = await post(`/tickets/${t4}/automate`);
  assert('Duplicate automate -> 409', auto4_dup.status, 409);
  const kb_count = db.prepare(`SELECT COUNT(*) as c FROM knowledge_articles WHERE ticket_id=?`).get(t4).c;
  assert('Does not create duplicate KB records', kb_count, 1);

  // 11. Verify automation_runs duration
  console.log(`\n${BOLD}Case 11: Automation run duration recorded${RESET}`);
  assert('Automation run has duration_ms', auto1.data.automation_run.duration_ms >= 0, true);
  
  // 12. DEMO SCENARIO
  console.log(`\n${BOLD}Case 12: Single API Call Demo${RESET}`);
  const rDemo = await post('/tickets', { 
    subject: 'Internet down since yesterday', 
    body: 'Hi, my internet has been completely down since yesterday and I have an important meeting tomorrow.', 
    customer_name: 'Zoe', 
    customer_email: 'zoe@example.com' 
  });
  const tDemo = rDemo.data.ticket.id;
  const autoDemo = await post(`/tickets/${tDemo}/automate`);
  
  assert('Demo POST /automate -> 200', autoDemo.status, 200);
  assert('Demo Classification is technical', autoDemo.data.classification.category, 'technical');
  assert('Demo Decision is create_incident', autoDemo.data.decision.action, 'create_incident');
  assert('Demo Execution created incident', autoDemo.data.executionResult.action, 'create_incident');
  const demoInc = db.prepare(`SELECT * FROM incidents WHERE ticket_id=?`).get(tDemo);
  assert('Demo Incident exists in DB', !!demoInc, true);
  assert('Demo Customer response generated', !!autoDemo.data.customerResponse, true);
  assert('Demo Final state is completed', autoDemo.data.ticket.status, 'completed');

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${BOLD}Phase 5 Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : ''}${failed} failed${RESET}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error(`\n${RED}Tests failed to run:${RESET}`, err.message);
  process.exit(1);
});
