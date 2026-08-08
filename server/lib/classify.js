/**
 * server/lib/classify.js
 *
 * AI classification for support tickets.
 *
 * Two modes:
 *   1. Gemini (default) — calls the Gemini API with structured JSON output.
 *   2. Fallback (AI_FALLBACK=true) — deterministic keyword-based classification.
 *      The fallback never pretends to be Gemini; analysis_source is always 'fallback'.
 *
 * Both modes return the same shape:
 * {
 *   category, priority, department, summary, intent, recommended_action,
 *   analysis_source: 'gemini' | 'fallback'
 * }
 */

import { getLlmClient, getModel } from './llm.js';
import { Type } from '@google/genai';

// ─── Allowed enum values ──────────────────────────────────────────────────────

const VALID_CATEGORIES  = ['billing', 'technical', 'account', 'delivery', 'refund', 'general'];
const VALID_PRIORITIES  = ['critical', 'high', 'medium', 'low'];
const VALID_DEPARTMENTS = ['finance', 'engineering', 'support', 'operations'];
const VALID_ACTIONS     = ['resolve', 'escalate', 'create_incident', 'create_kb'];

// ─── Gemini response schema ───────────────────────────────────────────────────
// Using the Gemini SDK Type enum for schema properties.

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: VALID_CATEGORIES,
      description: 'The type of support issue.',
    },
    priority: {
      type: Type.STRING,
      enum: VALID_PRIORITIES,
      description:
        'Urgency level. critical = service down or major financial impact; ' +
        'high = significant blocker; medium = standard issue; low = minor or informational.',
    },
    department: {
      type: Type.STRING,
      enum: VALID_DEPARTMENTS,
      description: 'The internal team best suited to resolve this.',
    },
    summary: {
      type: Type.STRING,
      description: 'One concise sentence describing the issue.',
    },
    intent: {
      type: Type.STRING,
      description: 'What the customer wants to achieve or have resolved.',
    },
    recommended_action: {
      type: Type.STRING,
      enum: VALID_ACTIONS,
      description:
        'resolve = can be auto-closed; escalate = needs human review; ' +
        'create_incident = service disruption; create_kb = common question worth documenting.',
    },
  },
  required: ['category', 'priority', 'department', 'summary', 'intent', 'recommended_action'],
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Classify a support ticket using Gemini or the deterministic fallback.
 *
 * @param {{ subject: string, body: string, customer_name: string, customer_email: string }} ticket
 * @returns {Promise<ClassificationResult>}
 */
export async function classifyTicket(ticket) {
  if (process.env.AI_FALLBACK === 'true') {
    return fallbackClassify(ticket);
  }

  // Attempt Gemini; bubble up a descriptive Error on failure.
  try {
    return await geminiClassify(ticket);
  } catch (err) {
    throw new Error(`Gemini classification failed: ${err.message}`);
  }
}

// ─── Gemini path ──────────────────────────────────────────────────────────────

async function geminiClassify(ticket) {
  const client = getLlmClient(); // throws if GEMINI_API_KEY missing
  const model  = getModel();

  const prompt = buildPrompt(ticket);

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1, // Low temperature — consistent classification matters more than creativity
    },
  });

  // response.text is the raw JSON string when responseMimeType is application/json
  const raw = response.text;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw?.slice(0, 200)}`);
  }

  const validated = validateClassification(parsed);
  return { ...validated, analysis_source: 'gemini' };
}

function buildPrompt(ticket) {
  return (
    `You are a support ticket classification system for a SaaS company.\n` +
    `Analyze the following customer support ticket and return a structured classification.\n\n` +
    `Customer: ${ticket.customer_name} <${ticket.customer_email}>\n` +
    `Subject: ${ticket.subject}\n\n` +
    `Message:\n${ticket.body}\n\n` +
    `Classification rules:\n` +
    `- priority=critical if: system is down, data loss, security breach, or major financial impact\n` +
    `- priority=high if: core feature broken, blocks work, or significant financial concern\n` +
    `- priority=medium if: partial issue, workaround exists, or standard request\n` +
    `- priority=low if: minor inconvenience, informational, or feature request\n` +
    `- department=finance for billing, payments, refunds, invoices\n` +
    `- department=engineering for bugs, technical errors, outages\n` +
    `- department=support for account issues, general help, how-to questions\n` +
    `- department=operations for delivery, fulfilment, logistics\n` +
    `- recommended_action=resolve if the issue can be auto-resolved with no human needed\n` +
    `- recommended_action=escalate if a human must review before action\n` +
    `- recommended_action=create_incident if this is a service disruption affecting many users\n` +
    `- recommended_action=create_kb if this is a common question worth documenting`
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate the parsed Gemini response. Throws with a descriptive message on failure.
 * This is the contract: if Gemini returns something unexpected, we catch it here
 * rather than writing garbage to the DB.
 */
function validateClassification(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Classification response must be a JSON object');
  }

  const errors = [];

  if (!VALID_CATEGORIES.includes(data.category)) {
    errors.push(`invalid category "${data.category}" (must be one of: ${VALID_CATEGORIES.join(', ')})`);
  }
  if (!VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`invalid priority "${data.priority}" (must be one of: ${VALID_PRIORITIES.join(', ')})`);
  }
  if (!VALID_DEPARTMENTS.includes(data.department)) {
    errors.push(`invalid department "${data.department}" (must be one of: ${VALID_DEPARTMENTS.join(', ')})`);
  }
  if (!data.summary || typeof data.summary !== 'string' || !data.summary.trim()) {
    errors.push('summary must be a non-empty string');
  }
  if (!data.intent || typeof data.intent !== 'string' || !data.intent.trim()) {
    errors.push('intent must be a non-empty string');
  }
  if (!VALID_ACTIONS.includes(data.recommended_action)) {
    errors.push(
      `invalid recommended_action "${data.recommended_action}" (must be one of: ${VALID_ACTIONS.join(', ')})`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid classification response — ${errors.join('; ')}`);
  }

  return {
    category:           data.category,
    priority:           data.priority,
    department:         data.department,
    summary:            data.summary.trim(),
    intent:             data.intent.trim(),
    recommended_action: data.recommended_action,
  };
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

/**
 * Keyword-based classifier used when AI_FALLBACK=true.
 *
 * This is intentionally simple — it exists so the system can be demonstrated
 * without a Gemini API key. It is always clearly labelled as 'fallback' in the
 * analysis_source field; it never silently impersonates Gemini.
 */
function fallbackClassify(ticket) {
  console.warn('[classify] ⚠  Using deterministic fallback classification (AI_FALLBACK=true)');

  const text = `${ticket.subject} ${ticket.body}`.toLowerCase();

  // ── Category + department ────────────────────────────────────────────────
  let category   = 'general';
  let department = 'support';
  let recommended_action = 'resolve';

  if (/\b(billing|charge|invoice|payment|refund|overcharg|credit card)\b/.test(text)) {
    category           = /\brefund\b/.test(text) ? 'refund' : 'billing';
    department         = 'finance';
    recommended_action = 'escalate';
  } else if (/\b(bug|error|crash|exception|broken|not working|outage|down|500|timeout)\b/.test(text)) {
    category           = 'technical';
    department         = 'engineering';
    recommended_action = /\b(outage|down|all users|everyone)\b/.test(text)
      ? 'create_incident'
      : 'escalate';
  } else if (/\b(account|login|password|locked|access|sign.?in|2fa|two.factor)\b/.test(text)) {
    category           = 'account';
    department         = 'support';
    recommended_action = 'resolve';
  } else if (/\b(deliver|shipping|order|package|track|dispatch|fulfilment)\b/.test(text)) {
    category           = 'delivery';
    department         = 'operations';
    recommended_action = 'escalate';
  } else if (/\b(how to|guide|documentation|tutorial|help me understand|what is)\b/.test(text)) {
    category           = 'general';
    department         = 'support';
    recommended_action = 'create_kb';
  }

  // ── Priority ────────────────────────────────────────────────────────────
  let priority = 'medium';

  if (/\b(urgent|critical|emergency|asap|immediately|outage|data loss|breach|cannot work)\b/.test(text)) {
    priority = 'critical';
  } else if (/\b(important|high priority|broken|blocked|cannot access|major)\b/.test(text)) {
    priority = 'high';
  } else if (/\b(minor|low priority|when you can|no rush|suggestion|feature request)\b/.test(text)) {
    priority = 'low';
  }

  return {
    category,
    priority,
    department,
    summary:            `[FALLBACK] ${ticket.subject.slice(0, 120)}`,
    intent:             `Customer seeks resolution for a ${category} issue regarding: ${ticket.subject.slice(0, 80)}`,
    recommended_action,
    analysis_source:    'fallback',
  };
}
