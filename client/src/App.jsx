import { useState } from 'react';
import { Header } from './components/Header';
import { Operations } from './pages/Operations';
import { Tickets } from './pages/Tickets';
import { Automation } from './pages/Automation';

export default function App() {
  const [currentView, setCurrentView] = useState('operations');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const handleSetView = (view) => {
    setCurrentView(view);
    if (view !== 'automation') {
      setSelectedTicketId(null);
    }
  };

  const handleSelectTicket = (id) => {
    setSelectedTicketId(id);
    setCurrentView('automation');
  };

  return (
    <div className="min-h-screen bg-base-bg text-text-primary flex flex-col font-sans">
      <Header currentView={currentView} setView={handleSetView} />

      <main className="flex-1 overflow-y-auto">
        {currentView === 'operations' && (
          <Operations onSelectTicket={handleSelectTicket} />
        )}
        
        {currentView === 'tickets' && (
          <Tickets onSelectTicket={handleSelectTicket} />
        )}
        
        {currentView === 'automation' && selectedTicketId && (
          <Automation ticketId={selectedTicketId} />
        )}
      </main>
    </div>
  );
}
