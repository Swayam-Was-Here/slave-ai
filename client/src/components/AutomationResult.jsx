import React from 'react';
import { PriorityIndicator } from './Indicators';
import { XCircle, CheckCircle2 } from 'lucide-react';

export function AutomationResult({ data }) {
  if (!data) return null;

  const { ticket, executionResult, customerResponse, audit_log } = data;
  const isFailed = ticket.status === 'failed';
  
  const failedStep = isFailed ? audit_log?.find(l => l.status === 'error')?.step : null;
  const failedReason = isFailed ? audit_log?.find(l => l.status === 'error')?.message : null;

  if (isFailed) {
    return (
      <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="border border-status-failed/50 bg-status-failed/5 p-6 rounded shadow-sm">
          <div className="flex items-center gap-3 mb-6 text-status-failed">
            <XCircle className="w-5 h-5" />
            <h3 className="label !text-status-failed m-0">AUTOMATION FAILED</h3>
          </div>
          
          <div className="mb-4">
            <span className="label block mb-2 text-text-primary">FAILURE POINT</span>
            <div className="text-sm font-medium text-status-failed uppercase tracking-wider">
              {failedStep ? `${failedStep} FAILED` : 'WORKFLOW ERROR'}
            </div>
          </div>
          
          <div className="mb-6">
            <span className="label block mb-2 text-text-primary">DIAGNOSTIC</span>
            <div className="text-sm text-text-secondary leading-relaxed">
              {failedReason || "SLAVE could not analyse this request or execute the action."}
            </div>
          </div>

          <div className="p-4 bg-base-bg border border-base-border rounded text-center">
            <span className="font-mono text-sm tracking-widest uppercase text-text-muted">NO ACTION EXECUTED</span>
          </div>
        </div>
      </div>
    );
  }

  // Extract source from audit log for response if available, or just rely on ticket properties
  const analysisSource = ticket.analysis_source || 'gemini';
  
  // Look for respond step in audit log
  const respondLog = audit_log?.find(l => l.step === 'respond' && l.status === 'done');
  let responseSource = 'gemini';
  if (respondLog && respondLog.detail) {
    try {
      const detail = JSON.parse(respondLog.detail);
      if (detail.source) responseSource = detail.source;
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="border border-base-border bg-base-surface p-6 rounded shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-status-completed">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="label !text-status-completed m-0">WORKFLOW COMPLETE</h3>
          </div>
        </div>
        
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
            <span className="label block mb-2 text-text-secondary">PRIORITY</span>
            <PriorityIndicator priority={ticket.priority} />
          </div>
        </div>

        <div className="divider mb-6" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="label m-0 text-text-secondary">CUSTOMER RESPONSE</h3>
            <span className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded border ${responseSource === 'fallback' ? 'border-status-pending text-text-muted' : 'border-status-processing/30 text-status-processing/70'}`}>
              {responseSource === 'fallback' ? 'FALLBACK' : 'GEMINI'}
            </span>
          </div>
          <div className="p-5 bg-base-bg border border-base-border rounded text-sm whitespace-pre-wrap text-text-primary leading-relaxed font-sans shadow-inner">
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
      <span className="label block mb-2 text-text-secondary">{label}</span>
      <span className="font-mono text-sm text-text-primary">{value}</span>
    </div>
  );
}
