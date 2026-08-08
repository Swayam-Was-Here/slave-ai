/**
 * server/automation/actions/createKb.js
 */

export function executeCreateKb(db, ticket, decision) {
  const title = `KB Draft: ${ticket.summary || ticket.subject}`;
  const content = `# ${ticket.subject}\n\n**Intent:** ${ticket.intent}\n\n**Original Question:**\n${ticket.body}\n\n*Draft generated automatically from Ticket #${ticket.id}. Needs human review and answer.*`;

  const result = db.prepare(`
    INSERT INTO knowledge_articles (ticket_id, title, content, status)
    VALUES (?, ?, ?, 'draft')
  `).run(
    ticket.id,
    title,
    content
  );

  // We consider the automation successfully completed since we successfully handled the ticket.
  db.prepare(`UPDATE tickets SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);

  return {
    action: 'create_kb',
    result: `KB Draft KB-${result.lastInsertRowid} created.`,
    kb_id: result.lastInsertRowid,
    timestamp: new Date().toISOString()
  };
}
