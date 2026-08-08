/**
 * server/automation/respond.js
 *
 * Generates the customer-facing response based on the ticket and the action execution result.
 */

import { GoogleGenAI } from '@google/genai';

function generateFallbackResponse(ticket, executionResult) {
  if (!executionResult) {
    return "We've received your request and recorded it for further review. Our team will investigate the issue.";
  }

  const action = executionResult.action;
  
  if (action === 'create_incident') {
    return `Hi ${ticket.customer_name},\n\nWe've identified this as a high-priority network issue and created incident INC-${executionResult.incident_id} with our ${executionResult.department || 'engineering'} team. Your request has been escalated for investigation.\n\nWe'll keep the case updated as it progresses.`;
  }
  if (action === 'escalate') {
    return `Hi ${ticket.customer_name},\n\nWe've reviewed your issue and escalated it to our ${executionResult.department || 'finance'} team for investigation. Your case has been recorded (ESC-${executionResult.escalation_id}) and is now in their queue.`;
  }
  if (action === 'resolve') {
    return `Hi ${ticket.customer_name},\n\nWe've processed your request and the issue has been resolved. If you're still experiencing the problem, please reply to this message and we'll take another look.`;
  }
  if (action === 'create_kb') {
    return `Hi ${ticket.customer_name},\n\nWe've reviewed your question and created a knowledge-base draft (KB-${executionResult.kb_id}) based on the issue. Your request has been recorded and the guidance will be added to our support resources.`;
  }

  return "We've received your request and recorded it for further review. Our team will investigate the issue.";
}

export async function generateResponse(ticket, executionResult) {
  // If execution failed entirely, fallback to a safe acknowledgement.
  if (!executionResult) {
    return {
      customerResponse: generateFallbackResponse(ticket, null),
      responseSource: 'fallback'
    };
  }

  // Use fallback if explicitly configured
  if (process.env.AI_FALLBACK === 'true') {
    console.log('[respond] ⚠ Using deterministic fallback response (AI_FALLBACK=true)');
    return {
      customerResponse: generateFallbackResponse(ticket, executionResult),
      responseSource: 'fallback'
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[respond] ⚠ GEMINI_API_KEY missing, using fallback response');
    return {
      customerResponse: generateFallbackResponse(ticket, executionResult),
      responseSource: 'fallback'
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

  const prompt = `You are an autonomous customer support agent for SLAVE.
Write a concise, professional customer-facing response acknowledging the customer's problem and accurately describing the action that was just executed by our system.

TICKET INFORMATION:
Customer Name: ${ticket.customer_name}
Subject: ${ticket.subject}
Body: ${ticket.body}
Category: ${ticket.category}
Priority: ${ticket.priority}

ACTION TAKEN BY SYSTEM:
Action Type: ${executionResult.action}
System Result Details: ${executionResult.result}

RULES:
- Acknowledge the problem appropriately.
- DO NOT invent refund amounts, dates, or other ticket information.
- DO NOT provide technical implementation details unless relevant to the customer.
- DO NOT use JSON, XML, or excessive Markdown. Plain text or simple formatting only.
- State clearly what has been done based ONLY on the "System Result Details" provided above.
- Be polite and concise.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text || text.length < 10) {
      throw new Error('Generated response was too short or empty');
    }

    return {
      customerResponse: text,
      responseSource: 'gemini'
    };
  } catch (err) {
    console.error('[respond] Gemini response generation failed:', err.message);
    return {
      customerResponse: generateFallbackResponse(ticket, executionResult),
      responseSource: 'fallback'
    };
  }
}
