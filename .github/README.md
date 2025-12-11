# GitHub Configuration

This directory contains GitHub-specific configuration files for the Style Shepherd project.

## Structure

```
.github/
├── README.md           # This file - overview of GitHub configuration
└── workflows/
    ├── README.md       # Detailed workflow documentation
    ├── ci.yml          # Continuous Integration workflow
    ├── deploy.yml      # Production deployment workflow
    ├── ai-retrain.yml  # AI model retraining workflow
    └── health-check.yml # Health check monitoring workflow
```

## Quick Overview

### Available Workflows

1. **CI** (`workflows/ci.yml`) - Builds and tests on every push
2. **Deploy** (`workflows/deploy.yml`) - Deploys to production on Vultr
3. **AI Retrain** (`workflows/ai-retrain.yml`) - Retrains AI models weekly
4. **Health Check** (`workflows/health-check.yml`) - Monitors system health every 6 hours

## Documentation

For detailed information about each workflow, including:
- Setup instructions
- Required secrets
- Troubleshooting guides
- Best practices

See **[workflows/README.md](./workflows/README.md)** for comprehensive documentation.

## Adding New Workflows

When adding new workflows:
1. Place them in `.github/workflows/`
2. Use descriptive kebab-case names (e.g., `lint.yml`, `test.yml`)
3. Update `workflows/README.md` with documentation
4. Follow GitHub Actions best practices:
   - Use specific action versions (avoid `@latest`)
   - Cache dependencies when possible
   - Use matrix builds for multiple Node versions
   - Set appropriate permissions
   - Never commit secrets

## Best Practices

- **Workflow files**: Use kebab-case naming (e.g., `ci.yml`, `deploy-production.yml`)
- **Secrets**: Store sensitive data in GitHub Secrets, never in workflow files
- **Permissions**: Use minimal required permissions for security
- **Caching**: Cache dependencies to speed up builds
- **Documentation**: Keep workflow documentation up to date
