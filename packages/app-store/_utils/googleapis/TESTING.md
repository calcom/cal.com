# Google APIs Caching - Testing Guide

## Overview

This document provides comprehensive testing instructions for the Google APIs caching layer implementation.

## Test Files

### 1. Unit Tests
- `test-cache.js` - Basic cache functionality tests
- `integration-test.ts` - Mock-based integration tests
- `test-integration.ts` - Jest-compatible test suite
- `test-cache-integration.ts` - Comprehensive integration testing

### 2. Manual Testing Scripts
- `test-googleapis-cache.js` - Standalone cache testing script

## Running Tests

### Unit Tests
```bash
cd /home/ubuntu/repos/cal.com
node packages/app-store/_utils/googleapis/test-cache.js
```

### Integration Tests
```bash
cd /home/ubuntu/repos/cal.com
npx ts-node packages/app-store/_utils/googleapis/test-cache-integration.ts
```

### Full Test Suite
```bash
cd /home/ubuntu/repos/cal.com
yarn test packages/app-store/_utils/googleapis/
```

## Test Scenarios

### 1. Cache Hit/Miss Behavior
- ✅ Identical requests within cache window return cached responses
- ✅ Different requests bypass cache
- ✅ Requests outside cache window make new API calls
- ✅ Per-credential isolation prevents data leakage

### 2. Parameter Normalization
- ✅ Timestamp-sensitive fields excluded from cache keys
- ✅ Object key sorting for consistent hashing
- ✅ Nested object handling

### 3. Framework Integration
- ✅ Next.js EdgeCacheClient integration
- ✅ Nest.js RedisCacheClient integration
- ✅ NoOpCacheClient fallback behavior

### 4. Error Handling
- ✅ Cache failures don't break API calls
- ✅ Graceful degradation to direct API calls
- ✅ Proper error logging and monitoring

## Expected Test Results

### Cache Integration Test
```
🧪 Starting Google API Cache Integration Test...
🔄 Testing events.list caching...
📞 Mock API call #1 - events.list
✅ First call completed
✅ Second identical call completed (should be cached)
🔄 Testing freebusy.query caching...
📞 Mock API call #2 - freebusy.query
✅ First freebusy call completed
✅ Second identical freebusy call completed (should be cached)
🔄 Testing different parameters (should not be cached)...
📞 Mock API call #3 - events.list
✅ Different parameter call completed
📊 Test Results:
Total mock API calls made: 3
Expected: 3 calls (2 cached, 1 different param)
🎉 Cache integration test PASSED!
```

## Performance Testing

### Load Testing
```bash
# Test cache performance under load
for i in {1..100}; do
  node packages/app-store/_utils/googleapis/test-cache.js &
done
wait
```

### Memory Usage Monitoring
```bash
# Monitor memory usage during cache operations
node --inspect packages/app-store/_utils/googleapis/test-cache-integration.ts
```

## Debugging

### Enable Debug Logging
```typescript
const cacheManager = GoogleApiCacheFactory.createEdgeCacheManager({
  enableLogging: true,
  logLevel: 'debug'
});
```

### Cache Statistics
```typescript
const stats = cachedClient.getCacheStats();
console.log('Cache stats:', stats);
```

### Manual Cache Inspection
```typescript
const cacheManager = getCachedFetchManager();
const stats = cacheManager.getCacheStats(credentialId);
console.log('Cache size:', stats.size);
```

## Troubleshooting

### Common Issues

1. **Cache Not Working**
   - Verify cache manager is properly injected
   - Check that read operations are being cached (not write operations)
   - Ensure parameters are being normalized correctly

2. **Memory Leaks**
   - Verify cache cleanup is running
   - Check max cache entries configuration
   - Monitor cache size over time

3. **Type Errors**
   - Ensure all googleapis method signatures are correctly typed
   - Verify CachedCalendarClient implements all required methods
   - Check import paths for cache client types

### Debug Commands
```bash
# Type checking
yarn type-check:ci

# Linting
yarn lint

# Test specific file
yarn test packages/app-store/_utils/googleapis/test-cache-integration.ts
```

## CI/CD Integration

### Pre-commit Hooks
```bash
# Run cache tests before commit
yarn test:cache
yarn type-check:ci
```

### GitHub Actions
```yaml
- name: Test Google APIs Cache
  run: |
    yarn test packages/app-store/_utils/googleapis/
    node packages/app-store/_utils/googleapis/test-cache.js
```

## Monitoring in Production

### Metrics to Track
- Cache hit rate
- API quota usage reduction
- Response time improvements
- Error rates

### Alerting
- Cache failure rates above threshold
- Memory usage exceeding limits
- API quota approaching limits

## Test Data

### Sample API Responses
```typescript
const mockEventsList = {
  data: {
    items: [
      { id: "event1", summary: "Test Event 1" },
      { id: "event2", summary: "Test Event 2" }
    ]
  }
};

const mockFreebusyResponse = {
  data: {
    calendars: {
      "primary": {
        busy: [
          {
            start: "2023-01-01T10:00:00Z",
            end: "2023-01-01T11:00:00Z"
          }
        ]
      }
    }
  }
};
```

### Test Credentials
```typescript
const testCredential = {
  id: 123,
  type: "google_calendar",
  key: { /* mock credential data */ },
  userId: 456
};
```

## Conclusion

This testing guide ensures comprehensive validation of the Google APIs caching layer. Regular execution of these tests helps maintain cache reliability and performance across different environments and use cases.
