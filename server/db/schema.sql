-- SLAVE Database Schema
-- SQLite via better-sqlite3

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────────────────────────────────────
-- tickets
-- Core record for each support request.
-- LLM classification outputs and pipeline results are stored as flat columns
-- for simple querying without joins on the critical read path.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  subject            TEXT    NOT NULL,
  body               TEXT    NOT NULL,
  customer_name      TEXT    NOT NULL,
  customer_email     TEXT    NOT NULL,

  -- lifecycle
  status             TEXT    NOT NULL DEFAULT 'pending',
                     -- pending | processing | completed | failed

  -- LLM classification outputs
  priority           TEXT,  -- critical | high | medium | low
  category           TEXT,  -- billing | technical | account | delivery | refund | general
  department         TEXT,  -- finance | engineering | support | operations
  summary            TEXT,  -- one-line LLM summary of the ticket
  intent             TEXT,  -- what the customer wants to achieve
  recommended_action TEXT,  -- resolve | escalate | create_incident | create_kb
  analysis_source    TEXT,  -- gemini | fallback

  -- automation decision & execution (Phase 3+)
  action_taken       TEXT,  -- resolve | escalate | create_incident | create_kb
  action_detail      TEXT,  -- JSON blob with action-specific context

  -- generated customer reply (Phase 3+)
  customer_response  TEXT,

  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log
-- Append-only log. Each pipeline step writes a row on start and on
-- completion or error. Gives a full trace for every ticket.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  step       TEXT    NOT NULL,
             -- classify | decide | execute | respond | complete
  status     TEXT    NOT NULL,
             -- started | done | error
  detail     TEXT,  -- plain text or JSON note
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- automation_runs
-- One row per full pipeline execution. Used for dashboard metrics:
-- success rate, average duration, error analysis.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL,
               -- running | completed | failed
  started_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms  INTEGER,
  error        TEXT    -- error message if status = failed
);

-- ─────────────────────────────────────────────────────────────────────────────
-- escalations
-- Created by the 'escalate' action. One row per escalated ticket.
-- Routed to the appropriate department for human review.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  department  TEXT    NOT NULL,  -- finance | engineering | support | operations
  priority    TEXT    NOT NULL,  -- critical | high | medium | low
  reason      TEXT    NOT NULL,  -- why this was escalated
  status      TEXT    NOT NULL DEFAULT 'open',
               -- open | in_progress | resolved | closed
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- incidents
-- Created by the 'create_incident' action for service disruptions.
-- Tracked separately from tickets for engineering triage.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  department  TEXT    NOT NULL,
  priority    TEXT    NOT NULL,
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'open',
               -- open | investigating | resolved | closed
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- knowledge_articles
-- Created by the 'create_kb' action for common/informational questions.
-- Articles start as 'draft' and can be published by the content team.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  content     TEXT    NOT NULL,  -- Markdown body generated from ticket
  status      TEXT    NOT NULL DEFAULT 'draft',
               -- draft | published | archived
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority      ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at    ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_ticket      ON audit_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_runs_ticket           ON automation_runs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalations_ticket    ON escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status    ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_incidents_ticket      ON incidents(ticket_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status      ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_kb_ticket             ON knowledge_articles(ticket_id);
