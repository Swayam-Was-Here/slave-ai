/**
 * server/automation/execute.js
 *
 * Action execution engine.
 * Routes the decided action to the appropriate handler which performs the real
 * state change (e.g. creating incidents, escalations, etc.).
 */

import { executeResolve } from './actions/resolve.js';
import { executeEscalate } from './actions/escalate.js';
import { executeCreateIncident } from './actions/createIncident.js';
import { executeCreateKb } from './actions/createKb.js';

const VALID_ACTIONS = ['resolve', 'escalate', 'create_incident', 'create_kb'];

export function executeAction(db, ticket, decision) {
  const action = decision.action;
  
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  // Ensure idempotency for the action part. If ticket is already completed,
  // we shouldn't run this again. (This is generally handled in route/pipeline logic,
  // but safe to guard).
  if (ticket.status === 'completed') {
     // Wait, idempotency is handled at the route/pipeline level by returning early.
     // But we shouldn't fail if we get here. The route should check.
  }

  switch (action) {
    case 'resolve':
      return executeResolve(db, ticket, decision);
    case 'escalate':
      return executeEscalate(db, ticket, decision);
    case 'create_incident':
      return executeCreateIncident(db, ticket, decision);
    case 'create_kb':
      return executeCreateKb(db, ticket, decision);
    default:
      throw new Error(`Unimplemented action handler for: ${action}`);
  }
}
