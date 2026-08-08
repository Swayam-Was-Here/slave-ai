import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path — defaults to ./slave.db next to the server root.
// Override with DATABASE_PATH or DB_PATH env var if needed.
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || join(__dirname, '..', 'slave.db');

let _db = null;

/**
 * Returns the singleton better-sqlite3 Database instance.
 * Initialises the schema on first call.
 */
export function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH, {
    // Enable verbose logging in development only
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Apply schema (idempotent — all CREATE statements use IF NOT EXISTS)
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  _db.exec(schema);

  // ── Additive migration ─────────────────────────────────────────────────
  // SQLite has no "ALTER TABLE ADD COLUMN IF NOT EXISTS", so we attempt each
  // new column individually and swallow the "duplicate column" error.
  // This keeps the server safe against both fresh and existing databases.
  const newColumns = [
    'ALTER TABLE tickets ADD COLUMN intent TEXT',
    'ALTER TABLE tickets ADD COLUMN recommended_action TEXT',
    'ALTER TABLE tickets ADD COLUMN analysis_source TEXT',
    'ALTER TABLE tickets ADD COLUMN response_source TEXT',
  ];
  for (const sql of newColumns) {
    try {
      _db.exec(sql);
    } catch (e) {
      // Ignore "duplicate column name" — column already exists
      if (!e.message.includes('duplicate column name')) throw e;
    }
  }

  console.log(`[db] SQLite initialised → ${DB_PATH}`);
  return _db;
}

/**
 * Graceful shutdown — close the DB connection.
 * Called on SIGTERM / SIGINT so in-flight writes finish cleanly.
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[db] SQLite connection closed');
  }
}
