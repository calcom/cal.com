# Google APIs Caching Architecture

## Overview

This caching layer provides framework-agnostic de-duplication for Google Calendar API calls to prevent rate limit quota exhaustion. It integrates at the `CalendarAuth` level to intercept all googleapis calls across both Next.js and Nest.js frameworks.

## Architecture Components

### 1. Cache Clients (`CacheClient.ts`)

**Interface**: `ICacheClient`
- `get<T>(key: string): Promise<T | null>`
- `set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>`
- `del(key: string): Promise<void>`

**Implementations**:
- `EdgeCacheClient`: Uses Next.js `unstable_cache` for server-side caching
- `RedisCacheClient`: Uses Redis for distributed caching in Nest.js
- `NoOpCacheClient`: Fallback that performs no caching

### 2. Cache Manager (`cachedFetch.ts`)

**`CachedFetchManager`**: Core caching logic
- Per-credential cache isolation using `credentialId`
- Request signature generation via SHA-256 hash of method + normalized parameters
- Configurable cache window (default: 30 seconds)
- Automatic cleanup of expired entries

**`cachedFetch`**: Wrapper function for googleapis calls
- Only caches read operations (`.list`, `.get`, `.query`)
- Skips caching for write operations to avoid data consistency issues

### 3. Calendar Client Wrapper (`CachedCalendarClient.ts`)

**`CachedCalendarClient`**: Proxy for `calendar_v3.Calendar`
- Wraps all googleapis methods with caching layer
- Maintains identical API surface to original client
- Transparent caching - no changes required to calling code

### 4. Factory (`GoogleApiCacheFactory.ts`)

**`GoogleApiCacheFactory`**: Static factory methods
- `createEdgeCacheManager()`: For Next.js environments
- `createRedisCacheManager()`: For Nest.js environments
- Handles cache client instantiation and configuration

### 5. Nest.js Integration (`NestJsIntegration.ts`)

**`GoogleApiCacheModule`**: Nest.js module for dependency injection
**`GoogleApiCacheService`**: Injectable service providing cache manager

## Integration Points

### Next.js Integration

```typescript
// apps/web/pages/api/book/event.ts
const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
const booking = await handleNewBooking({
  // ... other params
  googleApiCacheManager: cacheManager,
});
```

### Nest.js Integration

```typescript
// Module registration
@Module({
  imports: [GoogleApiCacheModule],
  // ...
})

// Service injection
constructor(
  private readonly googleApiCacheService: GoogleApiCacheService
) {}

// Usage
const cacheManager = this.googleApiCacheService.getCacheManager();
```

### CalendarAuth Integration

```typescript
// packages/app-store/googlecalendar/lib/CalendarAuth.ts
constructor(
  credential: CredentialForCalendarServiceWithEmail,
  cacheManager?: CachedFetchManager
) {
  this.cacheManager = cacheManager;
}

public async getClient(): Promise<CachedCalendarClient> {
  const rawClient = new calendar_v3.Calendar({ auth: googleAuthClient });
  return new CachedCalendarClient(rawClient, this.credential.id, this.cacheManager);
}
```

## Caching Strategy

### Cached Methods
- `calendar.events.list` - Event listing
- `calendar.events.get` - Single event retrieval
- `calendar.freebusy.query` - Availability checking
- `calendar.calendarList.list` - Calendar enumeration

### Cache Key Generation
```
{credentialId}:{sha256(method + normalizedParams)}
```

### Parameter Normalization
- Removes timestamp-sensitive fields (`requestId`, `quotaUser`)
- Sorts object keys for consistent hashing
- Handles nested objects and arrays

### Cache Expiration
- Default TTL: 30 seconds
- Automatic cleanup of expired entries
- LRU eviction when max cache size exceeded

## Security Considerations

### Per-Credential Isolation
Each credential gets its own cache namespace to prevent data leakage between users.

### Parameter Sanitization
Sensitive parameters are normalized or excluded from cache key generation.

### Read-Only Caching
Only read operations are cached to avoid data consistency issues with write operations.

## Performance Benefits

### Rate Limit Prevention
- Eliminates duplicate API calls within cache window
- Reduces googleapis quota consumption
- Prevents rate limit errors during high-traffic periods

### Response Time Improvement
- Cached responses return immediately
- Reduces latency for repeated identical requests
- Improves user experience during booking flows

## Monitoring and Debugging

### Cache Statistics
```typescript
const stats = cachedClient.getCacheStats();
// Returns: { size, credentialId, config }
```

### Logging
- Cache hits/misses logged with request details
- Configurable log levels via `enableLogging` option
- Integration with existing Cal.com logger

## Configuration

### Cache Window
```typescript
new GoogleApiCache(credentialId, {
  cacheWindowMs: 30000, // 30 seconds
  maxCacheEntries: 1000,
  enableLogging: true,
});
```

### Environment Variables
- `GOOGLE_API_CACHE_WINDOW_MS`: Override default cache window
- `GOOGLE_API_CACHE_MAX_ENTRIES`: Override max cache size
- `GOOGLE_API_CACHE_ENABLED`: Enable/disable caching globally

## Testing

### Unit Tests
- Mock googleapis clients for isolated testing
- Verify cache hit/miss behavior
- Test parameter normalization and key generation

### Integration Tests
- End-to-end booking flow testing
- Multi-framework compatibility verification
- Performance benchmarking

## Migration Guide

### Existing Code Compatibility
The caching layer is designed to be transparent - existing code continues to work without modifications.

### Gradual Rollout
- Feature can be enabled per-credential or globally
- Fallback to no-op cache client if issues arise
- Monitoring and alerting for cache performance

## Future Enhancements

### Intelligent Cache Invalidation
- Webhook-based cache invalidation for calendar changes
- Smart TTL adjustment based on data volatility

### Advanced Caching Strategies
- Predictive caching for common access patterns
- Hierarchical caching with multiple TTL levels

### Metrics and Analytics
- Cache hit rate monitoring
- API quota usage tracking
- Performance impact measurement
