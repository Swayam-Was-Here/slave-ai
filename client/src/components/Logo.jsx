import React from 'react';

export function Logo({ className = '' }) {
  return (
    <div className={`font-sans font-bold tracking-tighter text-2xl uppercase ${className}`}>
      <span className="bg-text-primary text-base-surface px-2 py-0.5 border-3 border-text-primary mr-1">SL</span>
      AVE
    </div>
  );
}
