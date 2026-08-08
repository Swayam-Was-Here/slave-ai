import React from 'react';
import { Logo } from './Logo';

export function Header({ currentView, setView }) {
  return (
    <header className="border-b-4 border-base-border px-8 py-4 flex items-center justify-between bg-base-bg">
      <div className="flex items-center gap-12">
        <Logo className="text-text-primary" />
        
        <nav className="flex items-center gap-4">
          <button 
            onClick={() => setView('operations')}
            className={`px-4 py-2 text-sm font-bold tracking-widest uppercase border-3 border-transparent transition-colors ${currentView === 'operations' ? 'bg-text-primary text-base-surface border-text-primary shadow-neo' : 'text-text-primary hover:border-base-border'}`}
          >
            Operations
          </button>
          <button 
            onClick={() => setView('tickets')}
            className={`px-4 py-2 text-sm font-bold tracking-widest uppercase border-3 border-transparent transition-colors ${currentView === 'tickets' ? 'bg-text-primary text-base-surface border-text-primary shadow-neo' : 'text-text-primary hover:border-base-border'}`}
          >
            Tickets
          </button>
        </nav>
      </div>
      
      <div className="flex items-center gap-3 bg-base-surface px-4 py-2 border-3 border-base-border shadow-neo">
        <span className="w-3 h-3 bg-accent-green border-2 border-base-border" />
        <span className="text-sm font-mono font-bold text-text-primary tracking-widest uppercase">SYSTEM NOMINAL</span>
      </div>
    </header>
  );
}
