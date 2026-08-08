/**
 * server/automation/actions/escalate.js
 */

export function executeEscalate(db, ticket, decision) {
  const result = db.prepare(`
    INSERT INTO escalations (ticket_id, department, priority, reason, status)
    VALUES (?, ?, ?, ?, 'open')
  `).run(
    ticket.id,
    ticket.department || 'support',
    ticket.priority || 'medium',
    decision.reason
  );

  // We consider the automation successfully completed since we successfully handed off the ticket.
  db.prepare(`UPDATE tickets SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);

  return {
    action: 'escalate',
    result: `Escalation ESC-${result.lastInsertRowid} created for ${ticket.department || 'support'} team.`,
    escalation_id: result.lastInsertRowid,
    department: ticket.department || 'support',
    timestamp: new Date().toISOString()
  };
}
