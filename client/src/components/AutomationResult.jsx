import React from 'react';
import { PriorityIndicator } from './Indicators';
import { X, Check } from 'lucide-react';

export function AutomationResult({ data }) {
  if (!data) return null;

  const { ticket, executionResult, customerResponse, audit_log } = data;
  const isFailed = ticket.status === 'failed';
  
  const failedStep = isFailed ? audit_log?.find(l => l.status === 'error')?.step : null;
  const failedReason = isFailed ? audit_log?.find(l => l.status === 'error')?.message : null;

  if (isFailed) {
    return (
      <div className="space-y-6 mt-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="neo-box-lg border-accent-red bg-accent-red text-base-surface p-8">
          <div className="flex items-center gap-4 mb-8">
            <X className="w-12 h-12" />
            <h3 className="text-4xl font-bold tracking-tighter m-0 uppercase leading-none">AUTOMATION<br/>FAILED</h3>
          </div>
          
          <div className="mb-6 bg-base-surface text-text-primary border-3 border-base-border p-6 shadow-neo">
            <span className="label block mb-2 text-text-muted">FAILURE POINT</span>
            <div className="text-xl font-bold uppercase tracking-wider mb-4">
              {failedStep ? `${failedStep} FAILED` : 'WORKFLOW ERROR'}
            </div>
            
            <span className="label block mb-2 text-text-muted">DIAGNOSTIC</span>
            <div className="text-lg font-medium leading-relaxed">
              {failedReason || "SLAVE could not analyse this request or execute the action."}
            </div>
          </div>

          <div className="p-4 bg-base-border text-base-surface border-3 border-base-border text-center shadow-neo">
            <span className="font-mono text-lg font-bold tracking-widest uppercase">NO ACTION EXECUTED</span>
          </div>
        </div>
      </div>
    );
  }

  const responseSource = audit_log?.find(l => l.step === 'respond' && l.status === 'done')?.detail?.includes('fallback') ? 'fallback' : 'gemini';

  return (
    <div className="space-y-12 mt-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Workflow Complete Money Shot */}
      <div className="neo-box-lg border-accent-green bg-accent-green text-base-surface p-8">
        <div className="flex items-center gap-4 mb-10">
          <Check className="w-12 h-12" />
          <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter m-0 uppercase leading-none">WORKFLOW<br/>COMPLETE</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-base-surface text-text-primary border-3 border-base-border p-6 shadow-neo">
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
            <span className="label block mb-2 text-text-muted">PRIORITY</span>
            <PriorityIndicator priority={ticket.priority} />
          </div>
        </div>
      </div>

      {/* Customer Response Document */}
      <div>
        <h3 className="label mb-4 text-lg">CUSTOMER RESPONSE</h3>
        <div className="neo-box-lg bg-[#f4f4f0] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <span className={`text-xs font-bold uppercase font-mono tracking-widest px-3 py-1 border-3 border-base-border shadow-neo ${responseSource === 'fallback' ? 'bg-base-surface text-text-primary' : 'bg-accent-blue text-base-surface'}`}>
              SOURCE: {responseSource === 'fallback' ? 'FALLBACK' : 'GEMINI'}
            </span>
          </div>
          <div className="text-lg whitespace-pre-wrap text-text-primary leading-relaxed font-sans font-medium max-w-3xl mt-4">
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
      <span className="label block mb-2 text-text-muted">{label}</span>
      <span className="font-mono text-lg font-bold text-text-primary">{value}</span>
    </div>
  );
}
