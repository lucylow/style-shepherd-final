/**
 * Style Shepherd Backend API Server
 * Main entry point for the backend API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import env from './config/env.js';
import vultrRoutes from './routes/vultr.js';
import apiRoutes from './routes/api.js';
import integrationsRoutes from './routes/integrations.js';
import raindropRoutes from './routes/raindrop.js';
import fraudRoutes from './routes/fraud.js';
import personalizationRoutes from './routes/personalization.js';
import adminRoutes from './routes/admin.js';
import specializedAgentsRoutes from './routes/specialized-agents.js';
import workflowRoutes from './routes/workflows.js';
import shoppingSessionsRoutes from './routes/shopping-sessions.js';
import guardrailsRoutes from './routes/guardrails.js';
import errorRoutes from './routes/errors.js';
import monitoringRoutes from './routes/monitoring.js';
import trendAnalysisRoutes from './routes/trend-analysis.js';
import { vultrPostgres } from './lib/vultr-postgres.js';
import { vultrValkey } from './lib/vultr-valkey.js';
import { initRaindrop } from './lib/raindropClient.js';
import { initializeGuardrails } from './lib/guardrails/index.js';
import { initProviders } from './lib/initProviders.js';
import { monitoringMiddleware, contextMiddleware } from './middleware/monitoring.js';
import { responseWrapper } from './middleware/responseWrapper.js';
import { logger } from './lib/monitoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // For Lovable/Raindrop deployment, allow same-origin requests
        callback(null, true); // Allow all origins in production (adjust as needed)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing - IMPORTANT: Stripe webhooks need raw body for signature verification
// We need to handle webhook route separately with raw body, then use JSON for other routes
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring middleware - must be after body parsing but before routes
app.use(monitoringMiddleware);
app.use(contextMiddleware);

// Response wrapper - wraps all responses in ApiResponse format
app.use(responseWrapper);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const [postgresHealth, valkeyHealth] = await Promise.all([
      vultrPostgres.healthCheck(),
      vultrValkey.healthCheck(),
    ]);

    res.json({
      status: 'healthy',
      services: {
        postgres: postgresHealth,
        valkey: valkeyHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service health check failed',
    });
  }
});

// Initialize Raindrop client (with mock fallback if key missing)
// Note: This is async but we don't await to avoid blocking server startup
// For Cloudflare, KV will be passed via env
initRaindrop().catch((err) => {
  console.warn('Raindrop initialization error (will use mock mode):', err);
});

// Initialize provider registry
initProviders().catch((err) => {
  console.warn('Provider initialization error:', err);
});

// Initialize guardrails framework
initializeGuardrails();

// API routes
app.use('/api/vultr', vultrRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/raindrop', raindropRoutes);
app.use('/api/admin/fraud', fraudRoutes);
app.use('/api/personalize', personalizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', specializedAgentsRoutes);
app.use('/api/shopping', shoppingSessionsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/guardrails', guardrailsRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/functions', trendAnalysisRoutes);
// Note: returns-predictor routes are mounted under /api/agents/returns-predictor in apiRoutes
app.use('/api', apiRoutes);

// Serve static files from client build in production
if (env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    console.log(`📦 Serving static files from ${clientDist}`);
  }
}

// Root endpoint - serve API info or redirect to client
app.get('/', (req: express.Request, res: express.Response) => {
  // If in production and static files exist, serve index.html
  if (env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '..', '..', 'dist');
    const indexHtml = path.join(clientDist, 'index.html');
    if (existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
  }
  
  // Otherwise return API info
  res.json({
    name: 'Style Shepherd API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      vultr: '/api/vultr',
      api: '/api',
    },
  });
});

// Error handling middleware
import { AppError, isAppError, toAppError } from './lib/errors.js';
import { logError } from './lib/errorLogger.js';

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Convert to AppError if needed
  const error = isAppError(err) ? err : toAppError(err);
  
  // Log error with structured logging
  logError(error, req);
  
  // Send error response
  // Don't expose internal error details in production for non-operational errors
  const shouldExposeDetails = env.NODE_ENV === 'development' || error.isOperational;
  
  res.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(shouldExposeDetails && { details: error.details }),
      timestamp: error.timestamp.toISOString(),
    },
  });
});

// 404 handler - for SPA routing in production
app.use((req: express.Request, res: express.Response) => {
  // If in production and requesting a non-API route, serve index.html for SPA routing
  if (env.NODE_ENV === 'production' && !req.path.startsWith('/api') && req.path !== '/health') {
    const clientDist = path.join(__dirname, '..', '..', 'dist');
    const indexHtml = path.join(clientDist, 'index.html');
    if (existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
  }
  
  // Otherwise return 404 JSON
  res.status(404).json({ error: 'Route not found' });
});

// Start server - use PORT from environment (required for Lovable/Heroku)
const PORT = process.env.PORT || env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Style Shepherd API server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Global error handlers for unhandled errors
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Log with structured logging
  logError(error);
  // Give time for logs to flush, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log with structured logging
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError(error);
  // Don't exit on unhandled rejection, but log it
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await vultrPostgres.close();
    await vultrValkey.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await vultrPostgres.close();
    await vultrValkey.close();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

