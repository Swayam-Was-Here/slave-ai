import React from 'react';
import { StatusIndicator } from './Indicators';

export function TicketTable({ tickets, onSelectTicket }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-16 text-center border-3 border-base-border border-dashed neo-box">
        <p className="text-text-primary text-base font-bold font-mono tracking-widest uppercase">No Records Found</p>
      </div>
    );
  }

  return (
    <div className="w-full text-left border-t-3 border-l-3 border-r-3 border-base-border bg-base-surface flex flex-col">
      <div className="grid grid-cols-[80px_3fr_1.5fr_120px] gap-4 px-6 py-4 border-b-3 border-base-border bg-base-border text-base-surface">
        <div className="font-bold text-xs tracking-widest uppercase">ID</div>
        <div className="font-bold text-xs tracking-widest uppercase">SUBJECT</div>
        <div className="font-bold text-xs tracking-widest uppercase">ACTION</div>
        <div className="font-bold text-xs tracking-widest uppercase">STATUS</div>
      </div>
      
      <div className="flex flex-col">
        {tickets.map(ticket => {
          let priorityColor = 'border-l-base-bg';
          if (ticket.priority === 'critical') priorityColor = 'border-l-accent-red';
          if (ticket.priority === 'high') priorityColor = 'border-l-accent-yellow';
          if (ticket.priority === 'medium') priorityColor = 'border-l-accent-blue';
          if (ticket.priority === 'low') priorityColor = 'border-l-accent-green';

          return (
            <div 
              key={ticket.id} 
              onClick={() => onSelectTicket(ticket.id)}
              className={`grid grid-cols-[80px_3fr_1.5fr_120px] gap-4 px-6 py-5 items-center hover:bg-base-hover cursor-pointer transition-transform border-b-3 border-base-border border-l-8 ${priorityColor} hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-neo`}
            >
              <div className="font-mono text-sm font-bold text-text-primary">
                SL-{ticket.id.toString().padStart(4, '0')}
              </div>
              <div className="flex flex-col truncate pr-4">
                <span className="text-base font-bold text-text-primary truncate uppercase" title={ticket.subject}>
                  {ticket.subject}
                </span>
                <span className="text-sm text-text-muted font-bold truncate mt-0.5">
                  {ticket.customer_name}
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-text-primary uppercase">
                {ticket.action_taken ? ticket.action_taken.replace('_', ' ') : '—'}
              </div>
              <div>
                <StatusIndicator status={ticket.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
