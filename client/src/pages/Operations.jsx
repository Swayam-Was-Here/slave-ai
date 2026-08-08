import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricsStrip } from '../components/MetricsStrip';
import { TicketTable } from '../components/TicketTable';
import { AutomationTimeline } from '../components/AutomationTimeline';

export function Operations({ onSelectTicket }) {
  const [metrics, setMetrics] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [latestAutomation, setLatestAutomation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const [metricsData, ticketsData] = await Promise.all([
          api.getMetrics(),
          api.getTickets(15)
        ]);
        if (mounted) {
          setMetrics(metricsData);
          setRecentTickets(ticketsData.tickets);
          
          if (ticketsData.tickets.length > 0) {
            const latestId = ticketsData.tickets[0].id;
            const latestDetail = await api.getTicket(latestId);
            if (mounted) {
              setLatestAutomation({
                ticket: latestDetail.ticket,
                executionResult: latestDetail.ticket.action_taken ? {
                  action: latestDetail.ticket.action_taken,
                  ...JSON.parse(latestDetail.ticket.action_detail || '{}')
                } : null,
                audit_log: latestDetail.audit_log
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load operations data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="p-12 font-mono text-xl font-bold uppercase tracking-widest text-text-primary">Initializing Console...</div>;
  }

  // Derive system activity from all recent tickets
  const systemActivity = recentTickets.slice(0, 8).map(t => {
    let message = `Ticket SL-${t.id.toString().padStart(4, '0')} logged`;
    if (t.status === 'completed') {
       if (t.action_taken === 'create_incident') message = `Incident created for SL-${t.id.toString().padStart(4, '0')}`;
       else if (t.action_taken === 'escalate') message = `Escalated SL-${t.id.toString().padStart(4, '0')} to ${JSON.parse(t.action_detail || '{}').department || 'human'}`;
       else if (t.action_taken === 'resolve') message = `Resolved SL-${t.id.toString().padStart(4, '0')} autonomously`;
       else if (t.action_taken === 'create_kb') message = `Drafted KB article for SL-${t.id.toString().padStart(4, '0')}`;
    } else if (t.status === 'failed') {
       message = `Automation failed for SL-${t.id.toString().padStart(4, '0')}`;
    } else if (t.status === 'processing') {
       message = `Processing SL-${t.id.toString().padStart(4, '0')}...`;
    }
    return { id: t.id, time: t.created_at, message, status: t.status };
  });

  return (
    <div className="p-8 lg:p-12 max-w-[1440px] mx-auto animate-in fade-in duration-300">
      
      <div className="mb-12">
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter text-text-primary mb-2 uppercase leading-none">AUTONOMOUS<br/>OPERATIONS</h1>
        <p className="text-text-secondary text-lg font-medium mb-12 max-w-2xl">Give SLAVE the problem. It handles the workflow.</p>
        
        <MetricsStrip metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-12 mb-16 items-start">
        {/* Left: Latest Automation */}
        <div>
          <h2 className="label mb-4 text-lg">LATEST AUTOMATION</h2>
          {latestAutomation ? (
            <div className="neo-box-lg cursor-pointer group" onClick={() => onSelectTicket(latestAutomation.ticket.id)}>
              <div className="p-6 md:p-8 border-b-4 border-base-border bg-base-surface group-hover:bg-accent-yellow transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono text-lg font-bold text-text-primary bg-base-surface border-3 border-base-border px-3 py-1 shadow-neo">
                    SL-{latestAutomation.ticket.id.toString().padStart(4, '0')}
                  </div>
                  <div className="text-sm font-bold font-mono uppercase text-text-primary border-b-3 border-text-primary">
                    {latestAutomation.ticket.priority || 'PENDING'}
                  </div>
                </div>
                <div className="text-3xl font-bold text-text-primary uppercase leading-tight mb-4">{latestAutomation.ticket.subject}</div>
                <div className="flex flex-wrap gap-3">
                  <span className="font-mono text-sm font-bold uppercase border-3 border-base-border bg-base-surface px-3 py-1">{latestAutomation.ticket.department || 'ROUTING'}</span>
                  {latestAutomation.executionResult?.action && (
                    <span className="font-mono text-sm font-bold uppercase border-3 border-base-border bg-text-primary text-base-surface px-3 py-1">
                      {latestAutomation.executionResult.action.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 md:p-8 bg-base-bg">
                <AutomationTimeline 
                  isRunning={latestAutomation.ticket.status === 'processing'} 
                  finalData={latestAutomation.ticket.status !== 'pending' ? latestAutomation : null}
                  hideBox={true} 
                />
              </div>
            </div>
          ) : (
            <div className="p-12 neo-box text-center font-bold font-mono text-lg uppercase">NO ACTIVE AUTOMATIONS</div>
          )}
        </div>

        {/* Right: System Activity */}
        <div className="h-full">
          <h2 className="label mb-4 text-lg">SYSTEM ACTIVITY</h2>
          <div className="neo-box flex flex-col">
            {systemActivity.length > 0 ? systemActivity.map((act, i) => (
              <div key={`${act.id}-${i}`} className={`flex flex-col gap-1 p-4 ${i !== systemActivity.length - 1 ? 'border-b-3 border-base-border' : ''} hover:bg-base-hover transition-colors`}>
                <div className="font-mono text-sm font-bold text-text-muted">
                  {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`text-base font-bold uppercase leading-tight ${act.status === 'failed' ? 'text-status-failed' : 'text-text-primary'}`}>
                  {act.message}
                </div>
              </div>
            )) : (
               <div className="p-8 text-base font-bold uppercase text-text-muted text-center">No recent activity.</div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="label mb-4 text-lg">RECENT AUTOMATIONS</h2>
        <TicketTable tickets={recentTickets} onSelectTicket={onSelectTicket} />
      </div>
    </div>
  );
}
