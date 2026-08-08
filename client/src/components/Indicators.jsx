import React from 'react';

export function PriorityIndicator({ priority }) {
  const colors = {
    critical: 'bg-accent-red text-base-surface',
    high:     'bg-accent-yellow text-text-primary',
    medium:   'bg-accent-blue text-base-surface',
    low:      'bg-accent-green text-base-surface',
  };

  const style = colors[priority] || colors.medium;

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold font-mono tracking-widest uppercase border-3 border-base-border shadow-neo ${style}`}>
      {priority?.toUpperCase() || 'UNKNOWN'}
    </span>
  );
}

export function StatusIndicator({ status }) {
  const styles = {
    pending:    'bg-text-muted',
    processing: 'bg-accent-blue',
    completed:  'bg-accent-green',
    failed:     'bg-accent-red',
  };

  const colorClass = styles[status] || styles.pending;

  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 border-2 border-base-border ${colorClass}`} />
      <span className="text-xs font-bold font-mono uppercase tracking-widest text-text-primary">
        {status}
      </span>
    </div>
  );
}
