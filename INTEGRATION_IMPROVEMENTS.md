# Vultr and Raindrop Integration Improvements

This document outlines the improvements made to both Vultr and Raindrop integrations for Style Shepherd.

## Backend Improvements

### Vultr PostgreSQL Service (`server/src/lib/vultr-postgres.ts`)

**New Features:**
- ✅ **Batch Query Operations**: Execute multiple queries in a single transaction
- ✅ **Bulk Insert**: Efficiently insert multiple records at once
- ✅ **Connection Pool Statistics**: Monitor pool usage and performance
- ✅ **Enhanced Error Handling**: Better retry logic and error messages

**New Methods:**
```typescript
// Batch queries in a transaction
await vultrPostgres.batchQuery([
  { text: 'SELECT * FROM products', params: [] },
  { text: 'SELECT * FROM orders', params: [] }
]);

// Bulk insert
await vultrPostgres.bulkInsert('products', products, ['name', 'price', 'category']);

// Get pool statistics
const stats = vultrPostgres.getPoolStats();
// Returns: { totalCount, idleCount, waitingCount }
```

**New API Endpoints:**
- `POST /api/vultr/postgres/batch` - Execute batch queries
- `GET /api/vultr/postgres/stats` - Get connection pool statistics

### Vultr Valkey Service (`server/src/lib/vultr-valkey.ts`)

**New Features:**
- ✅ **Pipeline Operations**: Set/get/delete multiple keys efficiently
- ✅ **Connection Statistics**: Monitor connection status
- ✅ **Enhanced Metrics**: Better performance tracking

**New Methods:**
```typescript
// Set multiple keys at once
await vultrValkey.mset([
  { key: 'key1', value: 'value1', ttl: 3600 },
  { key: 'key2', value: 'value2', ttl: 3600 }
]);

// Get multiple keys
const values = await vultrValkey.mget(['key1', 'key2']);

// Delete multiple keys
await vultrValkey.mdelete(['key1', 'key2']);

// Get connection status
const stats = vultrValkey.getConnectionStats();
```

**New API Endpoints:**
- `POST /api/vultr/valkey/batch` - Execute batch operations

### Raindrop Client (`server/src/lib/raindropClient.ts`)

**New Features:**
- ✅ **Batch Memory Storage**: Store multiple memories efficiently
- ✅ **Memory Statistics**: Get usage statistics for users
- ✅ **Enhanced Error Handling**: Better fallback to mock mode

**New Methods:**
```typescript
// Batch store memories
const results = await batchStoreMemory([
  { userId: 'user1', type: 'working', text: 'Memory 1' },
  { userId: 'user1', type: 'working', text: 'Memory 2' }
]);

// Get memory statistics
const stats = await getMemoryStats('user1');
// Returns: { total, byType, oldest, newest }
```

**New API Endpoints:**
- `POST /api/raindrop/batch-store-memory` - Batch store multiple memories
- `GET /api/raindrop/memory-stats` - Get memory statistics

## Frontend Improvements

### React Hooks

#### `useVultrPostgres` (`src/hooks/useVultrPostgres.ts`)

Provides easy access to Vultr PostgreSQL operations with loading states and error handling.

**Usage:**
```typescript
import { useVultrPostgres } from '@/hooks';

function MyComponent() {
  const { getProducts, getUserProfile, loading, error } = useVultrPostgres();

  useEffect(() => {
    getProducts({ category: 'dress', limit: 10 })
      .then(products => console.log(products))
      .catch(err => console.error(err));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>...</div>;
}
```

**Available Methods:**
- `getProducts(filters?)` - Fetch products with filters
- `getUserProfile(userId)` - Get user profile
- `saveUserProfile(userId, profile)` - Save/update user profile
- `getOrderHistory(userId, limit?)` - Get order history
- `createOrder(order)` - Create new order
- `getReturnHistory(userId?, productId?)` - Get return history
- `recordReturn(returnData)` - Record a return
- `healthCheck()` - Check service health

#### `useVultrValkey` (`src/hooks/useVultrValkey.ts`)

Provides easy access to Vultr Valkey caching operations.

**Usage:**
```typescript
import { useVultrValkey } from '@/hooks';

function MyComponent() {
  const { setSession, getSession, cacheRecommendations } = useVultrValkey();

  const handleSession = async () => {
    await setSession('session123', {
      userId: 'user1',
      sessionId: 'session123',
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
  };

  return <button onClick={handleSession}>Create Session</button>;
}
```

**Available Methods:**
- `setSession(sessionId, sessionData, ttl?)` - Store session
- `getSession(sessionId)` - Get session
- `cacheConversationContext(userId, context, ttl?)` - Cache conversation
- `cacheRecommendations(userId, recommendations, ttl?)` - Cache recommendations
- `cacheUserPreferences(userId, preferences, ttl?)` - Cache preferences
- `set(key, value, ttl?)` - Generic cache set
- `get(key)` - Generic cache get
- `delete(key)` - Delete cache entry
- `healthCheck()` - Check service health
- `getMetrics()` - Get performance metrics

#### `useRaindrop` (`src/hooks/useRaindrop.ts`)

Provides easy access to Raindrop Smart Components.

**Usage:**
```typescript
import { useRaindrop } from '@/hooks';

function MyComponent() {
  const { storeMemory, searchMemory, getMemoryStats } = useRaindrop();

  const handleStore = async () => {
    await storeMemory('user1', 'working', 'User preference: likes blue');
  };

  const handleSearch = async () => {
    const results = await searchMemory('user1', 'blue', 10);
    console.log(results);
  };

  return (
    <div>
      <button onClick={handleStore}>Store Memory</button>
      <button onClick={handleSearch}>Search Memories</button>
    </div>
  );
}
```

**Available Methods:**
- `storeMemory(userId, type, text, metadata?)` - Store a memory
- `searchMemory(userId, query, topK?)` - Search memories
- `deleteMemory(userId, id)` - Delete a memory
- `batchStoreMemory(memories)` - Batch store memories
- `getMemoryStats(userId)` - Get memory statistics
- `exportMemory(userId)` - Export memories as JSON
- `clearMemory(userId)` - Clear all memories for a user

### Connection Status Components

#### `VultrConnectionStatus` (`src/components/integrations/VultrConnectionStatus.tsx`)

Displays real-time connection status for Vultr PostgreSQL and Valkey services.

**Usage:**
```typescript
import { VultrConnectionStatus } from '@/components/integrations/VultrConnectionStatus';

function Dashboard() {
  return (
    <div>
      <VultrConnectionStatus autoRefresh={true} refreshInterval={30000} />
    </div>
  );
}
```

**Features:**
- Real-time health checks
- Latency monitoring
- Auto-refresh capability
- Visual status indicators

#### `RaindropConnectionStatus` (`src/components/integrations/RaindropConnectionStatus.tsx`)

Displays real-time connection status for Raindrop Smart Components.

**Usage:**
```typescript
import { RaindropConnectionStatus } from '@/components/integrations/RaindropConnectionStatus';

function Dashboard() {
  return (
    <div>
      <RaindropConnectionStatus autoRefresh={true} refreshInterval={30000} />
    </div>
  );
}
```

**Features:**
- Live/Mock mode detection
- Connection status monitoring
- Auto-refresh capability
- Error display

### Batch Utilities

#### `vultr-batch.ts` (`src/lib/vultr-batch.ts`)

Provides request batching and caching utilities for Vultr API calls.

**Features:**
- Batch Valkey operations
- Local cache manager with TTL
- Cached fetch with automatic retry
- Automatic cleanup of expired entries

**Usage:**
```typescript
import { batchValkeyOperations, cachedFetch } from '@/lib/vultr-batch';

// Batch operations
const results = await batchValkeyOperations([
  { type: 'set', key: 'key1', value: 'value1', ttl: 3600 },
  { type: 'get', key: 'key2' },
  { type: 'delete', key: 'key3' }
]);

// Cached fetch
const data = await cachedFetch('/api/products', {}, 'products-cache', 60000);
```

#### `raindrop-batch.ts` (`src/lib/raindrop-batch.ts`)

Provides request batching and caching utilities for Raindrop API calls.

**Features:**
- Batch memory storage
- Cached memory statistics
- Debounced search with caching

**Usage:**
```typescript
import { batchStoreMemories, getMemoryStats, searchMemories } from '@/lib/raindrop-batch';

// Batch store
const results = await batchStoreMemories([
  { userId: 'user1', type: 'working', text: 'Memory 1' },
  { userId: 'user1', type: 'working', text: 'Memory 2' }
]);

// Get stats (cached)
const stats = await getMemoryStats('user1');

// Search with debouncing
const results = await searchMemories('user1', 'query', 20, 300);
```

## Performance Improvements

### Backend
- ✅ Batch operations reduce database round-trips
- ✅ Connection pooling optimizations
- ✅ Better retry logic reduces failed requests
- ✅ Metrics collection for monitoring

### Frontend
- ✅ Local caching reduces API calls
- ✅ Request batching reduces network overhead
- ✅ Debounced search reduces unnecessary requests
- ✅ Optimistic updates improve perceived performance

## Error Handling Improvements

### Backend
- ✅ Comprehensive error types
- ✅ Retry logic for transient failures
- ✅ Graceful degradation to mock mode
- ✅ Detailed error logging

### Frontend
- ✅ Error states in hooks
- ✅ User-friendly error messages
- ✅ Automatic retry on failures
- ✅ Connection status indicators

## Usage Examples

### Complete Example: Product Search with Caching

```typescript
import { useVultrPostgres, useVultrValkey } from '@/hooks';
import { cachedFetch } from '@/lib/vultr-batch';

function ProductSearch() {
  const { getProducts, loading } = useVultrPostgres();
  const { cacheRecommendations, getCachedRecommendations } = useVultrValkey();
  const [products, setProducts] = useState([]);

  const searchProducts = async (query: string) => {
    // Check cache first
    const cached = await getCachedRecommendations('user1');
    if (cached) {
      setProducts(cached);
      return;
    }

    // Fetch from database
    const results = await getProducts({ category: query, limit: 10 });
    setProducts(results);

    // Cache results
    await cacheRecommendations('user1', results, 1800);
  };

  return (
    <div>
      <input onChange={(e) => searchProducts(e.target.value)} />
      {loading && <div>Loading...</div>}
      <ProductList products={products} />
    </div>
  );
}
```

### Complete Example: Memory Management

```typescript
import { useRaindrop } from '@/hooks';
import { batchStoreMemories } from '@/lib/raindrop-batch';

function MemoryManager() {
  const { storeMemory, searchMemory, getMemoryStats } = useRaindrop();
  const [stats, setStats] = useState(null);

  const saveMultipleMemories = async () => {
    await batchStoreMemories([
      { userId: 'user1', type: 'preference', text: 'Likes blue' },
      { userId: 'user1', type: 'preference', text: 'Prefers dresses' },
    ]);
    
    // Refresh stats
    const newStats = await getMemoryStats('user1');
    setStats(newStats);
  };

  return (
    <div>
      <button onClick={saveMultipleMemories}>Save Memories</button>
      {stats && (
        <div>
          <p>Total: {stats.total}</p>
          <p>By Type: {JSON.stringify(stats.byType)}</p>
        </div>
      )}
    </div>
  );
}
```

## Migration Guide

### Updating Existing Code

**Before:**
```typescript
const response = await fetch('/api/vultr/postgres/products');
const products = await response.json();
```

**After:**
```typescript
import { useVultrPostgres } from '@/hooks';

const { getProducts } = useVultrPostgres();
const products = await getProducts();
```

### Using Connection Status

**Before:**
```typescript
// No connection status display
```

**After:**
```typescript
import { VultrConnectionStatus, RaindropConnectionStatus } from '@/components/integrations';

<VultrConnectionStatus />
<RaindropConnectionStatus />
```

## Testing

All improvements include:
- ✅ TypeScript type safety
- ✅ Error handling
- ✅ Loading states
- ✅ Graceful degradation

## Next Steps

1. Monitor performance metrics in production
2. Adjust cache TTLs based on usage patterns
3. Add more batch operations as needed
4. Expand connection status monitoring
