import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function AuditTrail({ auditLog }) {
  const [expanded, setExpanded] = useState(false);

  if (!auditLog || auditLog.length === 0) return null;

  return (
    <div className="mt-12 neo-box">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 bg-base-surface hover:bg-base-hover transition-colors border-b-3 border-transparent"
      >
        <span className="label text-lg">SYSTEM AUDIT TRAIL</span>
        {expanded ? <ChevronUp className="w-6 h-6 text-text-primary" /> : <ChevronDown className="w-6 h-6 text-text-primary" />}
      </button>

      {expanded && (
        <div className="p-6 bg-base-bg border-t-3 border-base-border space-y-3">
          {auditLog.map((log) => {
            const time = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
            return (
              <div key={log.id} className="grid grid-cols-[140px_1fr] gap-6 p-2 hover:bg-base-hover transition-colors">
                <div className="font-mono text-sm font-bold text-text-muted">{time}</div>
                <div className="font-mono text-sm font-bold">
                  <span className="text-text-primary mr-4 uppercase tracking-widest">{log.step}</span>
                  <span className={`uppercase tracking-widest ${log.status === 'error' ? 'text-status-failed bg-status-failed/10 px-2 py-0.5' : 'text-text-secondary'}`}>
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
