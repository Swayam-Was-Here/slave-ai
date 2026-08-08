import React from 'react';
import { StatusIndicator } from './Indicators';

export function TicketTable({ tickets, onSelectTicket }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-12 text-center border border-base-border border-dashed rounded">
        <p className="text-text-muted text-sm font-mono tracking-widest uppercase">No Records Found</p>
      </div>
    );
  }

  return (
    <div className="w-full text-left border border-base-border rounded bg-base-surface overflow-hidden">
      <div className="grid grid-cols-[100px_80px_3fr_1.5fr_120px_100px] gap-4 px-5 py-4 border-b border-base-border bg-base-elevated">
        <div className="label">TIME</div>
        <div className="label">ID</div>
        <div className="label">SUBJECT</div>
        <div className="label">ACTION</div>
        <div className="label">STATUS</div>
        <div className="label text-right">DURATION</div>
      </div>
      
      <div className="divide-y divide-base-border">
        {tickets.map(ticket => {
          let priorityColor = 'bg-base-border';
          if (ticket.priority === 'critical') priorityColor = 'bg-priority-critical shadow-[0_0_8px_rgba(239,68,68,0.4)]';
          if (ticket.priority === 'high') priorityColor = 'bg-priority-high';
          if (ticket.priority === 'medium') priorityColor = 'bg-priority-medium';

          return (
            <div 
              key={ticket.id} 
              onClick={() => onSelectTicket(ticket.id)}
              className="grid grid-cols-[100px_80px_3fr_1.5fr_120px_100px] gap-4 px-5 py-4 items-center hover:bg-base-hover cursor-pointer transition-colors relative"
            >
              {/* Priority Indicator Stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${priorityColor} opacity-70`} />
              
              <div className="font-mono text-xs text-text-muted">
                {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="font-mono text-xs text-text-primary">
                SL-{ticket.id.toString().padStart(4, '0')}
              </div>
              <div className="flex flex-col truncate pr-4">
                <span className="text-sm font-medium text-text-primary truncate" title={ticket.subject}>
                  {ticket.subject}
                </span>
                <span className="text-xs text-text-muted truncate mt-0.5">
                  {ticket.customer_email}
                </span>
              </div>
              <div className="font-mono text-xs text-text-secondary uppercase">
                {ticket.action_taken ? ticket.action_taken.replace('_', ' ') : '—'}
              </div>
              <div>
                <StatusIndicator status={ticket.status} />
              </div>
              <div className="font-mono text-xs text-text-secondary text-right">
                {ticket.status === 'completed' || ticket.status === 'failed' ? '—' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
