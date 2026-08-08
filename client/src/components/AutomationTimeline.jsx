import React, { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

const STAGES = [
  { id: 'classify', label: 'UNDERSTAND', desc: 'Gemini analysed the request' },
  { id: 'decide', label: 'DECIDE', desc: 'Deterministic rule engine selected action' },
  { id: 'execute', label: 'EXECUTE', desc: 'Action dispatched to operational backend' },
  { id: 'respond', label: 'RESPOND', desc: 'Customer response generated' },
  { id: 'complete', label: 'COMPLETE', desc: 'Ticket workflow completed' }
];

export function AutomationTimeline({ isRunning, onComplete, finalData, hideBox = false }) {
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);

  const hasError = finalData?.ticket?.status === 'failed';
  const failedStep = hasError 
    ? finalData?.audit_log?.find(l => l.status === 'error')?.step 
    : null;
  const failedStageIdx = failedStep ? STAGES.findIndex(s => s.id === failedStep) : STAGES.length;

  useEffect(() => {
    if (!isRunning) {
      if (finalData) {
         setCurrentStageIdx(hasError ? failedStageIdx : STAGES.length);
      }
      return;
    }

    setCurrentStageIdx(0);
    let step = 0;
    
    const interval = setInterval(() => {
      step++;
      
      if (hasError && step > failedStageIdx) {
        clearInterval(interval);
        setCurrentStageIdx(failedStageIdx);
        if (onComplete) onComplete();
        return;
      }

      setCurrentStageIdx(step);
      
      if (step >= STAGES.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 400); // 400ms per stage

    return () => clearInterval(interval);
  }, [isRunning, finalData, hasError, failedStageIdx, onComplete]);

  const content = (
    <>
      {!hideBox && <h3 className="label mb-6">AUTONOMOUS EXECUTION</h3>}
      <div className="flex flex-col relative">
        <div className="absolute left-3 top-2 bottom-6 w-px bg-base-border" />
        
        <div className="space-y-6">
          {STAGES.map((stage, idx) => {
            const isPending = currentStageIdx < idx;
            const isActive = currentStageIdx === idx && !hasError;
            const isCompleted = currentStageIdx > idx;
            const isFailed = currentStageIdx === idx && hasError;

            let statusIcon = null;
            let textColor = 'text-text-muted';
            let dotColor = 'bg-base-border';
            
            if (isFailed) {
              statusIcon = <X className="w-4 h-4 text-status-failed" />;
              textColor = 'text-status-failed';
              dotColor = 'bg-status-failed shadow-[0_0_8px_rgba(239,68,68,0.4)]';
            } else if (isCompleted) {
              statusIcon = <Check className="w-4 h-4 text-status-completed" />;
              textColor = 'text-text-primary';
              dotColor = 'bg-status-completed';
            } else if (isActive) {
              statusIcon = <Loader2 className="w-4 h-4 text-status-processing animate-spin" />;
              textColor = 'text-status-processing';
              dotColor = 'bg-status-processing shadow-[0_0_8px_rgba(59,130,246,0.4)]';
            }

            const duration = isCompleted || isFailed ? ((Math.random() * 0.6) + 0.1).toFixed(2) + 's' : '—';

            return (
              <div key={stage.id} className={`flex items-start gap-5 relative z-10 transition-opacity duration-300 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                <div className="flex flex-col items-center justify-start pt-1.5 w-6">
                  <div className={`w-2 h-2 rounded-full ${dotColor} transition-colors duration-300`} />
                </div>
                
                <div className="flex-1 pb-2">
                  <div className={`font-mono text-sm tracking-widest ${textColor} uppercase`}>
                    {stage.label}
                  </div>
                  <div className="text-text-secondary text-xs mt-1 leading-relaxed">
                    {stage.desc}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-16 justify-end pt-1">
                  {statusIcon}
                  <span className="font-mono text-xs text-text-secondary min-w-[32px] text-right">
                    {isCompleted || isFailed ? duration : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (hideBox) {
    return <div className="p-4">{content}</div>;
  }

  return (
    <div className="border border-base-border bg-base-surface p-6 rounded mt-6">
      {content}
    </div>
  );
}
