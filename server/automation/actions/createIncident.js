/**
 * server/automation/actions/createIncident.js
 */

export function executeCreateIncident(db, ticket, decision) {
  const title = `Incident from Ticket #${ticket.id}: ${ticket.summary || ticket.subject}`;
  const description = `Automated incident created from ticket #${ticket.id}.\n\nSubject: ${ticket.subject}\nBody: ${ticket.body}\nIntent: ${ticket.intent}`;

  const result = db.prepare(`
    INSERT INTO incidents (ticket_id, title, department, priority, description, status)
    VALUES (?, ?, ?, ?, ?, 'open')
  `).run(
    ticket.id,
    title,
    ticket.department || 'engineering',
    ticket.priority || 'high',
    description
  );

  // We consider the automation successfully completed since we successfully handed off the ticket.
  db.prepare(`UPDATE tickets SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);

  return {
    action: 'create_incident',
    result: `Incident INC-${result.lastInsertRowid} created.`,
    incident_id: result.lastInsertRowid,
    department: ticket.department || 'engineering',
    timestamp: new Date().toISOString()
  };
}
