# Automated Workflows Setup Guide

This document provides a quick setup guide for the automated workflow system implemented for Style Shepherd.

## 🎯 Overview

The automated workflow system includes:

1. **CI Pipeline** - Automated testing, linting, and building on every push/PR
2. **Deploy Pipeline** - Automated deployment to Vultr server on main branch merges
3. **AI Retrain** - Scheduled weekly retraining of AI models
4. **Health Checks** - Automated and manual health validation
5. **PM2 Process Management** - Zero-downtime process management

## 📁 Files Created

### GitHub Actions Workflows
- `.github/workflows/ci.yml` - Continuous Integration
- `.github/workflows/deploy.yml` - Deployment automation
- `.github/workflows/ai-retrain.yml` - AI model retraining
- `.github/workflows/health-check.yml` - Health monitoring
- `.github/workflows/README.md` - Detailed workflow documentation

### Configuration Files
- `ecosystem.config.js` - PM2 process manager configuration

### Scripts
- `scripts/health-check.js` - Health check script
- `scripts/retrain-agents.ts` - AI agent retraining script
- `scripts/data-sync.js` - Data synchronization script

### Package Scripts Added
- `npm run retrain:agents` - Retrain AI models
- `npm run data:sync` - Sync data sources
- `npm run health:check` - Run health checks

## 🚀 Quick Start

### 1. Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add:

#### For Deployment
```
VULTR_HOST=your-server-ip-or-hostname
VULTR_USER=root
VULTR_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
VULTR_SSH_PORT=22
VULTR_DEPLOY_PATH=/var/www/style-shepherd-final
VULTR_HEALTH_CHECK_URL=https://api.yourdomain.com/health
```

#### For AI Retraining
```
OPENAI_API_KEY=sk-...
VULTR_POSTGRES_HOST=your-postgres-host.vultr.com
VULTR_POSTGRES_DATABASE=style_shepherd
VULTR_POSTGRES_USER=your_user
VULTR_POSTGRES_PASSWORD=your_password
```

### 2. Set Up PM2 on Server

SSH into your Vultr server and run:

```bash
# Install PM2 globally
npm install -g pm2

# Create logs directory
mkdir -p /var/www/style-shepherd-final/logs

# Start processes
cd /var/www/style-shepherd-final
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 3. Test Workflows Locally

```bash
# Test health check
npm run health:check

# Test data sync
npm run data:sync

# Test retraining (requires API keys)
npm run retrain:agents
```

### 4. Verify Workflows

1. Push a commit to trigger CI workflow
2. Merge to main to trigger deploy workflow
3. Manually trigger health check workflow
4. Wait for scheduled AI retrain (Monday 2 AM UTC) or trigger manually

## 📊 Workflow Status

Monitor workflow runs at: `https://github.com/YOUR_USERNAME/style-shepherd-final/actions`

## 🔧 Customization

### Change Retraining Schedule

Edit `.github/workflows/ai-retrain.yml`:
```yaml
schedule:
  - cron: '0 2 * * 1'  # Change to your preferred schedule
```

### Add More Health Check Endpoints

Edit `scripts/health-check.js`:
```javascript
const endpoints = [
  // Add your custom endpoints here
  {
    name: 'Custom Endpoint',
    url: `${API_URL}/api/custom`,
    method: 'GET',
    required: false,
  },
];
```

### Modify PM2 Configuration

Edit `ecosystem.config.js` to:
- Add more processes
- Change memory limits
- Adjust restart policies
- Configure environment variables

## 🐛 Troubleshooting

### Workflow Fails on SSH

**Problem**: Deploy workflow fails with SSH connection error

**Solution**:
1. Verify SSH key is correct in GitHub Secrets
2. Test SSH manually: `ssh -i ~/.ssh/your_key user@host`
3. Check server firewall allows SSH (port 22)
4. Ensure SSH key has correct permissions: `chmod 600 ~/.ssh/your_key`

### PM2 Not Found

**Problem**: Deploy workflow fails with "pm2: command not found"

**Solution**:
1. Install PM2 on server: `npm install -g pm2`
2. Add PM2 to PATH or use full path: `/usr/local/bin/pm2`

### Health Check Fails

**Problem**: Health check workflow reports failures

**Solution**:
1. Verify API is running: `curl http://localhost:3001/health`
2. Check environment variables are set
3. Verify database connections
4. Check server logs: `pm2 logs`

### Retraining Scripts Not Found

**Problem**: AI retrain workflow can't find scripts

**Solution**:
1. Verify scripts exist in `scripts/` directory
2. Check script paths in `retrain-agents.ts`
3. Ensure scripts are executable: `chmod +x scripts/*.sh`

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Cron Schedule Expression](https://crontab.guru/)
- [SSH Key Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

## ✅ Checklist

- [ ] GitHub Secrets configured
- [ ] PM2 installed on server
- [ ] SSH access tested
- [ ] Health check script tested locally
- [ ] Data sync script tested locally
- [ ] CI workflow runs successfully
- [ ] Deploy workflow runs successfully
- [ ] Health check workflow runs successfully
- [ ] PM2 processes running on server
- [ ] Logs directory created

## 🎉 Next Steps

1. **Monitor First Deploy**: Watch the deploy workflow on your first merge to main
2. **Set Up Alerts**: Configure GitHub notifications for workflow failures
3. **Review Logs**: Check PM2 logs regularly: `pm2 logs`
4. **Optimize**: Adjust workflow schedules and configurations based on usage
5. **Document**: Update this guide with project-specific customizations

---

**Created**: 2024
**Last Updated**: 2024
