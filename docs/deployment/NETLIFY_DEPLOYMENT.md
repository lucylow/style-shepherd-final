# Netlify Deployment Guide for Style Shepherd AI Application

This guide covers deploying your AI-powered Style Shepherd application to Netlify.

## Table of Contents
- [Quick Start](#quick-start)
- [Frontend Deployment](#frontend-deployment)
- [Backend Options](#backend-options)
- [Environment Variables](#environment-variables)
- [Custom Domain Setup](#custom-domain-setup)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Prerequisites
- Netlify account (free tier works)
- GitHub/GitLab/Bitbucket repository with your code
- Backend API deployed separately (see [Backend Options](#backend-options))

### 2. Deploy via Netlify UI

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select the repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - These are already configured in `netlify.toml`

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required variables (see [Environment Variables](#environment-variables))

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your frontend

### 3. Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (first time only)
netlify init

# Deploy
netlify deploy --prod
```

## Frontend Deployment

The frontend is configured to build with Vite and deploy to Netlify's CDN.

### Build Process
- **Build Command**: `npm run build` (runs `vite build`)
- **Output Directory**: `dist/`
- **Node Version**: 18+ (configured in `netlify.toml`)

### SPA Routing
- All routes are handled by `index.html` via redirects
- Configured in `netlify.toml` and `public/_redirects`

## Backend Options

Since your application has a complex Express backend, you have several options:

### Option 1: Separate Backend Hosting (Recommended)

Deploy your backend separately and proxy API requests:

**Backend Hosting Options:**
- **Railway** (recommended for Node.js apps)
- **Render**
- **Fly.io**
- **DigitalOcean App Platform**
- **Heroku**
- **AWS/GCP/Azure**

**Setup:**
1. Deploy backend to your chosen platform
2. Get your backend URL (e.g., `https://api.style-shepherd.com`)
3. Update `netlify.toml` redirects section:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-backend-url.com/api/:splat"
     status = 200
     force = true
   ```
4. Set `VITE_API_BASE_URL` environment variable in Netlify:
   ```
   VITE_API_BASE_URL=https://your-backend-url.com/api
   ```

### Option 2: Netlify Functions (Serverless)

Convert Express routes to Netlify Functions:

**Pros:**
- Integrated with Netlify
- Serverless scaling
- No separate backend to manage

**Cons:**
- Requires refactoring Express routes
- Function size limits (50MB)
- Cold start latency

**Setup:**
1. Create `netlify/functions/` directory
2. Convert Express routes to serverless functions
3. See [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)

### Option 3: Netlify Edge Functions

For lightweight API routes:

**Use Cases:**
- Simple API proxies
- Request/response transformations
- A/B testing

**Setup:**
1. Create `netlify/edge-functions/` directory
2. Write edge functions in TypeScript/JavaScript
3. See [Netlify Edge Functions Docs](https://docs.netlify.com/edge-functions/overview/)

## Environment Variables

Set these in **Netlify Dashboard → Site settings → Environment variables**:

### Required Frontend Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend-url.com/api

# Stripe (if using payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# WorkOS (if using authentication)
VITE_WORKOS_CLIENT_ID=client_...

# Vultr Services (if using)
VITE_VULTR_POSTGRES_API_ENDPOINT=https://your-backend-url.com/api/vultr/postgres
VITE_VULTR_VALKEY_API_ENDPOINT=https://your-backend-url.com/api/vultr/valkey

# Raindrop (if using)
VITE_RAINDROP_BASE_URL=https://api.raindrop.io
```

### Optional Frontend Variables

```bash
# Feature flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_AI_ASSISTANT=true

# Analytics (if using)
VITE_ANALYTICS_ID=your-analytics-id
```

### Backend Variables (if using Netlify Functions)

If deploying backend as Netlify Functions, also set:

```bash
# Server Configuration
NODE_ENV=production
PORT=8888

# Raindrop Platform
RAINDROP_API_KEY=your_key
RAINDROP_PROJECT_ID=your_project_id

# Vultr Services
VULTR_POSTGRES_HOST=your-postgres-host.vultr.com
VULTR_POSTGRES_PORT=5432
VULTR_POSTGRES_DATABASE=style_shepherd
VULTR_POSTGRES_USER=your_username
VULTR_POSTGRES_PASSWORD=your_password
VULTR_POSTGRES_SSL=true

VULTR_VALKEY_HOST=your-valkey-host.vultr.com
VULTR_VALKEY_PORT=6379
VULTR_VALKEY_PASSWORD=your_password
VULTR_VALKEY_TLS=true

# AI Services
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Third-party Services
WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGIN=https://your-netlify-site.netlify.app
```

## Custom Domain Setup

1. **Add Domain in Netlify**
   - Go to Site settings → Domain management
   - Click "Add custom domain"
   - Enter your domain (e.g., `style-shepherd.com`)

2. **Configure DNS**
   - Add CNAME record pointing to your Netlify site
   - Or add A record for apex domain (Netlify will provide IPs)

3. **SSL Certificate**
   - Netlify automatically provisions SSL via Let's Encrypt
   - HTTPS is enabled by default

4. **Update Environment Variables**
   - Update `CORS_ORIGIN` in backend to include your custom domain
   - Update `VITE_API_BASE_URL` if needed

## Build Optimization

### Performance Tips

1. **Enable Build Plugins**
   - Netlify automatically optimizes images
   - Enable compression in `netlify.toml`

2. **Cache Dependencies**
   - Netlify caches `node_modules` automatically
   - Builds are faster on subsequent deploys

3. **Split Builds**
   - Use Vite's code splitting
   - Lazy load routes and components

### Build Time Optimization

```toml
[build]
  # Use npm ci for faster, reliable builds
  command = "npm ci && npm run build"
  
[build.environment]
  # Cache node_modules
  NPM_FLAGS = "--legacy-peer-deps"
```

## Continuous Deployment

Netlify automatically deploys on:
- Push to main branch → Production
- Pull requests → Deploy previews
- Other branches → Branch deploys

### Deploy Previews

- Each PR gets a unique preview URL
- Test changes before merging
- Share preview links with team

## Monitoring & Analytics

### Netlify Analytics

1. Enable in Site settings → Analytics
2. View:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Build times

### Error Tracking

Consider integrating:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Datadog** for APM

## Troubleshooting

### Build Failures

**Issue**: Build fails with dependency errors
```bash
# Solution: Update netlify.toml
[build.environment]
  NPM_FLAGS = "--legacy-peer-deps"
```

**Issue**: Build timeout
```bash
# Solution: Increase build timeout in netlify.toml
[build]
  command = "npm run build"
  timeout = 300  # seconds
```

### API Connection Issues

**Issue**: CORS errors
```bash
# Solution: Update backend CORS_ORIGIN
CORS_ORIGIN=https://your-netlify-site.netlify.app,https://your-custom-domain.com
```

**Issue**: API requests fail
```bash
# Solution: Check VITE_API_BASE_URL is set correctly
# Use browser DevTools Network tab to debug
```

### Routing Issues

**Issue**: 404 on page refresh
```bash
# Solution: Ensure _redirects file exists in public/
# Check netlify.toml redirects configuration
```

### Environment Variables Not Working

**Issue**: Variables not available at build time
```bash
# Solution: 
# 1. Variables prefixed with VITE_ are available in frontend
# 2. Set in Netlify UI, not .env file
# 3. Redeploy after adding variables
```

## Advanced Configuration

### Branch Deploys

```toml
[context.branch-deploy]
  command = "npm run build"
  environment = { NODE_ENV = "development" }
```

### Deploy Previews

```toml
[context.deploy-preview]
  command = "npm run build"
  environment = { NODE_ENV = "staging" }
```

### Production

```toml
[context.production]
  command = "npm run build"
  environment = { NODE_ENV = "production" }
```

## Security Best Practices

1. **Never commit secrets**
   - Use Netlify environment variables
   - Add `.env` to `.gitignore`

2. **Enable HTTPS**
   - Automatic with Netlify
   - Force HTTPS redirects

3. **Set Security Headers**
   - Already configured in `netlify.toml`
   - Customize as needed

4. **Rate Limiting**
   - Configure in backend
   - Use Netlify Edge Functions for DDoS protection

## Support Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Community](https://answers.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)

## Next Steps

1. ✅ Deploy frontend to Netlify
2. ✅ Deploy backend to separate hosting
3. ✅ Configure API proxy/redirects
4. ✅ Set environment variables
5. ✅ Test deployment
6. ✅ Set up custom domain
7. ✅ Enable monitoring

---

**Need Help?** Check the troubleshooting section or reach out to the Netlify community.
