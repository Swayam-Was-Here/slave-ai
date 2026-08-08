import { useEffect, useState } from 'react';
import './App.css';

/**
 * Phase 1: App shell placeholder.
 * Verifies that the client can reach the server health endpoint.
 * Will be replaced with the full console UI in Phase 2+.
 */
function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-base-bg text-text-primary flex flex-col">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="border-b border-base-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">SLAVE</span>
          <span className="text-text-muted text-xs">·</span>
          <span className="label">Support Automation Console</span>
        </div>
        <span className="label">Phase 1 — Foundation</span>
      </header>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">

          {/* Server health card */}
          <div className="border border-base-border bg-base-surface p-6 space-y-4">
            <p className="label">Server Health</p>

            {error && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-failed flex-shrink-0" />
                <span className="text-status-failed text-sm">{error}</span>
              </div>
            )}

            {!health && !error && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-processing animate-pulse flex-shrink-0" />
                <span className="text-text-secondary text-sm">Connecting to server…</span>
              </div>
            )}

            {health && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      health.status === 'ok' ? 'bg-status-completed' : 'bg-status-failed'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {health.status === 'ok' ? 'Operational' : 'Degraded'}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-base-border">
                  <Row label="Service" value={health.service} />
                  <Row label="Version" value={health.version} />
                  <Row label="Uptime" value={`${health.uptime_s}s`} />
                  <Row label="Database" value={health.db?.status ?? '—'} />
                  <Row label="Timestamp" value={health.timestamp} mono />
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-text-muted text-xs">
            Phase 1 complete. Ticket UI will be implemented in Phase 2.
          </p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-text-secondary text-xs">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-text-secondary' : 'text-text-primary'}`}>
        {value}
      </span>
    </div>
  );
}

export default App;
