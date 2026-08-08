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

  if (loading) return <div className="p-12 text-text-primary font-mono text-xl font-bold uppercase tracking-widest">Loading Context...</div>;
  if (error && !ticketData) return <div className="p-12 text-status-failed font-mono text-xl font-bold uppercase tracking-widest bg-accent-red/10 border-3 border-accent-red">{error}</div>;

  const { ticket } = ticketData;

  const decisionData = automationResult?.executionResult || (ticket.action_taken ? { action: ticket.action_taken, ...JSON.parse(ticket.action_detail || '{}') } : null);

  return (
    <div className="p-8 lg:p-12 max-w-[1440px] mx-auto animate-in fade-in duration-300 pb-32">
      {/* Header section */}
      <div className="mb-12 flex flex-col items-start">
        <div className="flex items-center gap-6 mb-6">
          <div className="bg-text-primary text-base-surface px-4 py-2 border-3 border-base-border shadow-neo">
            <span className="font-mono text-xl font-bold tracking-widest uppercase">
              SL-{ticket.id.toString().padStart(4, '0')}
            </span>
          </div>
          {ticket.priority && <PriorityIndicator priority={ticket.priority} />}
        </div>
        
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter text-text-primary mb-6 uppercase leading-none max-w-4xl">
          {ticket.subject}
        </h1>
        
        <div className="flex flex-wrap items-center gap-8 text-base">
          <div className="flex items-center gap-3 text-text-secondary">
            <span className="label">CUSTOMER</span>
            <span className="font-bold text-text-primary">{ticket.customer_name}</span>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <span className="label">CREATED</span>
            <span className="font-mono font-bold text-text-primary">{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 items-start mt-8">
        {/* Left Column: Execution */}
        <div className="flex flex-col">
          
          {(isRunning || automationResult) ? (
            <AutomationTimeline 
              isRunning={isRunning} 
              finalData={automationResult} 
              onComplete={handleTimelineComplete} 
            />
          ) : (
            <div className="neo-box-lg p-16 flex flex-col items-center justify-center border-dashed bg-base-bg">
              <div className="text-text-primary text-2xl font-bold font-mono tracking-widest uppercase mb-10">Workflow Pending</div>
              <button 
                onClick={handleRunSlave}
                className="neo-btn text-2xl px-12 py-5"
              >
                RUN SLAVE →
              </button>
            </div>
          )}

          {showResult && automationResult && (
            <AutomationResult data={automationResult} />
          )}
        </div>

        {/* Right Column: Request & Decision */}
        <div className="flex flex-col gap-10">
          <div>
            <h3 className="label mb-4 text-lg">REQUEST</h3>
            <div className="neo-box p-8 bg-[#f4f4f0] text-lg text-text-primary whitespace-pre-wrap leading-relaxed shadow-neo relative overflow-hidden font-medium">
              "{ticket.body}"
            </div>
          </div>

          {(decisionData || ticket.priority) && (
             <div>
               <h3 className="label mb-4 text-lg">SYSTEM DECISION</h3>
               <div className="neo-box p-8 bg-base-surface text-text-primary shadow-neo">
                 <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                   {decisionData?.category && (
                     <div>
                       <span className="label block mb-2 text-text-muted">CATEGORY</span>
                       <span className="text-xl font-bold uppercase">{decisionData.category}</span>
                     </div>
                   )}
                   {ticket.priority && (
                     <div>
                       <span className="label block mb-2 text-text-muted">PRIORITY</span>
                       <span className="text-xl font-bold uppercase">{ticket.priority}</span>
                     </div>
                   )}
                   {decisionData?.department && (
                     <div>
                       <span className="label block mb-2 text-text-muted">DEPARTMENT</span>
                       <span className="text-xl font-bold uppercase">{decisionData.department}</span>
                     </div>
                   )}
                   {decisionData?.action && (
                     <div>
                       <span className="label block mb-2 text-text-muted">ACTION</span>
                       <span className="text-xl font-bold uppercase text-accent-blue bg-accent-blue/10 px-2 py-1 border-2 border-accent-blue inline-block">{decisionData.action.replace('_', ' ')}</span>
                     </div>
                   )}
                 </div>
                 
                 {decisionData?.reason && (
                   <div className="mt-8 pt-8 border-t-3 border-base-border">
                     <span className="label block mb-4 text-text-muted">REASONING</span>
                     <div className="text-lg text-text-secondary font-medium leading-relaxed">
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
        <AuditTrail auditLog={automationResult.audit_log} />
      )}

      {error && isRunning && (
         <div className="mt-8 p-6 bg-accent-red text-base-surface font-bold border-3 border-base-border shadow-neo text-lg uppercase tracking-wider">
           {error}
         </div>
      )}
    </div>
  );
}
