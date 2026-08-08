import React from 'react';

export function MetricsStrip({ metrics }) {
  if (!metrics) return null;

  const { run_stats } = metrics;
  const total = run_stats?.total_runs || 0;
  const completed = run_stats?.completed || 0;
  const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
  const avgTime = run_stats?.avg_duration_ms ? (run_stats.avg_duration_ms / 1000).toFixed(2) : '0.00';

  const active = metrics.by_status?.find(s => s.status === 'processing')?.count || 0;

  return (
    <div className="flex items-center gap-12 py-6 border-b border-base-border">
      <MetricItem label="AUTOMATIONS" value={total.toLocaleString()} />
      <MetricItem label="SUCCESS RATE" value={`${successRate}%`} />
      <MetricItem label="AVG. RUN" value={`${avgTime}s`} />
      <MetricItem label="ACTIVE" value={active.toString().padStart(2, '0')} highlight={active > 0} />
    </div>
  );
}

function MetricItem({ label, value, highlight }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <span className={`font-mono text-2xl tracking-tight ${highlight ? 'text-status-processing' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}
