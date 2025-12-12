# Cloudflare Deployment Guide

This guide explains how to deploy Style Shepherd to Cloudflare Workers/Pages.

## Overview

Style Shepherd has been adapted to work with Cloudflare's edge computing platform. The application uses:

- **Cloudflare Workers** - For serverless API endpoints
- **Cloudflare KV** - For caching (replaces Redis/Valkey)
- **Cloudflare D1** - Optional SQLite database (or use external PostgreSQL)
- **Cloudflare R2** - Optional object storage (replaces file system operations)

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI** - Cloudflare's command-line tool
   ```bash
   npm install -g wrangler
   # or
   npm install wrangler --save-dev
   ```
3. **Cloudflare Authentication**
   ```bash
   wrangler login
   ```

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Cloudflare Resources

#### Create KV Namespace (for caching)

```bash
# Production namespace
wrangler kv:namespace create "CACHE"

# Preview namespace (for development)
wrangler kv:namespace create "CACHE" --preview
```

Update `wrangler.toml` with the returned namespace IDs:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-production-namespace-id"
preview_id = "your-preview-namespace-id"
```

#### Create D1 Database (optional)

```bash
wrangler d1 create style-shepherd-db
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "style-shepherd-db"
database_id = "your-database-id"
```

#### Create R2 Bucket (optional, for file storage)

```bash
wrangler r2 bucket create style-shepherd-storage
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "R2_STORAGE"
bucket_name = "style-shepherd-storage"
```

### 3. Set Environment Variables

Set secrets via Wrangler CLI:

```bash
# Required
wrangler secret put VULTR_POSTGRES_HOST
wrangler secret put VULTR_POSTGRES_USER
wrangler secret put VULTR_POSTGRES_PASSWORD
wrangler secret put VULTR_POSTGRES_DATABASE

# Optional API Keys
wrangler secret put RAINDROP_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put WORKOS_API_KEY

# Other configuration
wrangler secret put NODE_ENV
wrangler secret put CORS_ORIGIN
```

Or set them in the Cloudflare Dashboard:
1. Go to Workers & Pages → Your Worker → Settings → Variables
2. Add environment variables and secrets

### 4. Build and Deploy

```bash
# Build for Cloudflare
npm run cloudflare:build

# Deploy to Cloudflare
npm run cloudflare:deploy

# Or use wrangler directly
cd server
wrangler deploy
```

### 5. Development

For local development with Cloudflare:

```bash
npm run cloudflare:dev
```

This starts a local development server that mimics Cloudflare Workers.

## Architecture Differences

### File System Operations

Cloudflare Workers don't have access to the file system. The following changes were made:

- **File reads** → Use Cloudflare KV or R2 storage
- **File writes** → Use Cloudflare KV or R2 storage
- **Mock data** → Stored in KV instead of JSON files

### Database Connections

- **PostgreSQL** → Still connects via TCP (works on Cloudflare Workers)
- **Redis/Valkey** → Replaced with Cloudflare KV
- **SQLite** → Can use Cloudflare D1

### Express.js Routes

Express routes are adapted to work with Cloudflare's fetch API:

- Express `Request` → Cloudflare `Request`
- Express `Response` → Cloudflare `Response`
- Middleware → Adapted to work with fetch handlers

## Limitations

### Cloudflare Workers Constraints

1. **CPU Time Limits**
   - Free: 10ms CPU time per request
   - Paid: 50ms CPU time per request
   - Consider using Durable Objects for long-running tasks

2. **Memory Limits**
   - 128MB memory per worker

3. **No Node.js APIs**
   - File system, `process`, `Buffer` (with polyfills)
   - Use Cloudflare APIs instead

4. **Request Size Limits**
   - 100MB request body limit

### Workarounds

1. **Long-running tasks** → Use Cloudflare Queues + Durable Objects
2. **File storage** → Use R2 or external storage (S3, etc.)
3. **Large files** → Stream via R2 or external CDN

## Environment Detection

The code automatically detects Cloudflare environment:

```typescript
const isCloudflare = typeof caches !== 'undefined' && typeof EdgeRuntime !== 'undefined';
```

When running on Cloudflare:
- File system operations use KV/R2
- Redis operations use Cloudflare KV
- Express routes are adapted to fetch API

## Monitoring

Cloudflare provides built-in monitoring:

1. **Dashboard** → Workers & Pages → Your Worker → Metrics
2. **Logs** → Real-time logs in dashboard
3. **Analytics** → Request analytics and errors

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure all dependencies are compatible with Workers
   - Some Node.js modules won't work (use alternatives)

2. **Database connection timeouts**
   - Check firewall rules allow Cloudflare IPs
   - Use connection pooling
   - Consider using Cloudflare D1 instead

3. **Memory errors**
   - Reduce bundle size
   - Use dynamic imports
   - Optimize data structures

4. **Timeout errors**
   - Optimize CPU usage
   - Use Durable Objects for long tasks
   - Consider upgrading plan

### Debugging

Enable detailed logging:

```bash
wrangler dev --log-level debug
```

View logs in real-time:

```bash
wrangler tail
```

## Production Checklist

- [ ] All environment variables set
- [ ] KV namespaces created and configured
- [ ] Database connections tested
- [ ] CORS configured correctly
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)

## Support

For issues specific to Cloudflare deployment:
1. Check Cloudflare Workers documentation
2. Review error logs in Cloudflare dashboard
3. Test locally with `wrangler dev`
4. Check compatibility of dependencies
