import React from 'react';
import { Activity } from 'lucide-react';

export function Header({ currentView, setView }) {
  return (
    <header className="border-b border-base-border px-8 py-5 flex items-center justify-between bg-base-bg">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-status-processing" />
          <span className="text-base font-semibold tracking-tight text-text-primary">SLAVE</span>
          <span className="text-text-muted text-xs">·</span>
          <span className="label">Support Automation Console</span>
        </div>
        
        <nav className="flex items-center gap-4 ml-8">
          <button 
            onClick={() => setView('operations')}
            className={`text-sm font-medium transition-colors ${currentView === 'operations' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Operations
          </button>
          <button 
            onClick={() => setView('tickets')}
            className={`text-sm font-medium transition-colors ${currentView === 'tickets' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Tickets
          </button>
        </nav>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-completed shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        <span className="text-xs font-mono text-text-secondary tracking-wide">SYSTEM NOMINAL</span>
      </div>
    </header>
  );
}
