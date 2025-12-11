# Provider Abstraction System

## Overview

This implementation adds a **pluggable provider abstraction layer** to Style Shepherd, enabling personalized customer experiences **without vendor lock-in**. The system supports:

1. **Pluggable Provider Abstraction** - LLMs, embeddings, TTS, and vector DBs can be added/removed at runtime
2. **Automatic Failover** - Falls back to alternative providers when one fails
3. **Provider-Agnostic Personalization** - Personalization engine works with any provider combination
4. **Data Portability** - Export and delete user data (GDPR-compliant)

## Architecture

### Core Components

```
server/src/lib/
├── providers.ts              # Provider interfaces and types
├── providerRegistry.ts      # Provider registration and failover logic
├── initProviders.ts         # Startup provider initialization
├── llm/
│   └── openaiAdapter.ts     # OpenAI LLM adapter
├── embeddings/
│   └── openaiEmbeddings.ts  # OpenAI embeddings adapter
├── tts/
│   └── elevenlabsAdapter.ts # ElevenLabs TTS adapter
├── vectordb/
│   ├── postgresAdapter.ts   # PostgreSQL vector DB (pgvector)
│   └── memoryAdapter.ts     # In-memory vector DB (dev only)
└── personalization/
    └── index.ts             # Personalization engine

server/src/routes/
├── personalization.ts       # Personalization and data portability APIs
└── admin.ts                 # Admin provider management APIs

src/
├── pages/admin/
│   └── Providers.tsx        # Admin UI for provider management
└── hooks/
    └── usePersonalization.ts # React hook for personalized recommendations
```

## Features

### 1. Provider Abstraction

All providers implement standard interfaces:

- **LLMAdapter** - Text generation (`generate`, `stream`)
- **EmbeddingsAdapter** - Text embeddings (`embed`, `dimension`)
- **TTSAdapter** - Text-to-speech (`synthesize`)
- **VectorDBAdapter** - Vector storage and search (`upsert`, `query`, `delete`)

### 2. Provider Registry

The `ProviderRegistry` manages all providers:

- **Registration** - Add providers at runtime
- **Selection** - Choose providers by priority (lower = preferred)
- **Failover** - Automatically try next provider on failure
- **Listing** - Query registered providers

### 3. Personalization Engine

The personalization engine (`lib/personalization/index.ts`) is provider-agnostic:

- Uses semantic search via vector DB (if available)
- Falls back to database queries if vector DB unavailable
- Combines multiple signals:
  - Semantic similarity (from embeddings)
  - User preferences (brand, color, size)
  - Price fit
  - Product ratings
  - Recency

### 4. Data Portability

GDPR-compliant endpoints:

- **GET `/api/personalize/export/user-data`** - Export all user data
- **DELETE `/api/personalize/export/user-data?confirm=true`** - Delete user data

## Usage

### Initializing Providers

Providers are automatically initialized at server startup from environment variables:

```typescript
// server/src/lib/initProviders.ts
// Automatically registers:
// - OpenAI LLM (if OPENAI_API_KEY set)
// - OpenAI Embeddings (if OPENAI_API_KEY set)
// - ElevenLabs TTS (if ELEVENLABS_API_KEY set)
// - PostgreSQL Vector DB (if postgres configured)
// - In-Memory Vector DB (dev only)
```

### Using Personalization

**Backend API:**
```typescript
import { personalizedRecommendations } from './lib/personalization';

const recs = await personalizedRecommendations(
  userId,
  { query: 'summer dress', occasion: 'wedding', budget: 200 },
  { topK: 50, rerankTop: 10 }
);
```

**Frontend Hook:**
```typescript
import { usePersonalization } from '@/hooks/usePersonalization';

const { recs, loading, error } = usePersonalization({
  userId: 'user123',
  query: 'summer dress',
  occasion: 'wedding',
  budget: 200,
});
```

### Admin Provider Management

Access the admin UI at `/admin/providers` (requires `ADMIN_TOKEN`):

1. **View Providers** - See all registered providers
2. **Register Provider** - Add new providers at runtime
3. **Unregister Provider** - Remove providers
4. **View Metrics** - Monitor provider health (basic)

**API Endpoints:**
- `GET /api/admin/providers` - List providers
- `POST /api/admin/providers` - Register provider
- `DELETE /api/admin/providers` - Unregister provider
- `GET /api/admin/metrics` - Get metrics

**Example: Register OpenAI LLM**
```bash
curl -X POST http://localhost:3001/api/admin/providers \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{
    "type": "openai-llm",
    "config": {
      "apiKey": "sk-..."
    },
    "priority": 10
  }'
```

## Environment Variables

Add to your `.env`:

```bash
# Provider API Keys
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
ADMIN_TOKEN=your-secret-admin-token

# Optional: Expose admin token to frontend (dev only)
VITE_ADMIN_TOKEN=your-secret-admin-token
```

⚠️ **Security Note**: In production, do NOT expose `ADMIN_TOKEN` to the frontend. Use proper SSO/role-based auth instead.

## Adding New Providers

### Example: Adding Anthropic Claude

1. **Create Adapter:**
```typescript
// server/src/lib/llm/anthropicAdapter.ts
import { LLMAdapter, LLMGenerateOptions, LLMResponse } from '../providers.js';

export class AnthropicAdapter implements LLMAdapter {
  meta = {
    id: 'anthropic',
    kind: 'llm' as const,
    name: 'Anthropic Claude',
    priority: 15, // Higher priority = fallback
  };

  constructor(private apiKey: string) {}

  async generate(prompt: string, opts: LLMGenerateOptions = {}): Promise<LLMResponse> {
    // Implement Anthropic API call
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model || 'claude-3-haiku-20240307',
        max_tokens: opts.maxTokens || 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    // ... parse response
  }
}
```

2. **Register in Admin UI or initProviders.ts:**
```typescript
import { AnthropicAdapter } from './llm/anthropicAdapter.js';

if (env.ANTHROPIC_API_KEY) {
  providerRegistry.register(new AnthropicAdapter(env.ANTHROPIC_API_KEY));
}
```

## Failover Behavior

The system automatically fails over to the next provider when:

1. A provider throws an error
2. A provider is disabled (`enabled: false`)
3. A provider is rate-limited (handled by error)

Providers are tried in priority order (lower priority = tried first).

## Data Portability

### Export User Data

```bash
curl "http://localhost:3001/api/personalize/export/user-data?userId=user123" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -o user-data.json
```

Returns JSON with:
- User profile
- Preferences
- Interactions
- Orders

### Delete User Data

```bash
curl -X DELETE "http://localhost:3001/api/personalize/export/user-data?userId=user123&confirm=true" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

⚠️ **Irreversible**: This anonymizes/deletes user data. Use with caution.

## Migration Scripts

### Migrate Embeddings Between Vector DBs

```typescript
// scripts/migrate_vectordb.ts
import providerRegistry from '../server/src/lib/providerRegistry.js';
import { vultrPostgres } from '../server/src/lib/vultr-postgres.js';

async function migrate() {
  const source = providerRegistry.getProvider('vectordb', 'postgres-vectordb');
  const target = providerRegistry.getProvider('vectordb', 'pinecone-main');
  
  // Fetch all products with embeddings
  const products = await vultrPostgres.query(
    'SELECT id, embedding FROM products WHERE embedding IS NOT NULL'
  );
  
  // Upsert to target
  const vectors = products.rows.map(p => ({
    id: p.id,
    values: p.embedding,
    metadata: { productId: p.id },
  }));
  
  await target.upsert(vectors);
}
```

## Testing

### Unit Tests

```typescript
import { providerRegistry } from './lib/providerRegistry';
import { OpenAIAdapter } from './lib/llm/openaiAdapter';

test('provider failover', async () => {
  // Register multiple providers
  providerRegistry.register(new OpenAIAdapter('key1', { priority: 10 }));
  providerRegistry.register(new OpenAIAdapter('key2', { priority: 20 }));
  
  // First provider should be selected
  const selected = providerRegistry.selectLLM();
  expect(selected.meta.priority).toBe(10);
});
```

## Production Considerations

1. **Security**
   - Replace `ADMIN_TOKEN` with proper SSO/role-based auth
   - Store provider API keys in secret manager (AWS Secrets Manager, Vercel env)
   - Rate limit admin endpoints

2. **Metrics**
   - Integrate with Prometheus/Datadog for real metrics
   - Track: success rate, latency, failover counts, cost per provider

3. **Persistence**
   - Store provider metadata in database (not just memory)
   - Persist metrics for historical analysis

4. **Health Checks**
   - Add provider health check endpoints
   - Automatically disable unhealthy providers

5. **Cost Optimization**
   - Use cheaper providers for non-critical operations
   - Cache embeddings and LLM responses
   - Monitor token usage per provider

## Next Steps

1. ✅ Core provider abstraction implemented
2. ✅ Personalization engine created
3. ✅ Admin UI for provider management
4. ✅ Data portability endpoints
5. 🔄 Add more provider adapters (Anthropic, Cohere, Pinecone, etc.)
6. 🔄 Implement real metrics collection
7. 🔄 Add provider health checks
8. 🔄 Persist provider state to database

## License

Same as Style Shepherd project.
