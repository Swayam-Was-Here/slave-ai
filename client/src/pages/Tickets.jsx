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
    <div className="p-8 lg:p-12 max-w-[1440px] mx-auto animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-12 items-start">
        {/* Ticket Queue */}
        <div>
          <div className="flex flex-col mb-10">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-text-primary mb-2 uppercase">TICKET INBOX</h1>
            <p className="text-text-secondary text-lg font-medium">Requests waiting for autonomous execution.</p>
          </div>
          
          <div className="flex items-center gap-6 mb-6 border-b-4 border-base-border pb-1">
            {['ALL', 'PENDING', 'COMPLETED', 'FAILED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm font-bold tracking-widest pb-3 -mb-[5px] uppercase transition-colors border-b-4 ${filter === f ? 'text-text-primary border-text-primary' : 'text-text-muted border-transparent hover:text-text-secondary hover:border-base-border'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-text-primary font-mono text-xl font-bold uppercase tracking-widest p-16 border-3 border-base-border border-dashed text-center bg-base-surface">LOADING QUEUE...</div>
          ) : (
            <TicketTable tickets={filteredTickets} onSelectTicket={onSelectTicket} />
          )}
        </div>
        
        {/* New Intake */}
        <div className="sticky top-12">
          <TicketForm onTicketCreated={handleTicketCreated} />
        </div>
      </div>
    </div>
  );
}
