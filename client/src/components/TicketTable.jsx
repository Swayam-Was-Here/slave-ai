import React from 'react';
import { StatusIndicator } from './Indicators';

export function TicketTable({ tickets, onSelectTicket }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-12 text-center border border-base-border border-dashed rounded">
        <p className="text-text-muted text-sm font-mono">NO RECORDS FOUND</p>
      </div>
    );
  }

  return (
    <div className="w-full text-left border border-base-border rounded bg-base-surface overflow-hidden">
      <div className="grid grid-cols-[100px_80px_3fr_1.5fr_120px_100px] gap-4 px-4 py-3 border-b border-base-border bg-base-bg/50">
        <div className="label">TIME</div>
        <div className="label">ID</div>
        <div className="label">SUBJECT</div>
        <div className="label">ACTION</div>
        <div className="label">STATUS</div>
        <div className="label text-right">DURATION</div>
      </div>
      
      <div className="divide-y divide-base-border">
        {tickets.map(ticket => (
          <div 
            key={ticket.id} 
            onClick={() => onSelectTicket(ticket.id)}
            className="grid grid-cols-[100px_80px_3fr_1.5fr_120px_100px] gap-4 px-4 py-3 items-center hover:bg-base-hover cursor-pointer transition-colors"
          >
            <div className="font-mono text-xs text-text-secondary">
              {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="font-mono text-xs text-text-primary">
              SL-{ticket.id.toString().padStart(4, '0')}
            </div>
            <div className="text-sm text-text-primary truncate" title={ticket.subject}>
              {ticket.subject}
            </div>
            <div className="font-mono text-xs text-text-secondary uppercase">
              {ticket.action_taken ? ticket.action_taken.replace('_', ' ') : '—'}
            </div>
            <div>
              <StatusIndicator status={ticket.status} />
            </div>
            <div className="font-mono text-xs text-text-secondary text-right">
              {/* Note: Duration requires joining with automation_runs, but we simulate/leave blank if not available in ticket summary */}
              {ticket.status === 'completed' || ticket.status === 'failed' ? '—' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
