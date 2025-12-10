/**
 * Simple Express server shim for Lovable deployment
 * Serves the client build (dist/) and provides /health endpoint
 * Falls back to this if TypeScript server isn't built
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

// Serve static files (Vite -> dist)
const clientDist = path.join(__dirname, '..', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  console.log(`📦 Serving static files from ${clientDist}`);
  
  // Fallback to index.html for SPA routing (except API routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    const indexHtml = path.join(clientDist, 'index.html');
    if (existsSync(indexHtml)) {
      res.sendFile(path.resolve(indexHtml));
    } else {
      next();
    }
  });
} else {
  console.warn(`⚠️  Client build not found at ${clientDist}. Run 'npm run build' first.`);
}

// Health check endpoint (required for Lovable)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    mode: 'simple-server'
  });
});

// Basic API ping endpoint
app.get('/api/ping', (req, res) => {
  res.json({ 
    pong: true, 
    env: process.env.NODE_ENV || 'dev',
    mode: 'simple-server'
  });
});

// 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not available in simple server mode' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server started on port ${PORT}`);
  console.log(`📊 Serving client from ${clientDist}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
