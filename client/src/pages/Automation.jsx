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
        // If already completed, show result immediately
        if (data.ticket.status === 'completed' || data.ticket.status === 'failed') {
          // Re-map the API response to match the automation result format for consistency
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
      // We don't setShowResult(true) immediately. We wait for the Timeline to finish its visual sequence.
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

  if (loading) return <div className="p-8 text-text-muted font-mono text-sm">LOADING CONTEXT...</div>;
  if (error && !ticketData) return <div className="p-8 text-status-failed text-sm">{error}</div>;

  const { ticket } = ticketData;

  return (
    <div className="p-8 max-w-[800px] mx-auto animate-in fade-in duration-300 pb-24">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <h1 className="font-mono text-xl tracking-tight text-text-primary">
            SL-{ticket.id.toString().padStart(4, '0')}
          </h1>
          {ticket.priority && <PriorityIndicator priority={ticket.priority} />}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary mb-6">{ticket.subject}</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-base-surface border border-base-border rounded">
          <div>
            <span className="label block mb-1">CUSTOMER</span>
            <span className="text-sm">{ticket.customer_name}</span>
          </div>
          <div>
            <span className="label block mb-1">CREATED</span>
            <span className="text-sm font-mono">{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div>
          <span className="label block mb-2">REQUEST BODY</span>
          <div className="p-4 border border-base-border rounded bg-base-bg text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {ticket.body}
          </div>
        </div>
      </div>

      {ticket.status === 'pending' && !isRunning && !automationResult && (
        <div className="py-8 flex justify-center border-t border-base-border mt-8 border-dashed">
          <button 
            onClick={handleRunSlave}
            className="bg-text-primary text-base-bg px-8 py-3 font-semibold rounded hover:bg-text-secondary transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] tracking-wide"
          >
            RUN SLAVE
          </button>
        </div>
      )}

      {(isRunning || automationResult) && (
        <AutomationTimeline 
          isRunning={isRunning} 
          finalData={automationResult} 
          onComplete={handleTimelineComplete} 
        />
      )}

      {showResult && automationResult && (
        <>
          <AutomationResult data={automationResult} />
          <AuditTrail auditLog={automationResult.audit_log} />
        </>
      )}
      
      {error && isRunning && (
         <div className="mt-6 p-4 bg-status-failed/10 border border-status-failed/20 text-status-failed text-sm rounded">
           {error}
         </div>
      )}
    </div>
  );
}
