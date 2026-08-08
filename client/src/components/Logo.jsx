import React from 'react';

export function Logo({ className = '' }) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Slashed geometric block */}
      <path d="M4 2L2 6V18L4 22H20L22 18V6L20 2H4Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 6L10 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 10L18 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 4" />
    </svg>
  );
}
