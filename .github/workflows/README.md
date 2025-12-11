# GitHub Actions Workflows

This directory contains automated workflows for Style Shepherd CI/CD, deployment, AI model retraining, and health monitoring.

## 📋 Available Workflows

### 1. CI (`ci.yml`)

**Trigger**: Push or Pull Request to any branch

**Purpose**: Automated testing, linting, and building

**What it does**:
- Runs on Node.js 18.x and 20.x
- Installs dependencies (root and server)
- Lints frontend and backend code
- Builds frontend (Vite) and backend (TypeScript)
- Runs tests (frontend and server)
- Optional type checking

**Usage**: Automatically runs on every push/PR. No manual action needed.

---

### 2. Deploy (`deploy.yml`)

**Trigger**: 
- Push to `main` branch
- Manual dispatch via GitHub Actions UI

**Purpose**: Automated deployment to production server

**What it does**:
- Builds frontend and backend
- Connects to Vultr server via SSH
- Pulls latest code
- Installs dependencies
- Rebuilds application
- Restarts PM2 processes
- Verifies deployment with health check

**Required Secrets**:
- `VULTR_HOST` - Vultr server hostname/IP
- `VULTR_USER` - SSH username
- `VULTR_SSH_KEY` - SSH private key
- `VULTR_SSH_PORT` - SSH port (optional, defaults to 22)
- `VULTR_DEPLOY_PATH` - Deployment path (optional, defaults to `/var/www/style-shepherd-final`)
- `VULTR_HEALTH_CHECK_URL` - Health check URL (optional, defaults to `http://localhost:3001/health`)

**Setup**:
1. Generate SSH key pair: `ssh-keygen -t ed25519 -C "github-actions"`
2. Add public key to Vultr server: `~/.ssh/authorized_keys`
3. Add private key to GitHub Secrets: Settings → Secrets and variables → Actions
4. Configure other secrets as needed

---

### 3. AI Retrain / Data Sync (`ai-retrain.yml`)

**Trigger**:
- Scheduled: Every Monday at 02:00 UTC
- Manual dispatch via GitHub Actions UI

**Purpose**: Retrain AI models and sync data

**What it does**:
- Runs retraining scripts for:
  - Size prediction models
  - Return risk prediction model
  - Product embeddings
- Syncs mock data and sponsor data
- Updates product catalogs

**Required Secrets**:
- `OPENAI_API_KEY` - For embeddings generation
- `VULTR_POSTGRES_HOST` - Database host
- `VULTR_POSTGRES_DATABASE` - Database name
- `VULTR_POSTGRES_USER` - Database user
- `VULTR_POSTGRES_PASSWORD` - Database password

**Usage**:
- Automatic: Runs weekly on Monday at 2 AM UTC
- Manual: Go to Actions → AI Retrain / Data Sync → Run workflow

---

### 4. Health Check (`health-check.yml`)

**Trigger**:
- Manual dispatch via GitHub Actions UI
- Scheduled: Every 6 hours

**Purpose**: Validate system health and API endpoints

**What it does**:
- Checks API health endpoint
- Validates Vultr PostgreSQL connection
- Validates Vultr Valkey connection
- Verifies environment variables
- Tests key API endpoints

**Required Secrets** (optional):
- `HEALTH_CHECK_API_URL` - API base URL (defaults to `http://localhost:3001`)
- `ELEVENLABS_API_KEY` - For voice service checks
- `STRIPE_SECRET_KEY` - For payment service checks
- `VULTR_POSTGRES_HOST` - Database host
- `VULTR_VALKEY_HOST` - Cache host

**Usage**:
- Automatic: Runs every 6 hours
- Manual: Go to Actions → Health Check → Run workflow

---

## 🔧 Local Scripts

You can also run these scripts locally:

### Health Check
```bash
npm run health:check
# or
node scripts/health-check.js
```

### Retrain AI Agents
```bash
npm run retrain:agents
# or
npx tsx scripts/retrain-agents.ts
```

### Data Sync
```bash
npm run data:sync
# or
node scripts/data-sync.js
```

---

## 🚀 PM2 Process Management

The `ecosystem.config.js` file configures PM2 to manage your application processes.

### Setup PM2

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start all processes**:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **View logs**:
   ```bash
   pm2 logs
   ```

4. **Restart processes**:
   ```bash
   pm2 restart ecosystem.config.js
   ```

5. **Stop processes**:
   ```bash
   pm2 stop ecosystem.config.js
   ```

6. **View status**:
   ```bash
   pm2 status
   ```

### PM2 Processes

- **style-shepherd-api**: Main backend API server (port 3001)
- **style-shepherd-worker**: Background worker processes (if worker file exists)

### Logs

Logs are stored in `./logs/`:
- `api-error.log` - API error logs
- `api-out.log` - API output logs
- `worker-error.log` - Worker error logs
- `worker-out.log` - Worker output logs

---

## 🔐 Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each required secret:

### For Deploy Workflow
- `VULTR_HOST`: Your Vultr server IP or hostname
- `VULTR_USER`: SSH username (usually `root` or `ubuntu`)
- `VULTR_SSH_KEY`: Your SSH private key (entire content including `-----BEGIN` and `-----END`)
- `VULTR_SSH_PORT`: SSH port (usually `22`)
- `VULTR_DEPLOY_PATH`: Path where code is deployed (e.g., `/var/www/style-shepherd-final`)
- `VULTR_HEALTH_CHECK_URL`: Full URL to health endpoint (e.g., `https://api.yourdomain.com/health`)

### For AI Retrain Workflow
- `OPENAI_API_KEY`: Your OpenAI API key
- `VULTR_POSTGRES_HOST`: PostgreSQL hostname
- `VULTR_POSTGRES_DATABASE`: Database name
- `VULTR_POSTGRES_USER`: Database username
- `VULTR_POSTGRES_PASSWORD`: Database password

### For Health Check Workflow
- `HEALTH_CHECK_API_URL`: API base URL (optional)
- `ELEVENLABS_API_KEY`: ElevenLabs API key (optional)
- `STRIPE_SECRET_KEY`: Stripe secret key (optional)
- `VULTR_POSTGRES_HOST`: Database host (optional)
- `VULTR_VALKEY_HOST`: Valkey host (optional)

---

## 📝 Workflow Status

View workflow runs and status:
- Go to **Actions** tab in GitHub
- Click on a workflow to see run history
- Click on a specific run to see logs and details

---

## 🐛 Troubleshooting

### CI Workflow Fails

**Issue**: Tests fail
- **Solution**: Run tests locally first: `npm test`
- Check test output for specific failures

**Issue**: Build fails
- **Solution**: Run build locally: `npm run build`
- Check for TypeScript errors: `npx tsc --noEmit`

### Deploy Workflow Fails

**Issue**: SSH connection fails
- **Solution**: 
  - Verify SSH key is correct in secrets
  - Test SSH connection manually: `ssh -i ~/.ssh/your_key user@host`
  - Check firewall rules allow SSH

**Issue**: PM2 restart fails
- **Solution**:
  - Ensure PM2 is installed on server: `npm install -g pm2`
  - Check if ecosystem.config.js exists
  - Verify PM2 processes: `pm2 list`

### AI Retrain Workflow Fails

**Issue**: Training scripts not found
- **Solution**: Ensure scripts exist in `scripts/` directory
- Check script paths in `retrain-agents.ts`

**Issue**: API key errors
- **Solution**: Verify secrets are set correctly
- Check API key permissions and quotas

### Health Check Fails

**Issue**: Endpoints not reachable
- **Solution**: 
  - Verify `HEALTH_CHECK_API_URL` is correct
  - Check if server is running
  - Verify firewall/security group rules

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [SSH Key Setup Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

## 🎯 Best Practices

1. **Never commit secrets**: Always use GitHub Secrets
2. **Test locally first**: Run scripts locally before relying on workflows
3. **Monitor workflow runs**: Check Actions tab regularly
4. **Use manual dispatch**: Test workflows manually before enabling auto-triggers
5. **Keep logs**: PM2 logs help debug production issues
6. **Version control**: Keep workflow files in version control
7. **Document changes**: Update this README when adding new workflows

---

**Last Updated**: 2024
**Maintained by**: Style Shepherd Team
