# GitHub Configuration

This directory contains GitHub-specific configuration files for the Style Shepherd project.

## Structure

```
.github/
├── README.md           # This file - documentation for GitHub config
└── workflows/
    ├── ci.yml          # Continuous Integration workflow
    ├── deploy.yml      # Production deployment workflow
    ├── ai-retrain.yml  # AI model retraining workflow
    └── health-check.yml # Health check monitoring workflow
```

## Workflows

### CI / Build and Deploy (`workflows/ci.yml`)

**Triggers:**
- Push to `main` or `master` branches
- Manual trigger via `workflow_dispatch`

**Purpose:** Builds the project, runs tests, and creates build artifacts for deployment.

**Jobs:**
- **Build**: 
  - Uses Node.js 18
  - Installs dependencies with `npm ci`
  - Runs tests (non-blocking)
  - Builds the project
  - Creates a zip archive of the build
  - Uploads artifacts for deployment

**Optional Deployment:**
The workflow includes commented-out deployment steps for Lovable. To enable:
1. Uncomment the `deploy` job
2. Add `LOVABLE_API_KEY` to GitHub Secrets
3. Configure the project name in the deploy step

---

### Deploy (`workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch
- Manual trigger via `workflow_dispatch`

**Purpose:** Deploys the application to production on Vultr infrastructure.

**Jobs:**
- **Deploy**:
  - Uses Node.js 20.x
  - Builds both frontend and server
  - Deploys via SSH to Vultr server
  - Restarts application using PM2
  - Verifies deployment health

**Required Secrets:**
- `VULTR_HOST` - Vultr server hostname/IP
- `VULTR_USER` - SSH username
- `VULTR_SSH_KEY` - SSH private key
- `VULTR_SSH_PORT` - SSH port (optional, defaults to 22)
- `VULTR_DEPLOY_PATH` - Deployment directory path (optional)
- `VULTR_HEALTH_CHECK_URL` - Health check endpoint URL (optional)

---

### AI Retrain / Data Sync (`workflows/ai-retrain.yml`)

**Triggers:**
- Scheduled: Every Monday at 02:00 UTC
- Manual trigger via `workflow_dispatch`

**Purpose:** Retrains AI models and syncs data on a regular schedule.

**Jobs:**
- **Retrain**:
  - Uses Node.js 20.x
  - Runs AI agent retraining scripts
  - Syncs data
  - Updates product embeddings
  - Deploys updated models (if applicable)

**Required Secrets:**
- `OPENAI_API_KEY` - OpenAI API key for embeddings
- `VULTR_POSTGRES_HOST` - PostgreSQL host
- `VULTR_POSTGRES_DATABASE` - Database name
- `VULTR_POSTGRES_USER` - Database user
- `VULTR_POSTGRES_PASSWORD` - Database password

**Note:** For heavy compute workloads, consider using a self-hosted runner by changing `runs-on: ubuntu-latest` to `runs-on: self-hosted`.

---

### Health Check (`workflows/health-check.yml`)

**Triggers:**
- Scheduled: Every 6 hours
- Manual trigger via `workflow_dispatch`

**Purpose:** Monitors application health and API endpoint availability.

**Jobs:**
- **Check**:
  - Uses Node.js 20.x
  - Runs health check scripts
  - Verifies API endpoints
  - Checks PostgreSQL and Valkey connections

**Required Secrets:**
- `HEALTH_CHECK_API_URL` - API base URL (optional, defaults to localhost)
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `VULTR_POSTGRES_HOST` - PostgreSQL host
- `VULTR_VALKEY_HOST` - Valkey host

## Adding New Workflows

When adding new workflows:
1. Place them in `.github/workflows/`
2. Use descriptive names (e.g., `lint.yml`, `test.yml`, `deploy.yml`)
3. Update this README with documentation
4. Follow GitHub Actions best practices:
   - Use specific action versions (avoid `@latest`)
   - Cache dependencies when possible
   - Use matrix builds for multiple Node versions
   - Set appropriate permissions

## Best Practices

- **Workflow files**: Use kebab-case naming (e.g., `ci.yml`, `deploy-production.yml`)
- **Secrets**: Store sensitive data in GitHub Secrets, never in workflow files
- **Permissions**: Use minimal required permissions for security
- **Caching**: Cache dependencies to speed up builds
- **Matrix builds**: Test against multiple Node.js versions when applicable
