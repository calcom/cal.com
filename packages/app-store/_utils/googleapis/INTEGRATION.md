# Google APIs Caching Integration Guide

## Overview

This document describes how the Google APIs caching layer integrates with the Cal.com booking flow to prevent rate limit quota exhaustion.

## Integration Flow

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

## Key Integration Points

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
// CalendarAuth constructor now accepts optional cache manager
constructor(
  credential: CredentialForCalendarServiceWithEmail, 
  cacheManager?: CachedFetchManager
) {
  this.cacheManager = cacheManager;
}

// getClient() returns CachedCalendarClient instead of raw calendar_v3.Calendar
public async getClient(): Promise<CachedCalendarClient> {
  const rawClient = new calendar_v3.Calendar({ auth: googleAuthClient });
  return new CachedCalendarClient(rawClient, this.credential.id, this.cacheManager);
}
```

## Cached Methods

### Read Operations (Cached with 30s TTL)
- `calendar.events.list` - Event listing
- `calendar.events.get` - Single event retrieval
- `calendar.events.instances` - Recurring event instances
- `calendar.freebusy.query` - Availability checking
- `calendar.calendarList.list` - Calendar enumeration
- `calendar.calendarList.get` - Single calendar details

### Write Operations (Not Cached)
- `calendar.events.insert` - Event creation
- `calendar.events.update` - Event updates
- `calendar.events.delete` - Event deletion
- `calendar.events.patch` - Partial event updates

## Cache Isolation

- **Per-credential caching**: Each Google credential gets isolated cache namespace
- **Request signature**: SHA-256 hash of method + normalized parameters
- **Parameter normalization**: Removes timestamp-sensitive fields (`requestId`, `quotaUser`)
- **TTL enforcement**: 30-second default cache window with automatic cleanup

## Framework-Specific Implementations

### Next.js (EdgeCacheClient)
- Uses `unstable_cache` from Next.js
- Leverages cache tags for selective invalidation
- Automatic revalidation based on TTL

### Nest.js (RedisCacheClient)
- Uses existing RedisService infrastructure
- Distributed caching across multiple instances
- Configurable TTL with Redis EXPIRE

## Error Handling

- Cache failures fall back to direct API calls
- No impact on existing booking flow if caching fails
- Comprehensive logging for cache hits/misses
- Graceful degradation when cache is unavailable

## Monitoring

```typescript
const stats = cachedCalendarClient.getCacheStats();
console.log({
  cacheSize: stats.size,
  credentialId: stats.credentialId,
  cacheConfig: stats.config,
});
```

## Testing

Run the integration test:
```bash
cd packages/app-store/_utils/googleapis
node test-cache.js
```

This verifies:
- Cache hit/miss behavior
- Request de-duplication
- TTL expiration
- Per-credential isolation
