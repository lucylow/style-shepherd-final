# Style Shepherd Trend Service

A Python FastAPI service that provides fashion/style trend data using external APIs and datasets without requiring paid API keys.

## Features

- **Google Trends Integration**: Uses `pytrends` to fetch real-time trend data for fashion keywords
- **Fashion-MNIST Clustering**: Analyzes fashion image datasets to identify style clusters
- **Mock Trend Data**: Provides curated mock trends for demos and presentations
- **Combined Analysis**: Merges trend scores with cluster popularity for trend-aware recommendations
- **Demo Recommendations**: Generates product recommendations with trend-aware scoring

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Navigate to the trend service directory:
```bash
cd server/trend-service
```

2. Create a virtual environment (recommended):
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

**Note**: `pytrends` is optional but recommended for real trend data. If not installed, the service will use mock data.

### Running the Service

Start the FastAPI server:

```bash
uvicorn trend_service:app --reload --port 8000
```

The service will be available at:
- API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## API Endpoints

### `GET /api/trends`

Get trend scores for keywords using Google Trends (or mock fallback).

**Query Parameters:**
- `keywords` (required): Comma-separated keywords (e.g., `linen,denim,blazer`)
- `timeframe` (optional): Timeframe string (default: `today 12-m`)

**Example:**
```bash
curl "http://localhost:8000/api/trends?keywords=linen,denim&timeframe=today%2012-m"
```

**Response:**
```json
{
  "source": "pytrends",
  "timeframe": "today 12-m",
  "scores": {
    "linen": 0.85,
    "denim": 0.72
  }
}
```

### `GET /api/mock-trends`

Get curated mock trends useful for demos and presentations.

**Example:**
```bash
curl "http://localhost:8000/api/mock-trends"
```

**Response:**
```json
{
  "generated_at": "2024-01-15T10:30:00Z",
  "trends": [
    {
      "category": "linen",
      "score": 0.92,
      "note": "Rising in searches across Europe; summer staple"
    },
    ...
  ]
}
```

### `GET /api/clusters`

Get Fashion-MNIST cluster summaries using PCA and KMeans.

**Query Parameters:**
- `n_clusters` (optional): Number of clusters (default: 8)
- `sample_limit` (optional): Maximum samples to process (default: 5000)

**Example:**
```bash
curl "http://localhost:8000/api/clusters?n_clusters=8&sample_limit=5000"
```

### `GET /api/combined`

Combine trend keyword scores with cluster popularity.

**Query Parameters:**
- `keywords` (optional): Comma-separated keywords
- `n_clusters` (optional): Number of clusters (default: 8)

**Example:**
```bash
curl "http://localhost:8000/api/combined?keywords=linen,denim&n_clusters=8"
```

### `GET /api/demo-recommendation`

Get demo product recommendations with trend-aware scoring.

**Query Parameters:**
- `keywords` (optional): Comma-separated keywords
- `limit` (optional): Number of products (default: 5)

**Example:**
```bash
curl "http://localhost:8000/api/demo-recommendation?keywords=linen&limit=5"
```

## Integration with Style Shepherd Backend

The TypeScript backend includes a `TrendService` wrapper that calls this Python service. The backend routes are available at:

- `GET /api/functions/trends`
- `GET /api/functions/mock-trends`
- `GET /api/functions/clusters`
- `GET /api/functions/combined`
- `GET /api/functions/demo-recommendations`

### Configuration

Set the `TREND_SERVICE_URL` environment variable to point to your trend service:

```bash
TREND_SERVICE_URL=http://localhost:8000
```

If not set, it defaults to `http://localhost:8000`.

## Notes and Caveats

### Google Trends (pytrends)

- **No API key required**: Uses unofficial Google Trends API
- **Rate limiting**: May be rate-limited by Google
- **Terms of Service**: Use responsibly and respect Google's ToS
- **Fallback**: Automatically falls back to mock data if unavailable

### Fashion-MNIST

- **Internet required**: Downloads dataset from OpenML on first use
- **Caching**: Results are cached in memory for performance
- **Fallback**: Uses mock data if dataset unavailable

### Production Considerations

For production use, consider:

1. **Caching**: Add Redis or similar for caching trend data
2. **Authentication**: Add API keys or JWT authentication
3. **Rate Limiting**: Implement rate limiting per client
4. **Error Handling**: Enhanced error handling and retries
5. **Monitoring**: Add logging and monitoring
6. **Background Jobs**: Move heavy ML work to background jobs
7. **Database**: Store trend history in a database

## Development

### Running in Development Mode

```bash
uvicorn trend_service:app --reload --port 8000
```

The `--reload` flag enables auto-reload on code changes.

### Testing

Test endpoints using the interactive docs at `http://localhost:8000/docs` or using curl:

```bash
# Test health check
curl http://localhost:8000/health

# Test trends endpoint
curl "http://localhost:8000/api/trends?keywords=linen,denim"
```

## Troubleshooting

### Service Not Available

If the backend reports the trend service is unavailable:

1. Check if the service is running: `curl http://localhost:8000/health`
2. Verify the port (default: 8000) is not in use
3. Check Python dependencies are installed correctly
4. Review logs for errors

### pytrends Errors

If Google Trends queries fail:

- The service automatically falls back to mock data
- Check your internet connection
- Verify Google Trends is accessible
- Consider using mock data for demos

### Fashion-MNIST Download Issues

If Fashion-MNIST download fails:

- Check internet connection
- Verify OpenML is accessible
- The service will use mock clusters as fallback

## License

Part of the Style Shepherd project.
