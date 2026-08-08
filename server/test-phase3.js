/**
 * test-phase3.js
 *
 * Phase 3 test script.
 * Tests two layers:
 *   1. Unit tests — decideAction() called directly (no server, no API key)
 *   2. Integration tests — full HTTP flow via the running server (uses AI_FALLBACK=true)
 *
 * Run:
 *   node test-phase3.js               (integration — requires server on :3001)
 *   node test-phase3.js --unit-only   (unit tests only — no server required)
 */

import { decideAction } from './automation/decide.js';

// ─── Colour helpers ───────────────────────────────────────────────────────────
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
    console.log(`  ${RED}✗${RESET} ${label}`);
    console.log(`    expected: ${YELLOW}${expected}${RESET}`);
    console.log(`    got:      ${RED}${got}${RESET}`);
    failed++;
  }
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

console.log(`\n${BOLD}Phase 3 — Decision Engine Unit Tests${RESET}\n`);

// ── Case 1: Outage ────────────────────────────────────────────────────────────
console.log('Case 1: API outage (technical/critical)');
{
  const r = decideAction({
    category: 'technical', priority: 'critical', department: 'engineering',
    intent: 'Customer cannot access the API at all — complete outage affecting the whole team',
    summary: 'Critical API outage blocking product launch',
    recommended_action: 'escalate',  // LLM says escalate — engine overrides to create_incident
  });
  assert('action = create_incident', r.action, 'create_incident');
  assert('confidence = high', r.confidence, 'high');
}

// ── Case 2: High-priority technical ──────────────────────────────────────────
console.log('\nCase 2: Internet/network issue (technical/high)');
{
  const r = decideAction({
    category: 'technical', priority: 'high', department: 'engineering',
    intent: 'Internet is completely down and customer has important meeting tomorrow',
    summary: 'Internet outage reported, critical meeting affected',
    recommended_action: 'create_incident',
  });
  assert('action = create_incident', r.action, 'create_incident');
  assert('confidence = high', r.confidence, 'high');
}

// ── Case 3: Billing ───────────────────────────────────────────────────────────
console.log('\nCase 3: Charged twice (billing)');
{
  const r = decideAction({
    category: 'billing', priority: 'high', department: 'finance',
    intent: 'Customer was charged twice for the same payment and wants a refund',
    summary: 'Duplicate charge on account, customer requesting refund',
    recommended_action: 'resolve',  // LLM says resolve — billing always escalates
  });
  assert('action = escalate', r.action, 'escalate');
  assert('confidence = high', r.confidence, 'high');
}

// ── Case 4: Refund (treated same as billing) ──────────────────────────────────
console.log('\nCase 4: Refund request (refund category)');
{
  const r = decideAction({
    category: 'refund', priority: 'medium', department: 'finance',
    intent: 'Customer wants a refund for a cancelled subscription',
    summary: 'Subscription cancellation refund request',
    recommended_action: 'resolve',
  });
  assert('action = escalate (refund always escalates)', r.action, 'escalate');
}

// ── Case 5: Forgot password ───────────────────────────────────────────────────
console.log('\nCase 5: Forgot password (account/low)');
{
  const r = decideAction({
    category: 'account', priority: 'low', department: 'support',
    intent: 'Customer forgot their password and needs help resetting it',
    summary: 'Password reset request',
    recommended_action: 'resolve',
  });
  assert('action = resolve', r.action, 'resolve');
  assert('confidence = high', r.confidence, 'high');
}

// ── Case 6: Suspicious account activity ──────────────────────────────────────
console.log('\nCase 6: Suspicious account activity (account/medium)');
{
  const r = decideAction({
    category: 'account', priority: 'medium', department: 'support',
    intent: 'Customer reports suspicious unauthorized login attempts on their account',
    summary: 'Unauthorized login attempts detected',
    recommended_action: 'resolve',  // LLM wrong — engine detects security keywords
  });
  assert('action = escalate (security concern)', r.action, 'escalate');
}

// ── Case 7: Delayed package ───────────────────────────────────────────────────
console.log('\nCase 7: Package delayed for several days (delivery)');
{
  const r = decideAction({
    category: 'delivery', priority: 'medium', department: 'operations',
    intent: 'Package has not arrived and has been delayed for several days',
    summary: 'Delayed delivery, package missing',
    recommended_action: 'resolve',  // LLM wrong — delivery always escalates
  });
  assert('action = escalate', r.action, 'escalate');
  assert('confidence = high', r.confidence, 'high');
}

// ── Case 8: Informational question (general) ──────────────────────────────────
console.log('\nCase 8: Simple how-to question (general/low)');
{
  const r = decideAction({
    category: 'general', priority: 'low', department: 'support',
    intent: 'How do I export my data as a CSV file?',
    summary: 'Informational request about data export feature',
    recommended_action: 'create_kb',
  });
  assert('action = resolve (informational)', r.action, 'resolve');
}

// ── Case 9: Ambiguous general request ────────────────────────────────────────
console.log('\nCase 9: Ambiguous/unclear request (general/medium)');
{
  const r = decideAction({
    category: 'general', priority: 'medium', department: 'support',
    intent: 'Something is wrong but the customer is not sure what',
    summary: 'Vague complaint about the product',
    recommended_action: 'escalate',
  });
  assert('action = escalate (ambiguous, cannot safely auto-resolve)', r.action, 'escalate');
}

// ── Case 10: Invalid LLM recommendation ──────────────────────────────────────
console.log('\nCase 10: Invalid LLM recommendation (hallucinated action)');
{
  const r = decideAction({
    category: 'account', priority: 'low', department: 'support',
    intent: 'Customer wants to update their profile information',
    summary: 'Profile update request',
    recommended_action: 'send_email',  // Hallucinated — not a valid action
  });
  assert('action = resolve (invalid LLM action ignored)', r.action, 'resolve');
}

// ── Case 11: Unknown/null category ───────────────────────────────────────────
console.log('\nCase 11: Unknown category → safe default');
{
  const r = decideAction({
    category: 'unknown_category', priority: 'medium', department: 'support',
    intent: 'Something unexpected',
    summary: 'Unknown issue type',
    recommended_action: 'resolve',
  });
  assert('action = escalate (unknown category → safe default)', r.action, 'escalate');
}

// ── Case 12: Critical account → escalate even for simple text ────────────────
console.log('\nCase 12: Critical priority account issue');
{
  const r = decideAction({
    category: 'account', priority: 'critical', department: 'support',
    intent: 'Cannot log in, account appears deleted',
    summary: 'Critical account access failure',
    recommended_action: 'resolve',
  });
  assert('action = escalate (critical priority)', r.action, 'escalate');
}

// ── Case 13: Technical/low → create_kb for how-to ────────────────────────────
console.log('\nCase 13: Technical how-to question (technical/low)');
{
  const r = decideAction({
    category: 'technical', priority: 'low', department: 'engineering',
    intent: 'How do I use the REST API authentication?',
    summary: 'API authentication documentation question',
    recommended_action: 'create_kb',
  });
  assert('action = create_kb (informational technical)', r.action, 'create_kb');
}

// ── Case 14: Technical/medium non-informational → resolve ────────────────────
console.log('\nCase 14: Technical minor bug (technical/medium)');
{
  const r = decideAction({
    category: 'technical', priority: 'medium', department: 'engineering',
    intent: 'Button on the settings page has a minor cosmetic glitch',
    summary: 'Minor UI cosmetic bug',
    recommended_action: 'resolve',
  });
  assert('action = resolve (low-priority tech, not informational)', r.action, 'resolve');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}${BOLD}, ${failed > 0 ? RED : ''}${failed} failed${RESET}`);
if (failed > 0) {
  console.log(`${RED}Some unit tests failed. Fix decide.js before proceeding.${RESET}`);
  process.exit(1);
} else {
  console.log(`${GREEN}All unit tests passed.${RESET}`);
}

// ─── Integration tests ────────────────────────────────────────────────────────

if (process.argv.includes('--unit-only')) {
  process.exit(0);
}

console.log(`\n${BOLD}Phase 3 — Integration Tests (HTTP API, AI_FALLBACK=true)${RESET}`);
console.log('Make sure the server is running with AI_FALLBACK=true on :3001\n');

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

// Access SQLite directly to verify DB state
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, 'slave.db');
const db = new Database(DB_PATH);

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, data: await r.json() };
}

const TICKETS = [
  {
    label:           'Case 1: API outage (technical/critical → create_incident)',
    subject:         'Complete API outage — all requests failing with 500',
    body:            'Since 2 hours ago every API call returns 500. Our entire team is blocked and we have a product demo in 1 hour. This is critical.',
    customer_name:   'James Okonkwo',
    customer_email:  'james@techstartup.io',
    expectedCategory:'technical',
    expectedAction:  'create_incident',
  },
  {
    label:           'Case 2: Charged twice (billing → escalate)',
    subject:         'Charged twice for my subscription',
    body:            'I was charged $49 twice on August 1st. My account shows only one subscription. Please refund the duplicate charge.',
    customer_name:   'Sarah Chen',
    customer_email:  'sarah@example.com',
    expectedCategory: null,          // fallback may return 'billing' or 'refund' — both are correct
    expectedAction:  'escalate',     // both billing and refund always escalate
  },
  {
    label:           'Case 3: Forgot password (account → resolve)',
    subject:         'Cannot remember my password',
    body:            'I forgot my password and the reset email is not arriving. Can you help me reset it?',
    customer_name:   'Priya Sharma',
    customer_email:  'priya@example.com',
    expectedCategory:'account',
    expectedAction:  'resolve',
  },
  {
    label:           'Case 4: Package delayed (delivery → escalate)',
    subject:         'Order not arrived — delayed by 5 days',
    body:            'My package was supposed to arrive last Tuesday. It has now been delayed for 5 days and the tracking shows no updates.',
    customer_name:   'Ali Hassan',
    customer_email:  'ali@example.com',
    expectedCategory:'delivery',
    expectedAction:  'escalate',
  },
  {
    label:           'Case 5: How-to question (general → resolve)',
    subject:         'How do I export my data as a CSV?',
    body:            'Hi, I would like to know how to export all my project data as a CSV file. No rush, just whenever you get a chance.',
    customer_name:   'Emma Wilson',
    customer_email:  'emma@example.com',
    expectedCategory:'general',
    expectedAction:  'resolve',
  },
];

let intPassed = 0;
let intFailed = 0;

function iAssert(label, got, expected) {
  if (got === expected) {
    console.log(`  ${GREEN}✓${RESET} ${label}`);
    intPassed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${label} — expected ${YELLOW}${expected}${RESET} got ${RED}${got}${RESET}`);
    intFailed++;
  }
}

async function runIntegrationTests() {
  for (const tc of TICKETS) {
    console.log(`\n${BOLD}${tc.label}${RESET}`);

    // 1. Create ticket
    const { status: s1, data: d1 } = await post('/tickets', {
      subject: tc.subject, body: tc.body,
      customer_name: tc.customer_name, customer_email: tc.customer_email,
    });
    iAssert('POST /tickets → 201', s1, 201);
    const ticketId = d1.ticket?.id;

    if (!ticketId) {
      console.log(`  ${RED}✗ Could not create ticket — skipping${RESET}`);
      intFailed++;
      continue;
    }

    // 2. Analyze (classify)
    const { status: s2, data: d2 } = await post(`/tickets/${ticketId}/analyze`, {});
    iAssert('POST /analyze → 200', s2, 200);
    if (tc.expectedCategory) {
      iAssert(`category = ${tc.expectedCategory}`, d2.ticket?.category, tc.expectedCategory);
    }

    // 3. Decide
    const { status: s3, data: d3 } = await post(`/tickets/${ticketId}/decide`, {});
    iAssert('POST /decide → 200', s3, 200);
    iAssert(`action = ${tc.expectedAction}`, d3.decision?.action, tc.expectedAction);
    iAssert('action_taken stored in DB', d3.ticket?.action_taken, tc.expectedAction);
    iAssert('audit log has entries', Array.isArray(d3.audit_log) && d3.audit_log.length >= 4, true);

    const decideAudit = d3.audit_log.filter(e => e.step === 'decide');
    iAssert('decide audit: started + done entries', decideAudit.length, 2);

    // 4. Verify GET /tickets/:id reflects the decision
    const { data: d4 } = await get(`/tickets/${ticketId}`);
    iAssert('GET /:id shows action_taken', d4.ticket?.action_taken, tc.expectedAction);
  }

  // ── Guard: decide before classify ────────────────────────────────────────
  console.log(`\n${BOLD}Guard: decide on unclassified ticket → 422${RESET}`);
  const { status: sg1, data: dg1 } = await post('/tickets', {
    subject: 'Test', body: 'Test body', customer_name: 'Test User', customer_email: 'test@example.com',
  });
  const unclassifiedId = dg1.ticket?.id;
  const { status: sg2 } = await post(`/tickets/${unclassifiedId}/decide`, {});
  iAssert('Unclassified ticket → 422', sg2, 422);

  // ── Guard: non-existent ticket ────────────────────────────────────────────
  console.log(`\n${BOLD}Guard: decide on non-existent ticket → 404${RESET}`);
  const { status: sg3 } = await post('/tickets/99999/decide', {});
  iAssert('Non-existent ticket → 404', sg3, 404);

  // ── Guard: double-decide is idempotent (200, overwrites with same result) ─
  console.log(`\n${BOLD}Guard: double-decide (idempotent)${RESET}`);
  const { status: s4, data: d5 } = await post('/tickets', {
    subject: 'Billing question', body: 'I was charged wrong amount.',
    customer_name: 'X User', customer_email: 'x@example.com',
  });
  const doubleId = d5.ticket?.id;
  await post(`/tickets/${doubleId}/analyze`, {});
  const { status: sd1 } = await post(`/tickets/${doubleId}/decide`, {});
  const { status: sd2, data: dd2 } = await post(`/tickets/${doubleId}/decide`, {});
  iAssert('Second decide → 200 (idempotent)', sd2, 200);
  iAssert('Action still consistent on second decide', dd2.decision?.action, 'escalate');

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${BOLD}Integration Results: ${GREEN}${intPassed} passed${RESET}${BOLD}, ${intFailed > 0 ? RED : ''}${intFailed} failed${RESET}`);
}

runIntegrationTests().catch((err) => {
  console.error(`\n${RED}Integration tests failed to run:${RESET}`, err.message);
  console.error('Is the server running on :3001 with AI_FALLBACK=true?');
  process.exit(1);
});
