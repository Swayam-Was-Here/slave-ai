import React from 'react';

export function PriorityIndicator({ priority }) {
  const colors = {
    critical: 'text-priority-critical bg-priority-critical/10 border-priority-critical/20',
    high:     'text-priority-high bg-priority-high/10 border-priority-high/20',
    medium:   'text-priority-medium bg-priority-medium/10 border-priority-medium/20',
    low:      'text-priority-low bg-priority-low/10 border-priority-low/20',
  };

  const style = colors[priority] || colors.medium;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${style}`}>
      {priority?.toUpperCase() || 'UNKNOWN'}
    </span>
  );
}

export function StatusIndicator({ status }) {
  const styles = {
    pending:    'text-status-pending',
    processing: 'text-status-processing',
    completed:  'text-status-completed',
    failed:     'text-status-failed',
  };

  const colorClass = styles[status] || styles.pending;

  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'processing' ? 'animate-pulse' : ''} ${colorClass.replace('text-', 'bg-')}`} />
      <span className={`text-xs font-mono uppercase tracking-wider ${colorClass}`}>
        {status}
      </span>
    </div>
  );
}
