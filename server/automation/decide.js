/**
 * server/automation/decide.js
 *
 * Deterministic decision engine.
 *
 * This module has FINAL AUTHORITY over which action is taken on a ticket.
 * The LLM's recommended_action is available as a tiebreaker in genuinely
 * ambiguous cases, but it cannot override the hard rules below.
 *
 * Supported actions: resolve | escalate | create_incident | create_kb
 * Safe default: escalate (human review is always safer than an invented action)
 *
 * Rules are centralised here — do NOT add action logic to routes or pipeline.
 * To change behaviour, edit ONLY this file.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_ACTIONS = ['resolve', 'escalate', 'create_incident', 'create_kb'];

const PRIORITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine the action to take on a classified ticket.
 *
 * @param {object} classification
 * @param {string} classification.category    - billing | technical | account | delivery | refund | general
 * @param {string} classification.priority    - critical | high | medium | low
 * @param {string} classification.department  - finance | engineering | support | operations
 * @param {string} classification.intent      - what the customer wants
 * @param {string} classification.summary     - one-line summary
 * @param {string} classification.recommended_action - LLM's suggestion (advisory only)
 *
 * @returns {{ action: string, reason: string, confidence: 'high' | 'medium' }}
 */
export function decideAction(classification) {
  const { category, priority, intent = '', summary = '', recommended_action } = classification;

  // Sanitise LLM recommendation — if invalid, treat as absent.
  const llmAction = VALID_ACTIONS.includes(recommended_action) ? recommended_action : null;

  try {
    return applyRules({ category, priority, intent, summary, llmAction });
  } catch (err) {
    // The engine itself should never throw, but if it does: escalate safely.
    console.error('[decide] Unexpected error in decision engine:', err.message);
    return {
      action:     'escalate',
      reason:     `Decision engine error — defaulting to escalation: ${err.message}`,
      confidence: 'medium',
    };
  }
}

// ─── Rule engine ─────────────────────────────────────────────────────────────

function applyRules({ category, priority, intent, summary, llmAction }) {
  const intentText = `${intent} ${summary}`.toLowerCase();

  // ── Rule 1: Technical issues ─────────────────────────────────────────────
  // Technical issues are handled by engineering and require specific treatment.
  // High/critical → create_incident (service disruption, needs tracking).
  // Medium/low → create_kb if informational, resolve if minor bug.
  if (category === 'technical') {
    if (isHighOrCritical(priority)) {
      return decision(
        'create_incident',
        `High-priority technical issue (${priority}) requires incident tracking and engineering attention`,
        'high'
      );
    }
    // Medium / low technical
    if (isInformational(intentText)) {
      return decision(
        'create_kb',
        'Technical question is informational and suitable for knowledge base documentation',
        'high'
      );
    }
    return decision(
      'resolve',
      `Low-priority technical issue (${priority}) can be auto-resolved`,
      'medium'
    );
  }

  // ── Rule 2: Billing & refund — always escalate ────────────────────────────
  // Financial decisions must have human authorisation. No exceptions.
  if (category === 'billing' || category === 'refund') {
    return decision(
      'escalate',
      `Billing/refund issues require human financial review regardless of priority (${priority})`,
      'high'
    );
  }

  // ── Rule 3: Delivery — always escalate ───────────────────────────────────
  // Delivery issues involve third-party logistics and require operations review.
  if (category === 'delivery') {
    return decision(
      'escalate',
      'Delivery issues require operations team review and cannot be safely auto-resolved',
      'high'
    );
  }

  // ── Rule 4: Critical priority → escalate ─────────────────────────────────
  // Any remaining category at critical priority gets human attention.
  // (Technical critical was already handled in Rule 1.)
  if (priority === 'critical') {
    return decision(
      'escalate',
      `Critical priority ${category} issue requires immediate human attention`,
      'high'
    );
  }

  // ── Rule 5: Account issues ────────────────────────────────────────────────
  // Simple account requests (password reset, profile update) can be auto-resolved.
  // Serious account problems (locked out, suspicious activity) need human review.
  if (category === 'account') {
    if (isHighOrCritical(priority)) {
      return decision(
        'escalate',
        `High-priority account issue (${priority}) — possible security or access concern`,
        'high'
      );
    }
    if (isComplexAccountIssue(intentText)) {
      return decision(
        'escalate',
        'Account issue shows signs of a serious problem (suspicious activity, data concern, or unusual access)',
        'high'
      );
    }
    return decision(
      'resolve',
      'Straightforward account request can be auto-resolved',
      'high'
    );
  }

  // ── Rule 6: High priority (remaining categories) → escalate ─────────────
  if (priority === 'high') {
    return decision(
      'escalate',
      `High-priority ${category} issue requires human review`,
      'high'
    );
  }

  // ── Rule 7: General / informational ─────────────────────────────────────
  if (category === 'general') {
    if (isInformational(intentText)) {
      return decision(
        'resolve',
        'Informational request can be answered and auto-resolved',
        'high'
      );
    }
    // Use LLM suggestion as a tiebreaker for ambiguous general requests,
    // but only allow safe actions (resolve or create_kb — not escalate override).
    if (llmAction === 'create_kb') {
      return decision(
        'create_kb',
        'General request is suitable for knowledge base documentation (AI-assisted decision)',
        'medium'
      );
    }
    if (llmAction === 'resolve') {
      return decision(
        'resolve',
        'General request can be resolved based on classification context (AI-assisted decision)',
        'medium'
      );
    }
    return decision(
      'escalate',
      'General request cannot be safely auto-resolved — escalating for human review',
      'medium'
    );
  }

  // ── Rule 8: Safe default ─────────────────────────────────────────────────
  // Unknown category, unexpected combination, or anything not covered above.
  // Always escalate rather than invent an action.
  return decision(
    'escalate',
    `Unable to determine a safe automated action for category="${category}" priority="${priority}" — escalating to human review`,
    'medium'
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if priority is high or critical. */
function isHighOrCritical(priority) {
  return (PRIORITY_WEIGHT[priority] ?? 0) >= 3;
}

/**
 * Returns true if the intent/summary text looks informational rather than
 * a problem report. Used to route "how to" questions to resolve or create_kb.
 */
function isInformational(text) {
  return /\b(how (to|do|can|does)|what is|where (is|can)|guide|documentation|tutorial|export|find out|learn|explain|difference between|tell me|is it possible|can i|can you)\b/.test(
    text
  );
}

/**
 * Returns true if an account-category intent/summary contains signals
 * that this is a serious problem rather than a routine request.
 */
function isComplexAccountIssue(text) {
  return /\b(hack|breach|unauthori[sz]ed|suspicious|stolen|comprom|not me|someone else|fraud|security|data (loss|leak)|cannot access|completely locked|closed my account)\b/.test(
    text
  );
}

/** Constructs a validated decision object. */
function decision(action, reason, confidence) {
  // Final guard — if somehow an unsupported action slipped through, escalate.
  if (!VALID_ACTIONS.includes(action)) {
    console.error(`[decide] BUG: attempted to return unsupported action "${action}" — overriding to escalate`);
    return { action: 'escalate', reason: 'Internal rule produced invalid action — escalating safely', confidence: 'medium' };
  }
  return { action, reason, confidence };
}
