import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TicketForm } from '../components/TicketForm';
import { TicketTable } from '../components/TicketTable';

export function Tickets({ onSelectTicket }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // When a ticket is created, we immediately transition to the automation view
    onSelectTicket(id);
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
        <div>
          <h2 className="label mb-4">TICKET INBOX</h2>
          {loading ? (
            <div className="text-text-muted font-mono text-sm">LOADING QUEUE...</div>
          ) : (
            <TicketTable tickets={tickets} onSelectTicket={onSelectTicket} />
          )}
        </div>
        
        <div>
          <TicketForm onTicketCreated={handleTicketCreated} />
        </div>
      </div>
    </div>
  );
}
