# Google APIs Caching Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Redis service is available for Nest.js environments
- [ ] Next.js cache configuration is properly set
- [ ] Environment variables are configured for cache settings
- [ ] Monitoring and logging infrastructure is in place

### 2. Code Review
- [ ] All googleapis calls go through CachedCalendarClient
- [ ] No raw HTTP/fetch calls remain in CalendarAuth
- [ ] Cache client injection is explicit (no framework detection)
- [ ] Error handling includes cache fallback

### 3. Testing
- [ ] Unit tests pass for all cache components
- [ ] Integration tests verify end-to-end caching flow
- [ ] Performance tests show expected cache hit ratios
- [ ] Load tests confirm memory usage stays within limits

## Deployment Strategy

### Phase 1: Infrastructure Preparation
1. **Redis Setup** (for Nest.js environments)
   ```bash
   # Verify Redis connectivity
   redis-cli ping
   # Should return: PONG
   ```

2. **Next.js Cache Configuration**
   ```typescript
   // next.config.js
   module.exports = {
     experimental: {
       serverComponentsExternalPackages: ['@calcom/app-store'],
     },
   };
   ```

### Phase 2: Feature Flag Rollout
1. **Environment Variables**
   ```bash
   # Enable caching gradually
   GOOGLE_API_CACHE_ENABLED=true
   GOOGLE_API_CACHE_TTL=30000
   GOOGLE_API_CACHE_MAX_ENTRIES=1000
   ```

2. **Gradual Rollout**
   - Start with 10% of traffic
   - Monitor cache hit ratios and error rates
   - Gradually increase to 100% over 1 week

### Phase 3: Full Deployment
1. **Production Deployment**
   ```bash
   # Deploy with caching enabled
   yarn build
   yarn start
   ```

2. **Monitoring Setup**
   - Cache hit/miss ratios
   - Memory usage per credential
   - API call reduction metrics
   - Error rates and fallback frequency

## Configuration

### Environment Variables
```bash
# Cache Configuration
GOOGLE_API_CACHE_ENABLED=true
GOOGLE_API_CACHE_TTL=30000          # 30 seconds
GOOGLE_API_CACHE_MAX_ENTRIES=1000   # Per credential
GOOGLE_API_CACHE_LOGGING=true       # Debug logging

# Redis Configuration (Nest.js)
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=googleapis_cache

# Next.js Cache Configuration
NEXT_CACHE_REVALIDATE=30            # Seconds
```

### Runtime Configuration
```typescript
// Dynamic configuration per environment
const cacheConfig = {
  development: {
    cacheWindowMs: 10000,    // 10 seconds for faster testing
    maxCacheEntries: 100,    // Smaller cache for dev
    enableLogging: true,     // Verbose logging
  },
  production: {
    cacheWindowMs: 30000,    // 30 seconds for production
    maxCacheEntries: 1000,   // Full cache size
    enableLogging: false,    // Minimal logging
  },
};
```

## Monitoring

### Key Metrics
1. **Cache Performance**
   - Cache hit ratio (target: >70%)
   - Average response time improvement
   - Memory usage per credential
   - Cache size growth over time

2. **API Usage**
   - Google Calendar API call reduction
   - Rate limit hit frequency
   - Error rate changes
   - Quota usage optimization

3. **System Health**
   - Memory consumption
   - Redis connection health (Nest.js)
   - Next.js cache performance
   - Error rates and fallback usage

### Monitoring Setup
```typescript
// Custom metrics collection
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  apiCallsSaved: 0,
  memoryUsage: process.memoryUsage(),
};

// Export metrics for monitoring systems
app.get('/metrics/googleapis-cache', (req, res) => {
  const stats = cacheManager.getCacheStats(credentialId);
  res.json({
    ...metrics,
    cacheStats: stats,
    hitRatio: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses),
  });
});
```

### Alerting
```yaml
# Example alerting rules
alerts:
  - name: GoogleApisCacheHitRatioLow
    condition: cache_hit_ratio < 0.5
    duration: 5m
    message: "Google APIs cache hit ratio is below 50%"
    
  - name: GoogleApisCacheMemoryHigh
    condition: cache_memory_usage > 100MB
    duration: 2m
    message: "Google APIs cache memory usage is high"
    
  - name: GoogleApisCacheErrorRateHigh
    condition: cache_error_rate > 0.1
    duration: 1m
    message: "Google APIs cache error rate is elevated"
```

## Rollback Plan

### Immediate Rollback
1. **Disable Caching**
   ```bash
   # Set environment variable
   GOOGLE_API_CACHE_ENABLED=false
   
   # Restart services
   pm2 restart all
   ```

2. **Code Rollback**
   ```bash
   # Revert to previous deployment
   git revert <commit-hash>
   yarn build && yarn start
   ```

### Gradual Rollback
1. **Reduce Traffic**
   - Decrease cache usage percentage
   - Monitor for improvements
   - Investigate issues

2. **Selective Disable**
   ```typescript
   // Disable for specific credentials or operations
   const shouldUseCache = (credentialId: number, method: string) => {
     const problematicCredentials = [123, 456];
     const problematicMethods = ['events.list'];
     
     return !problematicCredentials.includes(credentialId) &&
            !problematicMethods.includes(method);
   };
   ```

## Performance Optimization

### Cache Tuning
```typescript
// Optimize cache settings based on usage patterns
const optimizedConfig = {
  // High-frequency users: longer cache, larger size
  highFrequency: {
    cacheWindowMs: 60000,    // 1 minute
    maxCacheEntries: 2000,   // Larger cache
  },
  
  // Low-frequency users: shorter cache, smaller size
  lowFrequency: {
    cacheWindowMs: 15000,    // 15 seconds
    maxCacheEntries: 500,    // Smaller cache
  },
};
```

### Memory Management
```typescript
// Implement cache eviction policies
class OptimizedGoogleApiCache extends GoogleApiCache {
  private enforceMemoryLimits() {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      this.clearOldestEntries(0.2); // Clear 20% of entries
    }
  }
}
```

## Security Considerations

### Access Control
- Ensure cache isolation between credentials
- Validate cache key generation
- Monitor for potential data leakage
- Regular security audits of cache contents

### Data Protection
- No sensitive data in cache keys
- Automatic cache expiration
- Secure Redis configuration (if used)
- Encrypted cache contents for sensitive data

### Compliance
- GDPR compliance for cached user data
- Data retention policies
- Audit logging for cache access
- Regular compliance reviews

## Troubleshooting

### Common Issues
1. **High Memory Usage**
   - Check cache size limits
   - Verify cleanup is working
   - Monitor for memory leaks

2. **Low Cache Hit Ratio**
   - Verify cache key generation
   - Check TTL settings
   - Monitor request patterns

3. **Redis Connection Issues**
   - Verify Redis connectivity
   - Check connection pooling
   - Monitor Redis performance

### Debug Commands
```bash
# Check cache statistics
curl http://localhost:3000/api/debug/cache-stats

# Monitor Redis (if used)
redis-cli monitor

# Check memory usage
node -e "console.log(process.memoryUsage())"
```
