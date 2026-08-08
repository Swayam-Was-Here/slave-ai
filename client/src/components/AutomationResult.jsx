import React from 'react';
import { PriorityIndicator } from './Indicators';

export function AutomationResult({ data }) {
  if (!data) return null;

  const { ticket, executionResult, customerResponse } = data;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="border border-base-border bg-base-surface p-6 rounded">
        <h3 className="label mb-6 text-status-completed">AUTOMATION COMPLETE</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <ResultItem label="ACTION" value={executionResult?.action?.replace('_', ' ').toUpperCase()} />
          
          {executionResult?.incident_id && (
            <ResultItem label="INCIDENT" value={`INC-${executionResult.incident_id.toString().padStart(3, '0')}`} />
          )}
          {executionResult?.escalation_id && (
            <ResultItem label="ESCALATION" value={`ESC-${executionResult.escalation_id.toString().padStart(3, '0')}`} />
          )}
          {executionResult?.kb_id && (
            <ResultItem label="KB ARTICLE" value={`KB-${executionResult.kb_id.toString().padStart(3, '0')}`} />
          )}

          <ResultItem label="DEPARTMENT" value={executionResult?.department?.toUpperCase()} />
          
          <div>
            <span className="label block mb-1">PRIORITY</span>
            <PriorityIndicator priority={ticket.priority} />
          </div>
        </div>

        <div className="divider mb-6" />
        
        <div>
          <h3 className="label mb-4">CUSTOMER RESPONSE</h3>
          <div className="p-4 bg-base-bg border border-base-border rounded text-sm whitespace-pre-wrap text-text-primary leading-relaxed font-sans">
            {customerResponse}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="label block mb-1">{label}</span>
      <span className="font-mono text-sm text-text-primary">{value}</span>
    </div>
  );
}
