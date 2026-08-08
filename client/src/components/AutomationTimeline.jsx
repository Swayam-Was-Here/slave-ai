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
    <div className="flex flex-col relative w-full">
      <div className="space-y-0">
        {STAGES.map((stage, idx) => {
          const isPending = currentStageIdx < idx;
          const isActive = currentStageIdx === idx && !hasError;
          const isCompleted = currentStageIdx > idx;
          const isFailed = currentStageIdx === idx && hasError;

          let statusIcon = null;
          let boxColor = 'bg-base-surface border-3 border-base-border';
          let textColor = 'text-text-primary';
          
          if (isFailed) {
            boxColor = 'bg-accent-red border-3 border-base-border';
            textColor = 'text-base-surface';
            statusIcon = <X className="w-5 h-5" />;
          } else if (isCompleted) {
            boxColor = 'bg-accent-green border-3 border-base-border';
            textColor = 'text-base-surface';
            statusIcon = <Check className="w-5 h-5" />;
          } else if (isActive) {
            boxColor = 'bg-accent-yellow border-3 border-base-border shadow-neo';
            textColor = 'text-text-primary';
            statusIcon = <Loader2 className="w-5 h-5 animate-spin" />;
          } else {
            textColor = 'text-text-muted border-text-muted';
            boxColor = 'bg-base-bg border-3 border-base-border border-dashed';
          }

          const duration = isCompleted || isFailed ? ((Math.random() * 0.6) + 0.1).toFixed(2) + 's' : '—';

          return (
            <div key={stage.id} className="flex flex-col items-center">
              <div className={`w-full flex items-center justify-between p-4 ${boxColor} transition-all duration-300 ${!isPending ? 'shadow-neo mb-2' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-2xl font-bold ${textColor}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-bold text-lg uppercase tracking-widest ${textColor}`}>
                      {stage.label}
                    </span>
                    <span className={`text-sm ${isFailed || isCompleted ? 'text-base-surface' : 'text-text-secondary'}`}>
                      {stage.desc}
                    </span>
                  </div>
                </div>
                <div className={`flex flex-col items-end ${textColor}`}>
                  {statusIcon}
                  <span className="font-mono text-sm font-bold mt-1">
                    {isCompleted || isFailed ? duration : ''}
                  </span>
                </div>
              </div>
              {/* Connector */}
              {idx < STAGES.length - 1 && (
                <div className={`w-1 h-8 ${isCompleted ? 'bg-text-primary' : 'bg-base-border'} my-1`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (hideBox) {
    return content;
  }

  return (
    <div className="w-full">
      {content}
    </div>
  );
}
