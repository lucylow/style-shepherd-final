# Frontend Troubleshooting Guide

## Why Your Changes Aren't Showing

If your frontend looks the same despite making changes, try these solutions:

### 1. Clear Browser Cache (Most Common Issue)

**Chrome/Edge:**
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) for hard refresh
- Or: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

**Safari:**
- Press `Cmd+Option+E` to empty caches
- Then `Cmd+R` to refresh

**Firefox:**
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### 2. Check Dev Server Status

The dev server should be running on `http://localhost:8080`

To restart:
```bash
# Kill all running vite processes
pkill -f vite

# Start fresh
npm run dev
```

### 3. Verify You're Looking at the Right Routes

Many new features are on **different routes**, not the home page:

**New Features by Route:**
- `/idea-quality` - Idea Quality Framework Overview
- `/competitive-analysis` - Competitive Analysis
- `/market-opportunity` - Market Opportunity Analysis
- `/problem-validation` - Problem Validation
- `/innovation-scoring` - Innovation Scoring
- `/impact-measurement` - Impact Measurement
- `/competitive-moats` - Competitive Moats
- `/judging-criteria` - Judging Criteria Assessment
- `/demo` - Judge Demo (60-90 second automated demo)
- `/pilot-kpis` - Pilot KPIs Dashboard
- `/unit-economics` - Unit Economics
- `/sponsor-metrics` - Sponsor Metrics
- `/demo-integrations` - Integrations Demo
- `/lovable` - Lovable Cloud Dashboard
- `/agents` - Agents Dashboard
- `/ai-memory` - AI Memory System

**Home Page (`/`) Contains:**
- Hero section with voice assistant demo
- Features overview
- Research stats
- Returns calculator
- Testimonials
- CTA section

### 4. Check Browser Console for Errors

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab to ensure files are loading (status 200)

### 5. Verify Files Are Being Watched

The dev server should show:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8080/
➜  Network: use --host to expose
```

If you see "HMR" (Hot Module Replacement) messages, changes should auto-reload.

### 6. Force Rebuild

If changes still don't appear:

```bash
# Stop dev server (Ctrl+C)
# Clear node_modules cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### 7. Check if CSS is Loading

1. Open DevTools → Network tab
2. Filter by "CSS"
3. Refresh page
4. Verify `index.css` or `main.css` loads with status 200

### 8. Verify Route Configuration

Check that your new routes are in `src/config/routes.tsx` and properly imported.

### 9. Check for TypeScript/Build Errors

```bash
npm run build
```

If there are errors, fix them first. The dev server might be serving old cached code if there are build errors.

### 10. Incognito/Private Window Test

Open the site in an incognito/private window to bypass all cache:
- Chrome: `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)
- Safari: `Cmd+Shift+N`
- Firefox: `Cmd+Shift+P`

## Quick Diagnostic Checklist

- [ ] Dev server is running (`http://localhost:8080` loads)
- [ ] Hard refresh performed (`Cmd+Shift+R`)
- [ ] No console errors in DevTools
- [ ] CSS files loading in Network tab
- [ ] Checking the correct route (not just home page)
- [ ] Files are saved (check file timestamps)
- [ ] No TypeScript/build errors

## Still Not Working?

1. Check the browser console for specific error messages
2. Verify the file you edited is actually being imported/used
3. Check if the component is conditionally rendered (might be hidden)
4. Verify route paths match exactly (case-sensitive)
5. Check if there are multiple versions of the same component

