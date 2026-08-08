import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AutomationTimeline } from '../components/AutomationTimeline';
import { AutomationResult } from '../components/AutomationResult';
import { AuditTrail } from '../components/AuditTrail';
import { PriorityIndicator } from '../components/Indicators';

export function Automation({ ticketId }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Automation state
  const [isRunning, setIsRunning] = useState(false);
  const [automationResult, setAutomationResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await api.getTicket(ticketId);
        setTicketData(data);
        if (data.ticket.status === 'completed' || data.ticket.status === 'failed') {
          setAutomationResult({
            ticket: data.ticket,
            executionResult: data.ticket.action_taken ? {
              action: data.ticket.action_taken,
              ...JSON.parse(data.ticket.action_detail || '{}')
            } : null,
            customerResponse: data.ticket.customer_response,
            audit_log: data.audit_log
          });
          setShowResult(true);
        }
      } catch (err) {
        setError('Failed to load ticket details.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [ticketId]);

  const handleRunSlave = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await api.automateTicket(ticketId);
      setAutomationResult(result);
    } catch (err) {
      setError(err.message || 'Automation failed');
      setIsRunning(false);
    }
  };

  const handleTimelineComplete = () => {
    if (automationResult) {
      setShowResult(true);
      setIsRunning(false);
    }
  };

  if (loading) return <div className="p-8 text-text-muted font-mono text-sm uppercase tracking-widest">Loading Context...</div>;
  if (error && !ticketData) return <div className="p-8 text-status-failed text-sm">{error}</div>;

  const { ticket } = ticketData;

  const decisionData = automationResult?.executionResult || (ticket.action_taken ? { action: ticket.action_taken, ...JSON.parse(ticket.action_detail || '{}') } : null);

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-300 pb-32">
      {/* Header section */}
      <div className="mb-10 flex flex-col items-start">
        <div className="flex items-center gap-4 mb-3">
          <div className="bg-base-elevated px-3 py-1 rounded border border-base-border">
            <span className="font-mono text-sm text-text-primary tracking-wide">
              SL-{ticket.id.toString().padStart(4, '0')}
            </span>
          </div>
          {ticket.priority && <PriorityIndicator priority={ticket.priority} />}
        </div>
        
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary mb-3">
          {ticket.subject}
        </h1>
        
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="label">CUSTOMER</span>
            <span>{ticket.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="label">CREATED</span>
            <span className="font-mono">{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12 items-start">
        {/* Left Column: Execution */}
        <div className="flex flex-col gap-6">
          
          {(isRunning || automationResult) ? (
            <AutomationTimeline 
              isRunning={isRunning} 
              finalData={automationResult} 
              onComplete={handleTimelineComplete} 
            />
          ) : (
            <div className="border border-base-border bg-base-surface p-12 rounded flex flex-col items-center justify-center border-dashed">
              <div className="text-text-muted text-sm font-mono tracking-widest uppercase mb-6">Workflow Pending</div>
              <button 
                onClick={handleRunSlave}
                className="bg-text-primary text-base-bg px-10 py-3 font-semibold rounded hover:bg-text-secondary transition-colors tracking-widest uppercase text-sm"
              >
                RUN SLAVE
              </button>
            </div>
          )}

          {showResult && automationResult && (
            <div className="mt-4">
              <AutomationResult data={automationResult} />
            </div>
          )}
        </div>

        {/* Right Column: Request & Decision */}
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="label mb-4">REQUEST</h3>
            <div className="p-5 border border-base-border rounded bg-base-surface text-sm text-text-primary whitespace-pre-wrap leading-relaxed shadow-sm">
              "{ticket.body}"
            </div>
          </div>

          {(decisionData || ticket.priority) && (
             <div>
               <h3 className="label mb-4">SYSTEM DECISION</h3>
               <div className="border border-base-border rounded bg-base-surface p-5 shadow-sm">
                 <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                   {decisionData?.category && (
                     <div>
                       <span className="label block mb-1">CATEGORY</span>
                       <span className="text-sm font-medium">{decisionData.category.toUpperCase()}</span>
                     </div>
                   )}
                   {ticket.priority && (
                     <div>
                       <span className="label block mb-1">PRIORITY</span>
                       <span className="text-sm font-medium">{ticket.priority.toUpperCase()}</span>
                     </div>
                   )}
                   {decisionData?.department && (
                     <div>
                       <span className="label block mb-1">DEPARTMENT</span>
                       <span className="text-sm font-medium">{decisionData.department.toUpperCase()}</span>
                     </div>
                   )}
                   {decisionData?.action && (
                     <div>
                       <span className="label block mb-1">ACTION</span>
                       <span className="text-sm font-medium text-status-processing">{decisionData.action.replace('_', ' ').toUpperCase()}</span>
                     </div>
                   )}
                 </div>
                 
                 {decisionData?.reason && (
                   <div className="mt-6 pt-5 border-t border-base-border">
                     <span className="label block mb-2">REASONING</span>
                     <div className="text-sm text-text-secondary italic leading-relaxed">
                       "{decisionData.reason}"
                     </div>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>
      </div>
      
      {showResult && automationResult?.audit_log && (
        <div className="mt-12">
           <AuditTrail auditLog={automationResult.audit_log} />
        </div>
      )}

      {error && isRunning && (
         <div className="mt-6 p-4 bg-status-failed/10 border border-status-failed/20 text-status-failed text-sm rounded">
           {error}
         </div>
      )}
    </div>
  );
}
