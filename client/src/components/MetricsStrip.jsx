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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      <MetricItem label="AUTOMATIONS" value={total.toLocaleString()} accentClass="bg-accent-yellow text-text-primary" />
      <MetricItem label="SUCCESS RATE" value={`${successRate}%`} accentClass="bg-accent-blue text-base-surface" />
      <MetricItem label="AVG. RUN" value={`${avgTime}s`} accentClass="bg-accent-green text-base-surface" />
      <MetricItem label="ACTIVE" value={active.toString().padStart(2, '0')} accentClass="bg-accent-red text-base-surface" />
    </div>
  );
}

function MetricItem({ label, value, accentClass }) {
  return (
    <div className="border-3 border-base-border bg-base-surface shadow-neo flex flex-col">
      <div className={`px-4 py-2 border-b-3 border-base-border font-bold text-xs tracking-widest uppercase ${accentClass}`}>
        {label}
      </div>
      <div className="px-4 py-6 font-mono text-4xl font-bold tracking-tighter text-text-primary">
        {value}
      </div>
    </div>
  );
}
