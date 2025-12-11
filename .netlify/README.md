# Netlify Configuration

This directory contains Netlify-specific configuration files.

## Files Created

- `netlify.toml` - Main Netlify configuration file
- `public/_redirects` - Redirect rules for SPA routing and API proxying
- `NETLIFY_DEPLOYMENT.md` - Comprehensive deployment guide
- `NETLIFY_QUICK_START.md` - Quick start guide

## Next Steps

1. **Deploy to Netlify**
   - Follow the quick start guide: `NETLIFY_QUICK_START.md`
   - Or see full documentation: `NETLIFY_DEPLOYMENT.md`

2. **Set Environment Variables**
   - Go to Netlify Dashboard → Site settings → Environment variables
   - Add all required `VITE_*` variables

3. **Deploy Backend**
   - Backend needs to be deployed separately (Railway, Render, etc.)
   - Update `VITE_API_BASE_URL` with your backend URL

4. **Configure API Proxy** (if needed)
   - Uncomment redirect rules in `netlify.toml` or `public/_redirects`
   - Update backend URL

## Configuration Overview

### Build Settings
- **Command**: `npm run build`
- **Publish**: `dist`
- **Node Version**: 18+

### Routing
- SPA routing handled by `public/_redirects`
- API proxying configured in `netlify.toml` (commented out)

### Security Headers
- Configured in `netlify.toml`
- Includes XSS protection, frame options, etc.

### Caching
- Static assets cached for 1 year
- JS/CSS files cached immutably

## Support

For issues or questions:
1. Check `NETLIFY_DEPLOYMENT.md` troubleshooting section
2. Review Netlify build logs
3. Check browser console for runtime errors
