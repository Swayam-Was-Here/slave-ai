import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TicketForm } from '../components/TicketForm';
import { TicketTable } from '../components/TicketTable';

export function Tickets({ onSelectTicket }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchTickets = async () => {
    try {
      const data = await api.getTickets(100);
      setTickets(data.tickets);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTicketCreated = (id) => {
    onSelectTicket(id);
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'ALL') return true;
    return t.status.toUpperCase() === filter;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] xl:grid-cols-[65%_35%] gap-12 items-start">
        {/* Ticket Queue */}
        <div>
          <div className="flex flex-col mb-8">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary mb-1">TICKET INBOX</h1>
            <p className="text-text-secondary text-sm">Requests waiting for autonomous execution.</p>
          </div>
          
          <div className="flex items-center gap-6 mb-6 border-b border-base-border pb-1">
            {['ALL', 'PENDING', 'COMPLETED', 'FAILED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-mono tracking-widest pb-3 -mb-[5px] uppercase transition-colors border-b-2 ${filter === f ? 'text-text-primary border-text-primary' : 'text-text-muted border-transparent hover:text-text-secondary'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-text-muted font-mono text-sm uppercase tracking-widest p-8 border border-base-border border-dashed rounded text-center">LOADING QUEUE...</div>
          ) : (
            <TicketTable tickets={filteredTickets} onSelectTicket={onSelectTicket} />
          )}
        </div>
        
        {/* New Intake */}
        <div className="sticky top-8">
          <TicketForm onTicketCreated={handleTicketCreated} />
        </div>
      </div>
    </div>
  );
}
