# Netlify Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Connect Repository
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository

### Step 2: Configure Build (Auto-detected)
Netlify will auto-detect these settings from `netlify.toml`:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Step 3: Set Environment Variables
Go to **Site settings → Environment variables** and add:

```bash
# Required: Your backend API URL
VITE_API_BASE_URL=https://your-backend-url.com/api

# Optional: Add other VITE_* variables as needed
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_WORKOS_CLIENT_ID=client_...
```

### Step 4: Deploy!
Click **"Deploy site"** and wait for the build to complete.

## 📋 Environment Variables Checklist

### Minimum Required
- [ ] `VITE_API_BASE_URL` - Your backend API endpoint

### If Using Payments
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`

### If Using Authentication
- [ ] `VITE_WORKOS_CLIENT_ID`

### If Using Vultr Services
- [ ] `VITE_VULTR_POSTGRES_API_ENDPOINT`
- [ ] `VITE_VULTR_VALKEY_API_ENDPOINT`

## 🔧 Backend Setup

Your backend needs to be deployed separately. Options:

1. **Railway** (Recommended)
   - Easy Node.js deployment
   - Automatic HTTPS
   - Free tier available

2. **Render**
   - Similar to Railway
   - Good free tier

3. **Fly.io**
   - Global edge deployment
   - Great for low latency

After deploying backend, update `VITE_API_BASE_URL` in Netlify.

## 🔗 API Proxy Setup

If your backend is on a different domain, update `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url.com/api/:splat"
  status = 200
  force = true
```

## ✅ Verify Deployment

1. Check build logs in Netlify dashboard
2. Visit your site URL (e.g., `https://your-site.netlify.app`)
3. Test API calls in browser DevTools
4. Verify environment variables are loaded

## 🐛 Common Issues

**Build fails?**
- Check Node version (should be 18+)
- Verify `package.json` has correct build script
- Check build logs for errors

**API calls fail?**
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on backend
- Ensure backend is accessible

**404 on page refresh?**
- Verify `public/_redirects` file exists
- Check `netlify.toml` redirects configuration

## 📚 More Information

See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for detailed documentation.

## 🎉 You're Done!

Your AI-powered application is now live on Netlify!
