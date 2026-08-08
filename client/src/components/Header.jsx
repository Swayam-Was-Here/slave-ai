import React from 'react';
import { Logo } from './Logo';

export function Header({ currentView, setView }) {
  return (
    <header className="border-b border-base-border px-8 py-4 flex items-center justify-between bg-base-bg">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
          <Logo className="w-6 h-6 text-text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-text-primary uppercase">SLAVE</span>
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Support Automation Console</span>
          </div>
        </div>
        
        <nav className="flex items-center gap-6">
          <button 
            onClick={() => setView('operations')}
            className={`text-xs font-mono tracking-widest uppercase transition-colors ${currentView === 'operations' ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Operations
          </button>
          <button 
            onClick={() => setView('tickets')}
            className={`text-xs font-mono tracking-widest uppercase transition-colors ${currentView === 'tickets' ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Tickets
          </button>
        </nav>
      </div>
      
      <div className="flex items-center gap-3 bg-base-surface px-3 py-1.5 rounded border border-base-border">
        <span className="w-2 h-2 rounded-full bg-status-completed" />
        <span className="text-xs font-mono text-text-secondary tracking-wide">SYSTEM NOMINAL</span>
      </div>
    </header>
  );
}
