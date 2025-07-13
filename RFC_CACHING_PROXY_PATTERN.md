# RFC: Repository Caching Proxy Pattern

## Summary

This RFC proposes implementing a standardized caching proxy pattern for repositories in the Cal.com codebase. The pattern introduces a reusable `BaseCacheProxy<T>` abstract class that can wrap any repository interface to provide Redis caching with graceful fallback, reducing boilerplate code and enabling consistent caching behavior across different data access layers.

## Motivation

### Current State
- Repository classes directly handle database queries without caching
- Each repository that needs caching must implement its own Redis integration
- Caching logic is duplicated across different repositories
- No standardized approach for cache invalidation and error handling
- Performance bottlenecks from repeated database queries for frequently accessed data

### Problems Addressed
1. **Code Duplication**: Every repository needing caching must implement similar Redis integration patterns
2. **Inconsistent Caching**: Different repositories may implement caching differently, leading to maintenance issues
3. **Performance**: Lack of caching for frequently accessed data like feature flags impacts response times
4. **Error Handling**: No standardized approach for handling Redis failures and fallback scenarios
5. **Maintainability**: Caching logic mixed with business logic makes repositories harder to maintain

## Detailed Design

### Core Components

#### 1. BaseCacheProxy<T> Abstract Class

```typescript
export abstract class BaseCacheProxy<TRepository, TImplementation extends TRepository> {
  protected redis: RedisService | null = null;
  protected readonly REDIS_KEY_VERSION: string;
  protected readonly CACHE_TTL = 300; // 5 minutes
  protected repository: TImplementation;

  constructor(repository: TImplementation, keyPrefix: string);
  protected async withCache<TResult>(...): Promise<TResult>;
  protected async withoutCache<TResult>(...): Promise<TResult>;
  protected async invalidateKeys(keys: string[]): Promise<void>;
  protected buildCacheKey(...parts: (string | number)[]): string;
}
```

**Key Features:**
- **Generic Design**: Works with any repository interface through TypeScript generics
- **Dependency Injection**: Repository instances injected via constructor
- **Environment-Aware**: Automatically detects Redis availability via environment variables
- **Graceful Fallback**: Falls back to original repository when Redis is unavailable
- **Consistent Key Generation**: Standardized cache key formatting with versioning

#### 2. Cache-First Strategy

The proxy implements a cache-first strategy:
1. **Cache Hit**: Return cached data immediately
2. **Cache Miss**: Query original repository, cache result, return data
3. **Cache Error**: Log warning, fall back to repository
4. **Redis Unavailable**: Bypass caching entirely, use repository directly

#### 3. Error Handling & Resilience

- **Redis Connection Failures**: Graceful degradation to direct repository access
- **Cache Operation Failures**: Logged warnings without breaking functionality
- **Sentry Integration**: Automatic error reporting for repository failures
- **Environment Flexibility**: Works with or without Redis configuration

### Implementation Example

#### Before (Original Repository)
```typescript
export class FeaturesRepository implements IFeaturesRepository {
  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    // Direct database query
    return await this.queryDatabase(slug);
  }
}
```

#### After (Cached Proxy)
```typescript
export class CachedFeaturesRepository 
  extends BaseCacheProxy<IFeaturesRepository, FeaturesRepository> 
  implements IFeaturesRepository {

  constructor(featuresRepository?: FeaturesRepository) {
    super(featuresRepository || new FeaturesRepository(), "features");
  }

  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags): Promise<boolean> {
    const cacheKey = this.buildCacheKey("global", slug);
    
    return this.withCache(
      cacheKey,
      () => this.repository.checkIfFeatureIsEnabledGlobally(slug),
      "global feature check"
    );
  }
}
```

### Cache Key Strategy

Cache keys follow a consistent hierarchical format:
```
V1.{keyPrefix}.{scope}.{identifier}.{slug}
```

Examples:
- `V1.features.global.feature-flag-name`
- `V1.features.user.12345.feature-flag-name`
- `V1.features.team.67890.feature-flag-name`

**Benefits:**
- **Versioning**: `V1` prefix allows for cache invalidation during schema changes
- **Namespacing**: `keyPrefix` prevents collisions between different repositories
- **Hierarchical**: Supports targeted invalidation by scope
- **Predictable**: Easy to debug and monitor cache usage

### Integration Points

The proxy pattern integrates seamlessly with existing code:

```typescript
// Before
const featuresRepository = new FeaturesRepository();

// After  
const featuresRepository = new CachedFeaturesRepository();
```

No changes required to consuming code due to interface compatibility.

## Benefits

### 1. Performance Improvements
- **Reduced Database Load**: Frequently accessed data served from Redis
- **Lower Latency**: Sub-millisecond cache responses vs. database queries
- **Scalability**: Better handling of high-traffic scenarios

### 2. Code Quality
- **DRY Principle**: Eliminates caching boilerplate across repositories
- **Separation of Concerns**: Caching logic separated from business logic
- **Type Safety**: Full TypeScript support with generics
- **Testability**: Easy to mock and test caching behavior

### 3. Operational Benefits
- **Monitoring**: Consistent logging and error reporting
- **Debugging**: Standardized cache key format for easy troubleshooting
- **Flexibility**: Works with or without Redis configuration
- **Resilience**: Graceful degradation when caching is unavailable

### 4. Developer Experience
- **Reusability**: Base class can be extended for any repository
- **Consistency**: Standardized patterns across the codebase
- **Documentation**: Clear interface and usage patterns
- **Maintainability**: Centralized caching logic for easier updates

## Implementation Details

### Environment Configuration

The proxy automatically detects Redis availability:

```typescript
const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && 
                         process.env.UPSTASH_REDIS_REST_URL;
```

**Required Environment Variables:**
- `UPSTASH_REDIS_REST_TOKEN`: Authentication token for Upstash Redis
- `UPSTASH_REDIS_REST_URL`: Connection URL for Upstash Redis

### Cache TTL Strategy

- **Default TTL**: 300 seconds (5 minutes)
- **Configurable**: Can be overridden per repository
- **Appropriate for**: Feature flags and configuration data
- **Considerations**: Balance between freshness and performance

### Error Handling Patterns

```typescript
// Cache operation with fallback
try {
  const cachedResult = await this.redis.get<TResult>(cacheKey);
  if (cachedResult !== null) return cachedResult;
} catch (error) {
  console.warn(`Redis get failed for ${errorContext}, falling back to repository:`, error);
}

// Repository operation with error reporting
try {
  const result = await repositoryMethod();
  // Cache the result...
  return result;
} catch (err) {
  captureException(err); // Sentry integration
  throw err;
}
```

## Migration Strategy

### Phase 1: Foundation (Current)
- ✅ Implement `BaseCacheProxy<T>` abstract class
- ✅ Refactor `CachedFeaturesRepository` to use base class
- ✅ Update integration points to use cached repository
- ✅ Maintain backward compatibility

### Phase 2: Expansion (Future)
- Extend pattern to other repositories (Users, Teams, Bookings)
- Add cache warming strategies for critical data
- Implement cache analytics and monitoring
- Add cache invalidation webhooks

### Phase 3: Optimization (Future)
- Implement distributed cache invalidation
- Add cache compression for large objects
- Implement cache preloading strategies
- Add cache hit/miss metrics

## Testing Strategy

### Unit Tests
- Mock Redis service for isolated testing
- Test cache hit/miss scenarios
- Verify fallback behavior when Redis is unavailable
- Test error handling and logging

### Integration Tests
- Test with real Redis instance
- Verify cache invalidation works correctly
- Test concurrent access patterns
- Validate performance improvements

### Performance Tests
- Measure cache hit ratios
- Compare response times with/without caching
- Test under high load scenarios
- Monitor memory usage patterns

## Monitoring & Observability

### Metrics to Track
- Cache hit/miss ratios per repository
- Redis connection health
- Cache operation latencies
- Error rates and types

### Logging Strategy
- Structured logging for cache operations
- Warning logs for Redis failures
- Debug logs for cache key generation
- Error logs with Sentry integration

### Alerting
- Redis connection failures
- High cache miss rates
- Unusual error patterns
- Performance degradation

## Security Considerations

### Data Sensitivity
- Feature flags are generally non-sensitive configuration data
- Future repositories may handle sensitive data requiring encryption
- Cache keys should not expose sensitive information

### Access Control
- Redis access controlled via environment variables
- No direct Redis access from application code
- Centralized Redis service for consistent security

### Data Retention
- TTL-based expiration prevents stale data accumulation
- No persistent storage of sensitive information in cache
- Cache invalidation for immediate data updates

## Performance Impact

### Expected Improvements
- **Feature Flag Queries**: 50-90% reduction in response time
- **Database Load**: 60-80% reduction in feature flag queries
- **Scalability**: Better handling of traffic spikes

### Resource Usage
- **Memory**: Minimal impact due to TTL-based expiration
- **Network**: Reduced database connections
- **CPU**: Slight increase for cache operations, offset by reduced DB load

## Alternatives Considered

### 1. In-Memory Caching
**Pros**: No external dependencies, faster access
**Cons**: Not shared across instances, memory usage, no persistence
**Decision**: Redis chosen for distributed caching needs

### 2. Database-Level Caching
**Pros**: Transparent to application, handles all queries
**Cons**: Less control, harder to invalidate, not query-specific
**Decision**: Application-level caching provides better control

### 3. Repository-Specific Caching
**Pros**: Tailored to specific needs
**Cons**: Code duplication, inconsistent patterns, maintenance overhead
**Decision**: Generic base class provides consistency and reusability

## Future Enhancements

### 1. Advanced Cache Strategies
- **Write-Through**: Update cache and database simultaneously
- **Write-Behind**: Asynchronous database updates
- **Cache Warming**: Preload frequently accessed data

### 2. Multi-Level Caching
- **L1 Cache**: In-memory for ultra-fast access
- **L2 Cache**: Redis for distributed caching
- **L3 Cache**: Database with optimized queries

### 3. Smart Invalidation
- **Event-Driven**: Invalidate based on domain events
- **Dependency Tracking**: Invalidate related cache entries
- **Predictive**: Refresh cache before expiration

## Conclusion

The Repository Caching Proxy Pattern provides a robust, scalable solution for adding caching to Cal.com's data access layer. By implementing a reusable `BaseCacheProxy<T>` class, we achieve:

- **Significant performance improvements** through Redis caching
- **Reduced code duplication** via reusable base class
- **Improved maintainability** through separation of concerns
- **Enhanced reliability** with graceful fallback mechanisms
- **Better developer experience** with consistent patterns

The pattern is designed to be incrementally adoptable, starting with feature flags and expanding to other repositories as needed. The implementation maintains backward compatibility while providing a clear path for future enhancements.

This approach aligns with Cal.com's goals of improving performance, maintaining code quality, and providing a scalable foundation for future growth.

---

**Implementation Status**: ✅ Complete
**PR**: https://github.com/calcom/cal.com/pull/22458
**Devin Session**: https://app.devin.ai/sessions/e8c35edcbdd74277a5a841b3396dffa2
