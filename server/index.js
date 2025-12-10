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

// Health check endpoint (required for Lovable) - must be before static files
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

// Serve static files (Vite -> dist)
const clientDist = path.join(__dirname, '..', 'dist');
if (existsSync(clientDist)) {
  // Serve static assets with proper caching
  // This will serve files like /assets/*, images, etc.
  app.use(express.static(clientDist, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
  }));
  console.log(`📦 Serving static files from ${clientDist}`);
  
  // SPA fallback: serve index.html for all non-API, non-file routes
  // This catches routes like /dashboard, /products, etc. for client-side routing
  app.get('*', (req, res) => {
    // Skip API routes and health check (shouldn't reach here, but safety check)
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Serve index.html for SPA routing
    const indexHtml = path.join(clientDist, 'index.html');
    if (existsSync(indexHtml)) {
      res.sendFile(path.resolve(indexHtml));
    } else {
      res.status(404).send('Not found');
    }
  });
} else {
  console.warn(`⚠️  Client build not found at ${clientDist}. Run 'npm run build' first.`);
  
  // Even without dist, provide basic endpoints
  app.get('/', (req, res) => {
    res.json({
      error: 'Frontend build not found',
      message: 'Please run "npm run build" first',
      health: '/health',
      api: '/api/ping'
    });
  });
}

// 404 for API routes that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not available in simple server mode',
    path: req.path
  });
});

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple server started on port ${PORT}`);
  console.log(`📊 Serving client from ${clientDist}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
