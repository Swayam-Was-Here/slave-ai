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
    return <div className="p-8 text-text-muted font-mono text-sm uppercase tracking-widest">Initializing Console...</div>;
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
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      
      <div className="mb-10">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary mb-1">AUTONOMOUS OPERATIONS</h1>
        <p className="text-text-secondary text-sm mb-6">SLAVE is currently monitoring and executing support workflows.</p>
        
        <MetricsStrip metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12 mb-12">
        {/* Left: Latest Automation */}
        <div>
          <h2 className="label mb-4">LATEST AUTOMATION</h2>
          {latestAutomation ? (
            <div className="border border-base-border bg-base-surface rounded overflow-hidden">
              <div className="p-5 border-b border-base-border bg-base-elevated cursor-pointer hover:bg-base-hover transition-colors" onClick={() => onSelectTicket(latestAutomation.ticket.id)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-mono text-sm text-text-primary">SL-{latestAutomation.ticket.id.toString().padStart(4, '0')}</div>
                  <div className="text-xs font-mono uppercase text-text-secondary">
                    {latestAutomation.ticket.priority || 'PENDING'}
                  </div>
                </div>
                <div className="text-base font-medium text-text-primary truncate">{latestAutomation.ticket.subject}</div>
                <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">{latestAutomation.ticket.department || 'ROUTING'}</div>
              </div>
              <div className="px-1 pb-1">
                <AutomationTimeline 
                  isRunning={latestAutomation.ticket.status === 'processing'} 
                  finalData={latestAutomation.ticket.status !== 'pending' ? latestAutomation : null}
                  hideBox={true} 
                />
              </div>
            </div>
          ) : (
            <div className="p-8 border border-base-border border-dashed rounded text-center text-text-muted text-sm">NO ACTIVE AUTOMATIONS</div>
          )}
        </div>

        {/* Right: System Activity */}
        <div>
          <h2 className="label mb-4">SYSTEM ACTIVITY</h2>
          <div className="border border-base-border bg-base-surface rounded p-5 space-y-4 h-full">
            {systemActivity.length > 0 ? systemActivity.map((act, i) => (
              <div key={`${act.id}-${i}`} className="flex flex-col gap-1">
                <div className="font-mono text-xs text-text-muted">
                  {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className={`text-sm ${act.status === 'failed' ? 'text-status-failed' : 'text-text-primary'}`}>
                  {act.message}
                </div>
              </div>
            )) : (
               <div className="text-sm text-text-muted">No recent activity.</div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="label mb-4">RECENT AUTOMATIONS</h2>
        <TicketTable tickets={recentTickets} onSelectTicket={onSelectTicket} />
      </div>
    </div>
  );
}
