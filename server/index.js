import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb, closeDb } from './db/database.js';
import healthRouter from './routes/health.js';
import ticketsRouter from './routes/tickets.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

// Request logger — development only
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/health', healthRouter);
app.use('/api/tickets', ticketsRouter);

// 404 handler — catches any unmatched route
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

// ─────────────────────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────────────────────

function start() {
  // Initialise DB before accepting traffic
  getDb();

  const server = app.listen(PORT, () => {
    console.log(`[server] SLAVE API running on http://localhost:${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // ─── Graceful shutdown ───────────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    server.close(() => {
      closeDb();
      console.log('[server] Clean exit');
      process.exit(0);
    });

    // Force-exit if server doesn't close within 5 s
    setTimeout(() => {
      console.error('[server] Forced exit after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
