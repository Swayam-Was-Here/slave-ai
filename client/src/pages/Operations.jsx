import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetricsStrip } from '../components/MetricsStrip';
import { TicketTable } from '../components/TicketTable';

export function Operations({ onSelectTicket }) {
  const [metrics, setMetrics] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
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
        }
      } catch (err) {
        console.error('Failed to load operations data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s for operations console
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-text-muted font-mono text-sm">INITIALIZING CONSOLE...</div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-300">
      <MetricsStrip metrics={metrics} />
      
      <div className="mt-12">
        <h2 className="label mb-4">RECENT AUTOMATIONS</h2>
        <TicketTable tickets={recentTickets} onSelectTicket={onSelectTicket} />
      </div>
    </div>
  );
}
