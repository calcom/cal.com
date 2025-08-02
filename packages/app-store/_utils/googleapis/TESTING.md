# Google APIs Caching Testing Guide

## Testing Strategy

### Unit Tests
- Individual component functionality
- Cache key generation and normalization
- TTL and expiration logic
- Error handling and fallback behavior

### Integration Tests
- End-to-end caching flow
- Framework-specific implementations
- Cache client compatibility
- Performance benchmarks

### Load Tests
- Memory usage under high load
- Cache hit ratios with realistic traffic
- Concurrent access patterns
- Cache eviction behavior

## Unit Testing

### GoogleApiCache Tests
```typescript
// packages/app-store/_utils/googleapis/__tests__/GoogleApiCache.test.ts
import { GoogleApiCache } from '../GoogleApiCache';

describe('GoogleApiCache', () => {
  let cache: GoogleApiCache;
  
  beforeEach(() => {
    cache = new GoogleApiCache(123, {
      cacheWindowMs: 1000,
      maxCacheEntries: 10,
      enableLogging: false,
    });
  });

  test('should cache and retrieve values', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
    
    // First call should hit the API
    const result1 = await cache.dedupe('events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ data: 'test' });
    
    // Second call should hit the cache
    const result2 = await cache.dedupe('events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1
    expect(result2).toEqual({ data: 'test' });
  });

  test('should generate consistent cache keys', () => {
    const params1 = { calendarId: 'primary', timeMin: '2023-01-01' };
    const params2 = { timeMin: '2023-01-01', calendarId: 'primary' };
    
    const key1 = cache.generateRequestSignature('events.list', params1);
    const key2 = cache.generateRequestSignature('events.list', params2);
    
    expect(key1).toBe(key2);
  });

  test('should expire cache entries', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ data: 'first' })
      .mockResolvedValueOnce({ data: 'second' });
    
    // First call
    const result1 = await cache.dedupe('events.list', { calendarId: 'primary' }, mockFetch);
    expect(result1).toEqual({ data: 'first' });
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Second call should hit API again
    const result2 = await cache.dedupe('events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result2).toEqual({ data: 'second' });
  });

  test('should enforce max cache entries', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
    
    // Fill cache beyond limit
    for (let i = 0; i < 15; i++) {
      await cache.dedupe('events.list', { calendarId: `cal-${i}` }, mockFetch);
    }
    
    const stats = cache.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(10);
  });
});
```

### CacheClient Tests
```typescript
// packages/app-store/_utils/googleapis/__tests__/CacheClient.test.ts
import { EdgeCacheClient, RedisCacheClient, NoOpCacheClient } from '../CacheClient';

describe('CacheClient', () => {
  describe('NoOpCacheClient', () => {
    let client: NoOpCacheClient;
    
    beforeEach(() => {
      client = new NoOpCacheClient();
    });

    test('should return null for get operations', async () => {
      const result = await client.get('test-key');
      expect(result).toBeNull();
    });

    test('should not throw for set operations', async () => {
      await expect(client.set('test-key', 'test-value')).resolves.toBeUndefined();
    });

    test('should not throw for del operations', async () => {
      await expect(client.del('test-key')).resolves.toBeUndefined();
    });
  });

  describe('EdgeCacheClient', () => {
    let client: EdgeCacheClient;
    
    beforeEach(() => {
      client = new EdgeCacheClient('test-prefix');
    });

    test('should handle cache operations gracefully', async () => {
      // These tests would require Next.js environment
      // In unit tests, they should not throw errors
      await expect(client.get('test-key')).resolves.toBeNull();
      await expect(client.set('test-key', 'test-value')).resolves.toBeUndefined();
      await expect(client.del('test-key')).resolves.toBeUndefined();
    });
  });
});
```

### CachedFetchManager Tests
```typescript
// packages/app-store/_utils/googleapis/__tests__/CachedFetchManager.test.ts
import { CachedFetchManager } from '../cachedFetch';
import { NoOpCacheClient } from '../CacheClient';

describe('CachedFetchManager', () => {
  let manager: CachedFetchManager;
  
  beforeEach(() => {
    manager = new CachedFetchManager(new NoOpCacheClient());
  });

  test('should cache read operations', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
    
    // First call
    await manager.cachedFetch(123, 'events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Second call should hit cache
    await manager.cachedFetch(123, 'events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('should bypass cache for write operations', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
    
    // Write operations should always hit API
    await manager.cachedFetch(123, 'events.insert', { calendarId: 'primary' }, mockFetch);
    await manager.cachedFetch(123, 'events.insert', { calendarId: 'primary' }, mockFetch);
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('should provide cache statistics', () => {
    const stats = manager.getCacheStats(123);
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('credentialId');
    expect(stats).toHaveProperty('config');
  });

  test('should clear cache for specific credential', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
    
    // Add entry to cache
    await manager.cachedFetch(123, 'events.list', { calendarId: 'primary' }, mockFetch);
    
    // Clear cache
    manager.clearCache(123);
    
    // Next call should hit API again
    await manager.cachedFetch(123, 'events.list', { calendarId: 'primary' }, mockFetch);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

## Integration Testing

### End-to-End Cache Flow
```javascript
// test-googleapis-cache-integration.js
const { GoogleApiCacheFactory } = require("@calcom/app-store/_utils/googleapis");

async function testCacheIntegration() {
  console.log("Testing googleapis cache integration...");
  
  try {
    // Test Edge Cache Manager
    const edgeCacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
    console.log("✓ Edge cache manager created");
    
    // Test Redis Cache Manager
    const redisCacheManager = GoogleApiCacheFactory.createRedisCacheManager();
    console.log("✓ Redis cache manager created");
    
    // Test cache operations
    const mockFetch = () => Promise.resolve({ data: "test-data", timestamp: Date.now() });
    
    // Test caching behavior
    const result1 = await edgeCacheManager.cachedFetch(123, "events.list", { calendarId: "primary" }, mockFetch);
    const result2 = await edgeCacheManager.cachedFetch(123, "events.list", { calendarId: "primary" }, mockFetch);
    
    console.log("✓ Cache operations completed");
    
    // Test cache stats
    const stats = edgeCacheManager.getCacheStats(123);
    console.log("✓ Cache stats:", stats);
    
    // Test cache clearing
    edgeCacheManager.clearCache(123);
    console.log("✓ Cache cleared");
    
    console.log("Integration test completed successfully!");
    return true;
  } catch (error) {
    console.error("Integration test failed:", error);
    return false;
  }
}

if (require.main === module) {
  testCacheIntegration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testCacheIntegration };
```

### Performance Testing
```javascript
// test-googleapis-cache-performance.js
const { GoogleApiCacheFactory } = require("@calcom/app-store/_utils/googleapis");

async function performanceTest() {
  console.log("Running performance tests...");
  
  const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
  const credentialId = 123;
  
  // Simulate API call with delay
  const mockApiCall = (delay = 100) => {
    return () => new Promise(resolve => {
      setTimeout(() => resolve({ data: `response-${Date.now()}` }), delay);
    });
  };
  
  // Test cache hit performance
  console.log("Testing cache hit performance...");
  
  const params = { calendarId: "primary", timeMin: "2023-01-01T00:00:00Z" };
  
  // First call (cache miss)
  const start1 = Date.now();
  await cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(100));
  const time1 = Date.now() - start1;
  console.log(`Cache miss time: ${time1}ms`);
  
  // Second call (cache hit)
  const start2 = Date.now();
  await cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(100));
  const time2 = Date.now() - start2;
  console.log(`Cache hit time: ${time2}ms`);
  
  const speedup = time1 / time2;
  console.log(`Cache speedup: ${speedup.toFixed(2)}x`);
  
  // Test concurrent requests
  console.log("Testing concurrent request deduplication...");
  
  const concurrentRequests = Array(10).fill().map(() =>
    cacheManager.cachedFetch(credentialId, "events.list", params, mockApiCall(50))
  );
  
  const startConcurrent = Date.now();
  await Promise.all(concurrentRequests);
  const concurrentTime = Date.now() - startConcurrent;
  
  console.log(`10 concurrent requests completed in: ${concurrentTime}ms`);
  
  // Test memory usage
  const stats = cacheManager.getCacheStats(credentialId);
  console.log(`Cache entries: ${stats.size}`);
  
  console.log("Performance tests completed!");
}

if (require.main === module) {
  performanceTest().catch(console.error);
}

module.exports = { performanceTest };
```

## Manual Testing

### Local Development Testing
```bash
# 1. Start the development server
yarn dev

# 2. Test cache integration
node packages/app-store/_utils/googleapis/test-googleapis-cache-integration.js

# 3. Test performance
node packages/app-store/_utils/googleapis/test-googleapis-cache-performance.js

# 4. Monitor cache behavior
curl -X POST http://localhost:3000/api/book/event \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypeId": 1,
    "name": "Test User",
    "email": "test@example.com",
    "start": "2023-12-01T10:00:00Z",
    "end": "2023-12-01T11:00:00Z"
  }'
```

### Production Testing Checklist
- [ ] Cache hit ratios are above 50% for repeated requests
- [ ] Memory usage stays within configured limits
- [ ] No data leakage between different credentials
- [ ] Cache expiration works correctly
- [ ] Fallback to direct API calls works when cache fails
- [ ] Performance improvements are measurable
- [ ] Error rates don't increase with caching enabled

## Automated Testing

### CI/CD Pipeline Tests
```yaml
# .github/workflows/test-googleapis-cache.yml
name: Google APIs Cache Tests

on:
  pull_request:
    paths:
      - 'packages/app-store/_utils/googleapis/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:6
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - run: yarn install --frozen-lockfile
      - run: yarn test packages/app-store/_utils/googleapis
      - run: node packages/app-store/_utils/googleapis/test-googleapis-cache-integration.js
      - run: node packages/app-store/_utils/googleapis/test-googleapis-cache-performance.js
```

### Test Coverage Requirements
- Unit tests: >90% code coverage
- Integration tests: All major code paths
- Performance tests: Cache hit ratios and response times
- Error handling: All failure scenarios covered

## Debugging Tests

### Debug Logging
```typescript
// Enable debug logging in tests
const cache = new GoogleApiCache(123, {
  enableLogging: true,
  cacheWindowMs: 1000,
  maxCacheEntries: 10,
});
```

### Test Utilities
```typescript
// Test helper functions
export const createMockCalendarClient = () => ({
  events: {
    list: jest.fn().mockResolvedValue({ data: { items: [] } }),
    get: jest.fn().mockResolvedValue({ data: { id: 'test-event' } }),
  },
  freebusy: {
    query: jest.fn().mockResolvedValue({ data: { calendars: {} } }),
  },
  calendarList: {
    list: jest.fn().mockResolvedValue({ data: { items: [] } }),
  },
});

export const waitForCacheExpiration = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const generateTestParams = (overrides = {}) => ({
  calendarId: 'primary',
  timeMin: '2023-01-01T00:00:00Z',
  timeMax: '2023-01-02T00:00:00Z',
  ...overrides,
});
```
