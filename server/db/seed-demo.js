import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'slave.db');

// Ensure db exists
if (!fs.existsSync(dbPath)) {
  console.log('Database not found, creating from schema...');
  const db = new Database(dbPath);
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  db.close();
}

const db = new Database(dbPath);

console.log('Clearing existing records...');
db.exec('PRAGMA foreign_keys = OFF;');
db.exec('DELETE FROM incidents');
db.exec('DELETE FROM escalations');
db.exec('DELETE FROM knowledge_articles');
db.exec('DELETE FROM audit_log');
db.exec('DELETE FROM automation_runs');
db.exec('DELETE FROM tickets');
db.exec('PRAGMA foreign_keys = ON;');

console.log('Seeding clean demo database...');

const now = new Date();
const formatTime = (minusMinutes, minusSeconds = 0) => {
  const d = new Date(now.getTime() - (minusMinutes * 60000) - (minusSeconds * 1000));
  return d.toISOString();
};

const insertTicket = db.prepare(`
  INSERT INTO tickets 
    (subject, body, customer_name, customer_email, status, priority, category, department, summary, intent, recommended_action, analysis_source, action_taken, action_detail, customer_response, created_at, updated_at) 
  VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAuditLog = db.prepare(`
  INSERT INTO audit_log (ticket_id, step, status, detail, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const insertRun = db.prepare(`
  INSERT INTO automation_runs (ticket_id, status, started_at, completed_at, duration_ms, error)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertIncident = db.prepare(`
  INSERT INTO incidents (ticket_id, title, department, priority, description, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertEscalation = db.prepare(`
  INSERT INTO escalations (ticket_id, department, priority, reason, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertKB = db.prepare(`
  INSERT INTO knowledge_articles (ticket_id, title, content, status, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

// -----------------------------------------------------------------------------
// CASE 1: Internet completely down
// -----------------------------------------------------------------------------
const c1_created = formatTime(120);
const c1_updated = formatTime(119, 58);

const t1 = insertTicket.run(
  'Internet completely down',
  'My internet has been completely down since yesterday and I have an important meeting tomorrow.',
  'Zoe Martin',
  'zoe@example.com',
  'completed',
  'critical',
  'technical',
  'engineering',
  'Customer reports complete internet outage.',
  'Restore internet connection',
  'create_incident',
  'gemini',
  'create_incident',
  JSON.stringify({ incident_id: 1, department: 'engineering', priority: 'critical' }),
  "Hi Zoe,\n\nWe've identified this as a high-priority network issue and created incident INC-001 with our engineering team. Your request has been escalated for immediate investigation.\n\nWe'll keep the case updated as it progresses.",
  c1_created,
  c1_updated
);

insertAuditLog.run(t1.lastInsertRowid, 'classify', 'done', '{"source":"gemini"}', formatTime(119, 59));
insertAuditLog.run(t1.lastInsertRowid, 'decide', 'done', '{"action":"create_incident"}', formatTime(119, 59));
insertAuditLog.run(t1.lastInsertRowid, 'execute', 'done', '{"incident_id":1}', formatTime(119, 58));
insertAuditLog.run(t1.lastInsertRowid, 'respond', 'done', '{"response_generated":true}', formatTime(119, 58));
insertAuditLog.run(t1.lastInsertRowid, 'complete', 'done', '{"status":"completed"}', formatTime(119, 58));

insertRun.run(t1.lastInsertRowid, 'completed', c1_created, c1_updated, 1820, null);
insertIncident.run(t1.lastInsertRowid, 'Internet completely down', 'engineering', 'critical', 'Customer reports complete internet outage.', 'open', c1_created);

// -----------------------------------------------------------------------------
// CASE 2: I was charged twice
// -----------------------------------------------------------------------------
const c2_created = formatTime(85);
const c2_updated = formatTime(84, 58);

const t2 = insertTicket.run(
  'I was charged twice',
  'I looked at my bank statement and saw two charges for $49.99 on the same day. Can you refund one of them?',
  'Marcus Webb',
  'marcus.webb@example.com',
  'completed',
  'high',
  'billing',
  'finance',
  'Customer reports duplicate charge of $49.99.',
  'Refund duplicate charge',
  'escalate',
  'gemini',
  'escalate',
  JSON.stringify({ escalation_id: 1, department: 'finance', priority: 'high' }),
  "Hi Marcus,\n\nI apologize for the duplicate charge on your account. I have escalated this issue to our finance department for immediate review and processing of your refund.\n\nYou should hear back from them shortly.",
  c2_created,
  c2_updated
);

insertAuditLog.run(t2.lastInsertRowid, 'classify', 'done', '{"source":"gemini"}', formatTime(84, 59));
insertAuditLog.run(t2.lastInsertRowid, 'decide', 'done', '{"action":"escalate"}', formatTime(84, 59));
insertAuditLog.run(t2.lastInsertRowid, 'execute', 'done', '{"escalation_id":1}', formatTime(84, 58));
insertAuditLog.run(t2.lastInsertRowid, 'respond', 'done', '{"response_generated":true}', formatTime(84, 58));
insertAuditLog.run(t2.lastInsertRowid, 'complete', 'done', '{"status":"completed"}', formatTime(84, 58));

insertRun.run(t2.lastInsertRowid, 'completed', c2_created, c2_updated, 1420, null);
insertEscalation.run(t2.lastInsertRowid, 'finance', 'high', 'Customer requires refund for duplicate charge.', 'open', c2_created);

// -----------------------------------------------------------------------------
// CASE 3: I forgot my password
// -----------------------------------------------------------------------------
const c3_created = formatTime(42);
const c3_updated = formatTime(41, 59);

const t3 = insertTicket.run(
  'I forgot my password',
  'I am trying to log in but I completely forgot my password. How do I reset it?',
  'Sarah Jenkins',
  'sarah.j@example.com',
  'completed',
  'medium',
  'account',
  'support',
  'Customer needs password reset.',
  'Reset password',
  'resolve',
  'gemini',
  'resolve',
  JSON.stringify({ status: 'resolved' }),
  "Hi Sarah,\n\nNo problem! You can securely reset your password by clicking the 'Forgot Password' link on the login page. An email with a reset link will be sent to you immediately.\n\nLet me know if you need any further assistance.",
  c3_created,
  c3_updated
);

insertAuditLog.run(t3.lastInsertRowid, 'classify', 'done', '{"source":"gemini"}', formatTime(41, 59));
insertAuditLog.run(t3.lastInsertRowid, 'decide', 'done', '{"action":"resolve"}', formatTime(41, 59));
insertAuditLog.run(t3.lastInsertRowid, 'execute', 'done', '{"status":"resolved"}', formatTime(41, 59));
insertAuditLog.run(t3.lastInsertRowid, 'respond', 'done', '{"response_generated":true}', formatTime(41, 59));
insertAuditLog.run(t3.lastInsertRowid, 'complete', 'done', '{"status":"completed"}', formatTime(41, 59));

insertRun.run(t3.lastInsertRowid, 'completed', c3_created, c3_updated, 820, null);

// -----------------------------------------------------------------------------
// CASE 4: How do I configure the VPN?
// -----------------------------------------------------------------------------
const c4_created = formatTime(15);
const c4_updated = formatTime(14, 58);

const t4 = insertTicket.run(
  'How do I configure the VPN?',
  'I just got a new laptop and need to set up the company VPN. Can you send me the instructions?',
  'David Chen',
  'd.chen@example.com',
  'completed',
  'low',
  'technical',
  'operations',
  'Customer requesting VPN setup instructions.',
  'Provide VPN configuration guide',
  'create_kb',
  'gemini',
  'create_kb',
  JSON.stringify({ kb_id: 1, department: 'operations' }),
  "Hi David,\n\nI have generated a new knowledge base article detailing the step-by-step process for configuring the company VPN on your new laptop. You can access it in the internal wiki.\n\nPlease let me know if you run into any issues during setup.",
  c4_created,
  c4_updated
);

insertAuditLog.run(t4.lastInsertRowid, 'classify', 'done', '{"source":"gemini"}', formatTime(14, 59));
insertAuditLog.run(t4.lastInsertRowid, 'decide', 'done', '{"action":"create_kb"}', formatTime(14, 59));
insertAuditLog.run(t4.lastInsertRowid, 'execute', 'done', '{"kb_id":1}', formatTime(14, 58));
insertAuditLog.run(t4.lastInsertRowid, 'respond', 'done', '{"response_generated":true}', formatTime(14, 58));
insertAuditLog.run(t4.lastInsertRowid, 'complete', 'done', '{"status":"completed"}', formatTime(14, 58));

insertRun.run(t4.lastInsertRowid, 'completed', c4_created, c4_updated, 1950, null);
insertKB.run(t4.lastInsertRowid, 'VPN Configuration Guide', '# VPN Setup\n\n1. Download the client\n2. Enter the server address\n3. Login with SSO', 'draft', c4_created);

console.log('Database successfully seeded with demo dataset.');
db.close();
