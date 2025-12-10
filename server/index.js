// server/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // add to package.json if not present
const promClient = require('prom-client'); // add to package.json

const { runServiceChecks } = require('../lib/healthChecks');

const PORT = process.env.PORT || 3000;
const app = express();

// Prometheus metrics registry
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const requestCounter = new promClient.Counter({
  name: 'style_shepherd_requests_total',
  help: 'Total number of HTTP requests'
});

app.use((req, res, next) => {
  requestCounter.inc();
  next();
});

// Serve static build for SPA (Vite -> dist)
const distDir = path.join(process.cwd(), 'dist');
const nextDir = path.join(process.cwd(), '.next');

if (fs.existsSync(nextDir)) {
  console.log('Next.js build detected. Ensure you run `next start` in production (lovable.yml may set start_command for Next).');
} else if (fs.existsSync(distDir)) {
  console.log('Serving static files from /dist');
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/metrics' || req.path === '/ready' || req.path === '/status') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn('No build detected (dist/ or .next/). Server will still expose health endpoints.');
}

// Health endpoint (fast)
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Readiness - do lightweight checks (no network)
app.get('/ready', (req, res) => {
  // For production you might check DB connections or file system readiness
  const ready = true;
  res.json({ ready, ts: new Date().toISOString() });
});

// Status: expensive checks for external integrations (safe, does not leak secrets)
app.get('/status', async (req, res) => {
  try {
    const results = await runServiceChecks();
    res.json({ ok: true, checks: results, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Basic ping
app.get('/api/ping', (req, res) => res.json({ pong: true, env: process.env.NODE_ENV || 'development' }));

// Graceful shutdown
let shuttingDown = false;
process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('SIGTERM received: shutting down gracefully');
  setTimeout(() => process.exit(0), 5000);
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Status: http://localhost:${PORT}/status`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
});
