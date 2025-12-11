# Vultr & Raindrop Integration Quick Reference

## Quick Start

### 1. Import Hooks

```typescript
import { useVultrPostgres, useVultrValkey, useRaindrop } from '@/hooks';
```

### 2. Use in Components

```typescript
function MyComponent() {
  const { getProducts, loading, error } = useVultrPostgres();
  const { setSession, getSession } = useVultrValkey();
  const { storeMemory, searchMemory } = useRaindrop();

  // Your component logic
}
```

### 3. Add Status Components

```typescript
import { VultrConnectionStatus, RaindropConnectionStatus } from '@/components/integrations';

function Dashboard() {
  return (
    <div>
      <VultrConnectionStatus />
      <RaindropConnectionStatus />
    </div>
  );
}
```

## Common Patterns

### Product Search with Cache

```typescript
const { getProducts } = useVultrPostgres();
const { getCachedRecommendations, cacheRecommendations } = useVultrValkey();

// Check cache first
const cached = await getCachedRecommendations(userId);
if (cached) return cached;

// Fetch from database
const products = await getProducts({ category: 'dress' });

// Cache results
await cacheRecommendations(userId, products, 1800);
```

### Session Management

```typescript
const { setSession, getSession, updateSessionAccess } = useVultrValkey();

// Create session
await setSession(sessionId, {
  userId,
  sessionId,
  createdAt: Date.now(),
  lastAccessed: Date.now()
});

// Get session
const session = await getSession(sessionId);

// Update access time
await updateSessionAccess(sessionId);
```

### Memory Storage

```typescript
const { storeMemory, batchStoreMemory, searchMemory } = useRaindrop();

// Single memory
await storeMemory(userId, 'preference', 'Likes blue', { source: 'user' });

// Batch memories
await batchStoreMemory([
  { userId, type: 'preference', text: 'Memory 1' },
  { userId, type: 'preference', text: 'Memory 2' }
]);

// Search
const results = await searchMemory(userId, 'blue', 10);
```

## API Endpoints

### Vultr PostgreSQL
- `GET /api/vultr/postgres/products` - Get products
- `GET /api/vultr/postgres/users/:userId/profile` - Get user profile
- `POST /api/vultr/postgres/users/:userId/profile` - Save user profile
- `GET /api/vultr/postgres/users/:userId/orders` - Get order history
- `POST /api/vultr/postgres/orders` - Create order
- `GET /api/vultr/postgres/health` - Health check
- `GET /api/vultr/postgres/stats` - Pool statistics
- `POST /api/vultr/postgres/batch` - Batch queries

### Vultr Valkey
- `POST /api/vultr/valkey/session/:sessionId` - Set session
- `GET /api/vultr/valkey/session/:sessionId` - Get session
- `POST /api/vultr/valkey/cache/conversation/:userId` - Cache conversation
- `POST /api/vultr/valkey/cache/recommendations/:userId` - Cache recommendations
- `GET /api/vultr/valkey/health` - Health check
- `GET /api/vultr/valkey/metrics` - Metrics
- `POST /api/vultr/valkey/batch` - Batch operations

### Raindrop
- `POST /api/raindrop/store-memory` - Store memory
- `POST /api/raindrop/search-memory` - Search memories
- `POST /api/raindrop/delete-memory` - Delete memory
- `POST /api/raindrop/batch-store-memory` - Batch store
- `GET /api/raindrop/memory-stats` - Get statistics
- `GET /api/raindrop/export-memory` - Export memories
- `POST /api/raindrop/clear-memory` - Clear memories

## Error Handling

All hooks provide `error` and `loading` states:

```typescript
const { getProducts, loading, error, clearError } = useVultrPostgres();

if (loading) return <div>Loading...</div>;
if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={clearError}>Retry</button>
    </div>
  );
}
```

## Performance Tips

1. **Use Caching**: Always check cache before database queries
2. **Batch Operations**: Use batch endpoints for multiple operations
3. **Debounce Search**: Use debounced search for user input
4. **Monitor Status**: Display connection status for debugging
5. **Handle Errors**: Always handle errors gracefully

## TypeScript Types

All hooks are fully typed. Import types as needed:

```typescript
import type { ProductRecord, UserProfileRecord } from '@/integrations/vultr/postgres';
import type { SessionData } from '@/integrations/vultr/valkey';
```
