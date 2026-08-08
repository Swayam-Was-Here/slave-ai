/**
 * server/automation/actions/resolve.js
 */

export function executeResolve(db, ticket, decision) {
  // We simply mark the ticket as completed.
  db.prepare(`UPDATE tickets SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);

  return {
    action: 'resolve',
    result: 'Ticket automatically resolved.',
    timestamp: new Date().toISOString()
  };
}
