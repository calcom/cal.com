# Google APIs Caching Infrastructure

This module provides a framework-agnostic caching layer for Google Calendar API calls to prevent rate limit quota exhaustion through request de-duplication.

## Architecture

### Core Components

- **CacheClient**: Abstract interface for caching operations
- **EdgeCacheClient**: Next.js implementation using `unstable_cache`
- **RedisCacheClient**: Nest.js implementation using Redis
- **GoogleApiCache**: In-memory cache with configurable TTL and size limits
- **CachedCalendarClient**: Wrapper for `calendar_v3.Calendar` that intercepts API calls
- **CachedFetchManager**: Orchestrates caching logic and request de-duplication

### Integration Points

1. **CalendarAuth**: Modified to accept optional `CachedFetchManager` in constructor
2. **CalendarService**: Passes cache manager to CalendarAuth
3. **EventManager**: Receives cache manager and passes to CalendarManager
4. **CalendarManager**: Passes cache manager to `getCalendar()` function
5. **getCalendar()**: Creates CalendarService with cache manager for Google Calendar

## Usage

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

## Cached API Methods

The following Google Calendar API methods are cached:

### Read Operations (Cached)
- `calendar.events.list`
- `calendar.events.get`
- `calendar.events.instances`
- `calendar.freebusy.query`
- `calendar.calendarList.list`
- `calendar.calendarList.get`

### Write Operations (Not Cached)
- `calendar.events.insert`
- `calendar.events.update`
- `calendar.events.delete`
- `calendar.events.patch`

## Configuration

### Cache Settings

```typescript
const cache = new GoogleApiCache(credentialId, {
  cacheWindowMs: 30000,     // 30 seconds default
  maxCacheEntries: 1000,    // Max entries per credential
  enableLogging: true,      // Debug logging
});
```

### Request Signature

Cache keys are generated using:
- Credential ID (for isolation)
- API method name
- Normalized parameters (sorted, timestamp-sensitive fields removed)
- SHA-256 hash of the above

## Security

- **Per-credential isolation**: Each credential gets its own cache namespace
- **Parameter normalization**: Removes `requestId` and `quotaUser` to prevent cache pollution
- **TTL enforcement**: Automatic cleanup of expired entries
- **Memory limits**: Configurable maximum cache size per credential

## Monitoring

```typescript
const stats = cachedCalendarClient.getCacheStats();
console.log({
  size: stats.size,
  credentialId: stats.credentialId,
  config: stats.config,
});
```

## Framework Detection

The implementation uses **explicit dependency injection** rather than runtime framework detection:

- Next.js: Cache manager created at API route level
- Nest.js: Cache manager injected via DI container
- No automatic detection or global singletons

This ensures predictable behavior and easier testing across both frameworks.
