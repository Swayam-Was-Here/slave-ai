import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function AuditTrail({ auditLog }) {
  const [expanded, setExpanded] = useState(false);

  if (!auditLog || auditLog.length === 0) return null;

  return (
    <div className="mt-8 border border-base-border rounded overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-base-surface hover:bg-base-hover transition-colors"
      >
        <span className="label">SYSTEM AUDIT TRAIL</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
      </button>

      {expanded && (
        <div className="p-4 bg-base-bg border-t border-base-border space-y-2">
          {auditLog.map((log) => {
            const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={log.id} className="grid grid-cols-[100px_1fr] gap-4">
                <div className="font-mono text-xs text-text-muted">{time}</div>
                <div className="font-mono text-xs text-text-secondary">
                  <span className="text-text-primary mr-2">{log.step}</span>
                  <span className={log.status === 'error' ? 'text-status-failed' : 'text-text-secondary'}>
                    {log.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
