# Google APIs Caching Infrastructure

## Overview

This package provides a framework-agnostic caching layer for Google Calendar API calls to prevent rate limit quota exhaustion through request de-duplication. The system integrates at the `CalendarAuth` level to intercept all googleapis calls across both Next.js and Nest.js frameworks.

## Core Components

- **CacheClient**: Abstract interface for caching operations
- **EdgeCacheClient**: Next.js implementation using `unstable_cache`
- **RedisCacheClient**: Nest.js implementation using Redis
- **GoogleApiCache**: In-memory cache with configurable TTL and size limits
- **CachedCalendarClient**: Wrapper for `calendar_v3.Calendar` that intercepts API calls
- **CachedFetchManager**: Orchestrates caching logic and request de-duplication

## Framework Integration

### Next.js (Edge Cache)

```typescript
import { GoogleApiCacheFactory } from "@calcom/app-store/_utils/googleapis";

const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
const booking = await handleNewBooking({
  // ... other params
  googleApiCacheManager: cacheManager,
});
```

### Nest.js (Redis Cache)

```typescript
import { GoogleApiCacheModule, GoogleApiCacheService } from "@calcom/app-store/_utils/googleapis";

@Module({
  imports: [GoogleApiCacheModule],
})
export class BookingsModule {}

@Injectable()
export class BookingsService {
  constructor(private googleApiCacheService: GoogleApiCacheService) {}
  
  async createBooking() {
    const cacheManager = this.googleApiCacheService.getCacheManager();
    // Use cacheManager in booking flow
  }
}
```

## Integration Points

1. **CalendarAuth**: Modified to accept optional `CachedFetchManager` in constructor
2. **CalendarService**: Passes cache manager to CalendarAuth
3. **EventManager**: Receives cache manager and passes to CalendarManager
4. **CalendarManager**: Passes cache manager to `getCalendar()` function
5. **getCalendar()**: Creates CalendarService with cache manager for Google Calendar

## Cached API Methods

The caching layer focuses on read operations that commonly cause rate limiting:

- `calendar.events.list` - Event listing queries
- `calendar.events.get` - Individual event retrieval  
- `calendar.events.instances` - Recurring event instances
- `calendar.freebusy.query` - Availability checking
- `calendar.calendarList.list` - Calendar enumeration

Write operations (`insert`, `update`, `delete`) bypass caching to prevent data consistency issues.

## Configuration

### Cache Settings

```typescript
const cache = new GoogleApiCache(credentialId, {
  cacheWindowMs: 30000,     // 30 seconds default
  maxCacheEntries: 1000,    // Max entries per credential
  enableLogging: true,      // Debug logging
});
```

### Request Signature Generation

- SHA-256 hash of method + normalized parameters
- Removes timestamp-sensitive fields (`requestId`, `quotaUser`)
- Sorts object keys for consistent hashing
- Per-credential isolation to prevent data leakage

## Security

- **Per-credential isolation**: Each credential has its own cache namespace
- **Parameter normalization**: Removes sensitive/timestamp fields before hashing
- **No data leakage**: Cache keys include credential ID to prevent cross-user access
- **Automatic cleanup**: Expired entries are automatically removed

## Monitoring

```typescript
// Get cache statistics
const stats = cacheManager.getCacheStats(credentialId);
console.log(`Cache size: ${stats.size}, Config: ${JSON.stringify(stats.config)}`);

// Clear cache for specific credential
cacheManager.clearCache(credentialId);
```

## Performance Benefits

- **Rate limit prevention**: Eliminates duplicate API calls within configurable time windows
- **Reduced latency**: Cached responses return immediately
- **Bandwidth savings**: Reduces network traffic for repeated requests
- **API quota conservation**: Preserves Google Calendar API quotas for unique requests

## Error Handling

- Cache failures fall back to direct API calls
- Network errors are not cached
- Comprehensive logging for debugging and monitoring
- Graceful degradation when caching is unavailable
