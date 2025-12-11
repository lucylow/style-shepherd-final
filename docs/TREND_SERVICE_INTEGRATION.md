# Trend Service Integration Guide

This document describes how to integrate and use the external trend APIs service in Style Shepherd.

## Overview

Style Shepherd includes a Python FastAPI service (`server/trend-service/`) that provides fashion/style trend data using free external APIs and datasets. This service integrates with the main TypeScript backend to provide trend-aware recommendations.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Frontend       │────────▶│  Node.js Backend  │────────▶│  Python Service │
│  (React)        │         │  (Express/TS)     │         │  (FastAPI)      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │
                                      │ TrendService.ts
                                      │ (TypeScript wrapper)
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  External APIs   │
                            │  - Google Trends │
                            │  - Fashion-MNIST │
                            └──────────────────┘
```

## Quick Start

### 1. Start the Python Trend Service

```bash
cd server/trend-service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn trend_service:app --reload --port 8000
```

The service will be available at `http://localhost:8000`

### 2. Configure Backend

The backend automatically detects the trend service. Optionally set:

```bash
TREND_SERVICE_URL=http://localhost:8000
```

### 3. Use the API

The backend exposes these endpoints:

- `GET /api/functions/trends?keywords=linen,denim`
- `GET /api/functions/mock-trends`
- `GET /api/functions/clusters?n_clusters=8`
- `GET /api/functions/combined?keywords=linen,denim`
- `GET /api/functions/demo-recommendations?keywords=linen&limit=5`

## API Usage Examples

### Get Trend Scores

```typescript
// Frontend
const response = await fetch('/api/functions/trends?keywords=linen,denim,blazer');
const data = await response.json();
// { source: "pytrends", scores: { linen: 0.85, denim: 0.72, blazer: 0.91 } }
```

### Get Mock Trends (for demos)

```typescript
const response = await fetch('/api/functions/mock-trends');
const data = await response.json();
// { trends: [{ category: "linen", score: 0.92, note: "..." }, ...] }
```

### Get Combined Trends + Clusters

```typescript
const response = await fetch('/api/functions/combined?keywords=linen,denim&n_clusters=8');
const data = await response.json();
// { clusters: [...], extra_trends: [...], generated_at: "..." }
```

## Integration Points

### Backend Service Wrapper

The `TrendService` class (`server/src/services/TrendService.ts`) provides a TypeScript interface to the Python service:

```typescript
import { trendService } from '../services/TrendService.js';

// Check availability
const isAvailable = await trendService.isAvailable();

// Get trends
const trends = await trendService.getTrends(['linen', 'denim'], 'today 12-m');

// Get mock trends
const mockTrends = await trendService.getMockTrends();

// Get clusters
const clusters = await trendService.getClusters(8, 5000);

// Get combined
const combined = await trendService.getCombined(['linen', 'denim'], 8);
```

### Frontend Integration

Use the backend endpoints from your React components:

```typescript
// In a React component
const fetchTrends = async (keywords: string[]) => {
  const response = await fetch(
    `/api/functions/trends?keywords=${keywords.join(',')}`
  );
  return await response.json();
};
```

## Data Sources

### Google Trends (via pytrends)

- **What**: Real-time search interest data
- **Cost**: Free (no API key)
- **Limitations**: Rate-limited, unofficial API
- **Fallback**: Mock deterministic scores

### Fashion-MNIST

- **What**: Fashion image dataset (70,000 images)
- **Cost**: Free (open dataset)
- **Limitations**: Requires internet for download
- **Fallback**: Mock clusters

## Use Cases

### 1. Trend-Aware Recommendations

Combine trend scores with product recommendations:

```typescript
const trends = await trendService.getTrends(['linen', 'denim']);
const products = await getProducts();
const scoredProducts = products.map(product => ({
  ...product,
  trendScore: trends.scores[product.category] || 0,
}));
```

### 2. Style Clustering

Identify style groups from Fashion-MNIST:

```typescript
const clusters = await trendService.getClusters(8);
// Use clusters to group similar styles
```

### 3. Demo/Presentation Mode

Use mock trends for consistent demos:

```typescript
const mockTrends = await trendService.getMockTrends();
// Always returns same curated data
```

## Error Handling

The service gracefully handles failures:

1. **Service Unavailable**: Returns 503 with helpful message
2. **pytrends Failure**: Falls back to mock data
3. **Fashion-MNIST Unavailable**: Uses mock clusters
4. **Network Errors**: Returns error with details

## Production Considerations

### Deployment Options

1. **Same Server**: Run Python service alongside Node.js
2. **Separate Service**: Deploy Python service independently
3. **Docker**: Containerize both services
4. **Serverless**: Deploy Python service as serverless function

### Performance

- **Caching**: Trend data is cached in memory (Python service)
- **Rate Limiting**: Implement rate limiting for production
- **Background Jobs**: Consider pre-computing trends

### Security

- **Authentication**: Add API keys or JWT
- **CORS**: Configure CORS for production
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Validate all inputs

## Troubleshooting

### Service Not Starting

```bash
# Check Python version
python --version  # Should be 3.8+

# Check dependencies
pip list | grep fastapi

# Check port availability
lsof -i :8000
```

### Backend Can't Connect

```bash
# Test service health
curl http://localhost:8000/health

# Check environment variable
echo $TREND_SERVICE_URL

# Check backend logs
cd server && npm run dev
```

### pytrends Not Working

- Check internet connection
- Verify Google Trends is accessible
- Service will automatically use mock data
- Check logs for specific errors

## Development

### Adding New Endpoints

1. Add endpoint to `trend_service.py`
2. Add method to `TrendService.ts`
3. Add route to `trend-analysis.ts`
4. Update documentation

### Testing

```bash
# Test Python service
cd server/trend-service
uvicorn trend_service:app --reload --port 8000
curl http://localhost:8000/health

# Test backend integration
cd server
npm run dev
curl http://localhost:3001/api/functions/mock-trends
```

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [pytrends Documentation](https://github.com/GeneralMills/pytrends)
- [Fashion-MNIST Dataset](https://github.com/zalandoresearch/fashion-mnist)
- [Style Shepherd Backend README](../server/README.md)
