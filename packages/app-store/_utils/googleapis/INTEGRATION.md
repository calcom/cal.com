# Google APIs Caching Integration Guide

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

## Framework-Specific Integration

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

## Step-by-Step Integration

### Step 1: Update handleNewBooking Interface
```typescript
// packages/features/bookings/lib/handleNewBooking.ts
export type BookingHandlerInput = {
  // ... existing fields
  googleApiCacheManager?: import("@calcom/app-store/_utils/googleapis").CachedFetchManager;
} & PlatformParams;
```

### Step 2: Update EventManager Constructor
```typescript
// packages/lib/EventManager.ts
constructor(
  user: EventManagerUser,
  eventTypeAppMetadata?: z.infer<typeof EventTypeAppMetadataSchema>,
  options?: { googleApiCacheManager?: import("@calcom/app-store/_utils/googleapis").CachedFetchManager }
) {
  // ... existing logic
  this.googleApiCacheManager = options?.googleApiCacheManager;
}
```

### Step 3: Update getCalendar Function
```typescript
// packages/app-store/_utils/getCalendar.ts
export const getCalendar = async (
  credential: CredentialForCalendarService | null,
  cacheManager?: import("@calcom/app-store/_utils/googleapis").CachedFetchManager
): Promise<Calendar | null> => {
  // ... existing logic
  
  if (calendarType === "google_calendar" && cacheManager) {
    return new CalendarService(credential, cacheManager);
  }
  
  return new CalendarService(credential);
};
```

### Step 4: Update CalendarService Constructor
```typescript
// packages/app-store/googlecalendar/lib/CalendarService.ts
constructor(
  credential: CredentialForCalendarServiceWithEmail,
  cacheManager?: import("@calcom/app-store/_utils/googleapis").CachedFetchManager
) {
  this.credential = credential;
  this.auth = new CalendarAuth(credential, cacheManager);
}
```

## Testing Integration

### Local Testing Script
```javascript
// test-googleapis-cache-integration.js
const { GoogleApiCacheFactory } = require("@calcom/app-store/_utils/googleapis");

async function testIntegration() {
  console.log("Testing googleapis cache integration...");
  
  // Test Edge Cache Manager
  const edgeCacheManager = GoogleApiCacheFactory.createEdgeCacheManager();
  console.log("✓ Edge cache manager created");
  
  // Test Redis Cache Manager
  const redisCacheManager = GoogleApiCacheFactory.createRedisCacheManager();
  console.log("✓ Redis cache manager created");
  
  // Test cache stats
  const stats = edgeCacheManager.getCacheStats(123);
  console.log("✓ Cache stats:", stats);
  
  console.log("Integration test completed successfully!");
}

testIntegration().catch(console.error);
```

Run the integration test:
```bash
cd packages/app-store/_utils/googleapis
node test-cache.js
```

## Verification Checklist

### Code Integration
- [ ] `handleNewBooking` accepts optional `googleApiCacheManager` parameter
- [ ] `EventManager` constructor accepts cache manager in options
- [ ] `getCalendar` function passes cache manager to CalendarService
- [ ] `CalendarAuth` constructor accepts optional cache manager
- [ ] `CachedCalendarClient` wraps raw calendar client when cache manager is provided

### Framework Compatibility
- [ ] Next.js API routes create EdgeCacheManager
- [ ] Nest.js modules import GoogleApiCacheModule
- [ ] Both frameworks pass cache manager through booking flow
- [ ] Cache client selection is explicit (no framework detection)

### Error Handling
- [ ] Cache failures fall back to direct API calls
- [ ] Missing cache manager doesn't break existing functionality
- [ ] Network errors are properly handled and logged
- [ ] Invalid cache configurations are handled gracefully

### Performance
- [ ] Cache hits return faster than direct API calls
- [ ] Memory usage stays within configured limits
- [ ] Expired entries are automatically cleaned up
- [ ] Cache statistics are accurate and accessible

### Security
- [ ] Per-credential cache isolation is maintained
- [ ] Sensitive parameters are removed from cache keys
- [ ] No data leakage between different users
- [ ] Cache keys are properly hashed and secured

## Troubleshooting

### Common Issues

#### Cache Not Working
1. Verify cache manager is properly passed through the call chain
2. Check that the credential ID is correctly set
3. Ensure read operations are being cached (not write operations)
4. Verify cache client is properly initialized

#### Memory Issues
1. Check cache size limits in configuration
2. Verify expired entries are being cleaned up
3. Monitor cache statistics for unusual growth
4. Consider reducing cache TTL or max entries

#### Performance Issues
1. Verify cache hit ratio is reasonable (>50% for repeated requests)
2. Check cache client performance (Redis vs Edge cache)
3. Monitor API call reduction metrics
4. Verify cache keys are being generated consistently

### Debug Logging
Enable debug logging to troubleshoot integration issues:
```typescript
const cache = new GoogleApiCache(credentialId, {
  enableLogging: true,
  cacheWindowMs: 30000,
  maxCacheEntries: 1000
});
```

### Health Checks
```typescript
// Check cache health
const stats = cacheManager.getCacheStats(credentialId);
if (stats.size > stats.config.maxCacheEntries * 0.9) {
  console.warn("Cache approaching size limit");
}
```
