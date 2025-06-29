# Google APIs Caching - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Google APIs caching layer to production environments.

## Pre-deployment Checklist

### 1. Environment Configuration
- [ ] Verify Redis is available for Nest.js environments
- [ ] Confirm Next.js unstable_cache is enabled
- [ ] Set appropriate cache TTL values
- [ ] Configure logging levels

### 2. Code Review
- [ ] All googleapis calls go through CachedCalendarClient
- [ ] No raw HTTP/fetch calls remain in CalendarAuth
- [ ] Cache client injection is explicit (no framework detection)
- [ ] Error handling includes cache fallback

### 3. Testing
- [ ] Unit tests pass for all cache components
- [ ] Integration tests verify cache behavior
- [ ] Load testing confirms performance improvements
- [ ] Booking flow works end-to-end

## Deployment Steps

### 1. Feature Flag (Recommended)
```typescript
// Add feature flag for gradual rollout
const GOOGLE_API_CACHE_ENABLED = process.env.GOOGLE_API_CACHE_ENABLED === "true";

// In factory
export class GoogleApiCacheFactory {
  static createEdgeCacheManager(): CachedFetchManager {
    if (!GOOGLE_API_CACHE_ENABLED) {
      return new CachedFetchManager(new NoOpCacheClient());
    }
    return new CachedFetchManager(new EdgeCacheClient());
  }
}
```

### 2. Environment Variables
```bash
# Production
GOOGLE_API_CACHE_ENABLED=true
GOOGLE_API_CACHE_WINDOW_MS=30000
GOOGLE_API_CACHE_MAX_ENTRIES=1000
GOOGLE_API_CACHE_LOG_LEVEL=info

# Development
GOOGLE_API_CACHE_ENABLED=true
GOOGLE_API_CACHE_LOG_LEVEL=debug
```

### 3. Monitoring Setup
```typescript
// Add metrics collection
const cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  quotaSaved: 0
};

// In CachedFetchManager
public async cachedFetch<T>(...) {
  // ... existing code
  if (cached) {
    cacheMetrics.hits++;
    cacheMetrics.quotaSaved++;
  } else {
    cacheMetrics.misses++;
  }
}
```

### 4. Gradual Rollout Strategy

#### Phase 1: Canary Deployment (5% traffic)
- Deploy to small subset of users
- Monitor cache hit rates and error rates
- Verify no performance degradation

#### Phase 2: Staged Rollout (25% traffic)
- Increase traffic gradually
- Monitor googleapis quota usage reduction
- Check for any booking flow issues

#### Phase 3: Full Deployment (100% traffic)
- Complete rollout to all users
- Monitor system stability
- Collect performance metrics

## Monitoring and Alerting

### Key Metrics
- Cache hit rate (target: >70%)
- API quota usage reduction (target: >30%)
- Cache error rate (target: <1%)
- Booking success rate (maintain: >99%)

### Alerts
```yaml
# Example Prometheus alerts
- alert: GoogleApiCacheHitRateLow
  expr: google_api_cache_hit_rate < 0.7
  for: 5m
  annotations:
    summary: "Google API cache hit rate is below 70%"

- alert: GoogleApiCacheErrors
  expr: rate(google_api_cache_errors[5m]) > 0.01
  for: 2m
  annotations:
    summary: "Google API cache error rate is above 1%"
```

### Dashboards
- Cache performance metrics
- API quota usage trends
- Error rates and types
- Response time improvements

## Rollback Plan

### Immediate Rollback
```bash
# Disable caching via environment variable
export GOOGLE_API_CACHE_ENABLED=false

# Restart services
kubectl rollout restart deployment/cal-web
kubectl rollout restart deployment/cal-api
```

### Code Rollback
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Deploy previous version
kubectl set image deployment/cal-web app=cal-web:previous-tag
```

## Performance Optimization

### Cache Tuning
```typescript
// Adjust cache parameters based on usage patterns
const cacheConfig = {
  cacheWindowMs: process.env.NODE_ENV === 'production' ? 30000 : 10000,
  maxCacheEntries: process.env.NODE_ENV === 'production' ? 5000 : 1000,
  enableLogging: process.env.NODE_ENV !== 'production'
};
```

### Memory Management
```typescript
// Monitor cache memory usage
setInterval(() => {
  const stats = getCachedFetchManager().getAllCacheStats();
  const totalSize = Object.values(stats).reduce((sum, stat) => sum + stat.size, 0);
  
  if (totalSize > MAX_CACHE_SIZE) {
    logger.warn('Cache size exceeding limits', { totalSize });
  }
}, 60000);
```

## Troubleshooting

### Common Issues

1. **High Cache Miss Rate**
   - Check parameter normalization
   - Verify cache key generation
   - Review cache TTL settings

2. **Memory Usage Spikes**
   - Monitor cache cleanup frequency
   - Adjust max cache entries
   - Check for memory leaks

3. **API Quota Still High**
   - Verify all googleapis calls are cached
   - Check for cache bypass scenarios
   - Review read vs write operation ratios

### Debug Commands
```bash
# Check cache statistics
curl http://localhost:3000/api/debug/cache-stats

# View cache entries for credential
curl http://localhost:3000/api/debug/cache-entries?credentialId=123

# Test cache behavior
curl -X POST http://localhost:3000/api/debug/test-cache
```

## Security Considerations

### Data Privacy
- Cache keys don't contain sensitive data
- Per-credential isolation maintained
- Cache entries expire appropriately

### Access Control
- Cache debug endpoints restricted to admin users
- Monitoring data anonymized
- Audit logs for cache operations

## Maintenance

### Regular Tasks
- Monitor cache performance weekly
- Review error logs monthly
- Update cache parameters quarterly
- Performance testing before major releases

### Cache Cleanup
```typescript
// Scheduled cleanup job
cron.schedule('0 2 * * *', () => {
  getCachedFetchManager().cleanupExpiredEntries();
  logger.info('Daily cache cleanup completed');
});
```

## Success Criteria

### Performance Targets
- 30% reduction in googleapis quota usage
- 50ms improvement in average response time
- 70%+ cache hit rate
- <1% cache-related error rate

### Business Impact
- Reduced API costs
- Improved user experience
- Better system reliability
- Increased booking success rate

## Post-Deployment Validation

### Week 1
- [ ] Verify cache hit rates meet targets
- [ ] Confirm quota usage reduction
- [ ] Check for any booking flow regressions
- [ ] Monitor error rates and types

### Week 2-4
- [ ] Analyze performance trends
- [ ] Optimize cache parameters if needed
- [ ] Collect user feedback
- [ ] Document lessons learned

### Month 1+
- [ ] Quarterly performance review
- [ ] Cost savings analysis
- [ ] Plan for future enhancements
- [ ] Update documentation
