# Google APIs Caching Architecture

## Overview

This caching layer provides framework-agnostic de-duplication for Google Calendar API calls to prevent rate limit quota exhaustion. It integrates at the `CalendarAuth` level to intercept all googleapis calls across both Next.js and Nest.js frameworks.

## Architecture Components

### Cache Clients

```typescript
interface ICacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}
```

#### EdgeCacheClient (Next.js)
- Uses Next.js `unstable_cache` for server-side caching
- Leverages Next.js built-in cache invalidation
- Automatic cache revalidation based on TTL

#### RedisCacheClient (Nest.js)
- Integrates with existing Redis infrastructure
- Supports distributed caching across multiple instances
- Manual TTL management with Redis expiration

#### NoOpCacheClient (Fallback)
- Provides no-op implementation when caching is disabled
- Ensures graceful degradation without breaking functionality

### Core Caching Logic

#### GoogleApiCache
- In-memory request de-duplication with configurable time windows
- SHA-256 request signature generation for consistent cache keys
- Automatic cleanup of expired entries
- Per-credential isolation for security

#### CachedFetchManager
- Orchestrates caching logic across different cache clients
- Manages multiple GoogleApiCache instances (one per credential)
- Provides unified interface for cache operations

#### CachedCalendarClient
- Wraps `calendar_v3.Calendar` to intercept API calls
- Selectively caches read operations while bypassing writes
- Maintains full API compatibility with original client

## Integration Flow

### Next.js API Route
```
Next.js API Route
├── GoogleApiCacheFactory.createEdgeCacheManager()
├── handleNewBooking({ googleApiCacheManager })
    ├── EventManager({ googleApiCacheManager })
        ├── CalendarManager(credentials, googleApiCacheManager)
            ├── getCalendar(credential, googleApiCacheManager)
                ├── GoogleCalendarService(credential, cacheManager)
                    ├── CalendarAuth(credential, cacheManager)
                        └── CachedCalendarClient(rawClient, credentialId, cacheManager)
```

### 1. Next.js API Route Level
```typescript
// apps/web/pages/api/book/event.ts
const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
const booking = await handleNewBooking({
  // ... other params
  googleApiCacheManager: cacheManager,
});
```

### 2. Nest.js Module Level
```typescript
// apps/api/v2/src/ee/bookings/.../bookings.module.ts
@Module({
  imports: [GoogleApiCacheModule],
  providers: [BookingsService],
})
export class BookingsModule {}

// In service
constructor(private googleApiCacheService: GoogleApiCacheService) {}

async createBooking() {
  const cacheManager = this.googleApiCacheService.getCacheManager();
  return handleNewBooking({ googleApiCacheManager: cacheManager });
}
```

### 3. CalendarAuth Integration
```typescript
// packages/app-store/googlecalendar/lib/CalendarAuth.ts
constructor(
  credential: CredentialForCalendarServiceWithEmail,
  cacheManager?: CachedFetchManager
) {
  this.credential = credential;
  this.cacheManager = cacheManager;
}

async getCalendarClient(): Promise<calendar_v3.Calendar> {
  const rawClient = await this.createRawClient();
  
  if (this.cacheManager) {
    return new CachedCalendarClient(rawClient, this.credential.id, this.cacheManager);
  }
  
  return rawClient;
}
```

## Request Signature Generation

### Normalization Process
1. **Parameter Cleaning**: Remove timestamp-sensitive fields (`requestId`, `quotaUser`, `_timestamp`)
2. **Key Sorting**: Sort object keys alphabetically for consistent hashing
3. **Recursive Processing**: Apply normalization to nested objects
4. **Credential Isolation**: Include credential ID in signature to prevent data leakage

### Signature Algorithm
```typescript
const signatureData = {
  method: "events.list",
  params: normalizedParams,
  credentialId: 123
};
const signature = crypto.createHash("sha256")
  .update(JSON.stringify(signatureData))
  .digest("hex");
```

## Caching Strategy

### Read Operations (Cached)
- `calendar.events.list` - Event listing queries
- `calendar.events.get` - Individual event retrieval
- `calendar.events.instances` - Recurring event instances
- `calendar.freebusy.query` - Availability checking
- `calendar.calendarList.list` - Calendar enumeration

### Write Operations (Bypassed)
- `calendar.events.insert` - Event creation
- `calendar.events.update` - Event modification
- `calendar.events.delete` - Event deletion
- `calendar.events.move` - Event relocation

### Cache Expiration
- Default TTL: 30 seconds
- Configurable per cache instance
- Automatic cleanup of expired entries
- Maximum cache size limits (default: 1000 entries per credential)

## Security Considerations

### Per-Credential Isolation
- Each credential maintains separate cache namespace
- Cache keys include credential ID to prevent cross-user access
- No shared cache entries between different users

### Parameter Sanitization
- Removes potentially sensitive fields before hashing
- Normalizes parameters to prevent cache key manipulation
- Consistent hashing regardless of parameter order

### Error Handling
- Cache failures fall back to direct API calls
- No caching of error responses
- Comprehensive logging for security monitoring

## Performance Characteristics

### Cache Hit Benefits
- **Latency**: ~1ms vs ~200-500ms for API calls
- **Rate Limits**: Eliminates duplicate requests within cache window
- **Bandwidth**: Reduces network traffic for repeated requests
- **API Quotas**: Preserves Google Calendar API quotas

### Memory Usage
- In-memory cache per credential (default: 1000 entries max)
- Automatic cleanup of expired entries
- Configurable memory limits

### Network Impact
- Reduced API call frequency
- Lower bandwidth usage for repeated requests
- Improved response times for cached operations

## Monitoring and Debugging

### Cache Statistics
```typescript
const stats = cacheManager.getCacheStats(credentialId);
// Returns: { size: number, credentialId: number, config: CacheConfig }
```

### Logging
- Cache hits/misses with timing information
- Request signatures (truncated for security)
- Cache cleanup operations
- Error conditions and fallbacks

### Metrics
- Cache hit ratio per credential
- Average response time improvement
- Memory usage per cache instance
- API call reduction percentage

## Future Enhancements

### Intelligent Cache Invalidation
- Event-based cache invalidation for write operations
- Webhook integration for real-time cache updates
- Smart TTL adjustment based on data volatility

### Advanced Caching Strategies
- Predictive caching for frequently accessed data
- Background refresh for near-expired entries
- Hierarchical caching with multiple TTL levels

### Performance Optimizations
- Compression for large cache entries
- Distributed caching across multiple Redis instances
- Cache warming strategies for common queries
