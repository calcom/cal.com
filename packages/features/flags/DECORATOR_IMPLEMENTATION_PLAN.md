# Memoize/Unmemoize Decorator Implementation Plan

## Overview

This plan outlines the implementation of `@Memoize` and `@Unmemoize` decorators to replace the current CachedXXRepository + PrismaXXRepository + RedisXXRepository pattern (9 classes per 3 entities) with a more declarative approach.

## Current State

The current implementation uses three layers per entity:
- `PrismaUserFeatureRepository` - Database access
- `RedisUserFeatureRepository` - Cache operations (get/set/invalidate)
- `CachedUserFeatureRepository` - Orchestrates cache-aside pattern

This results in 9 repository classes for 3 entities (Feature, TeamFeature, UserFeature), with repetitive cache-aside logic in each CachedXXRepository.

## Target State

A single repository class per entity with decorators handling caching:

```typescript
class UserFeatureRepository {
  @Memoize({ key: (userId, featureId) => `features:user:${userId}:${featureId}`, schema: userFeaturesSchema })
  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeatures | null> {
    return this.prisma.userFeatures.findUnique({ where: { userId_featureId: { userId, featureId } } });
  }

  @Unmemoize({ keys: (userId, featureId) => [`features:user:${userId}:${featureId}`] })
  async upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures> {
    return this.prisma.userFeatures.upsert({ ... });
  }
}
```

## Implementation Steps

### Step 1: Enable Decorators in tsconfig (if needed)

The `packages/features/tsconfig.json` extends `@calcom/tsconfig/react-library.json`. We need to add `experimentalDecorators: true` to enable legacy decorators.

**Note**: Many packages already have `experimentalDecorators: true` (apps/web, apps/api/v2, packages/trpc, etc.), so this is consistent with the codebase.

### Step 2: Create Decorator Infrastructure

Create new files in `packages/features/cache/`:

1. **`packages/features/cache/decorators/Memoize.ts`**
   - Decorator that wraps methods with cache-aside logic
   - Accepts configuration: `key`, `ttl`, `schema` (Zod)
   - Uses `IRedisService` for cache operations
   - Validates cached data with Zod schema before returning

2. **`packages/features/cache/decorators/Unmemoize.ts`**
   - Decorator that invalidates cache keys after method execution
   - Accepts configuration: `keys` (function returning array of cache keys)
   - Invalidates specified keys after the wrapped method completes

3. **`packages/features/cache/decorators/index.ts`**
   - Re-exports both decorators

4. **`packages/features/cache/decorators/types.ts`**
   - Shared types for decorator configuration

### Step 3: Implement @Memoize Decorator

```typescript
interface MemoizeConfig<TArgs extends unknown[]> {
  key: (...args: TArgs) => string;
  ttl?: number;
  schema?: ZodSchema;
}

function Memoize<TArgs extends unknown[]>(config: MemoizeConfig<TArgs>) {
  return function <T extends { redis: IRedisService }>(
    target: (this: T, ...args: TArgs) => Promise<unknown>,
    context: ClassMethodDecoratorContext
  ) {
    return async function (this: T, ...args: TArgs) {
      const cacheKey = config.key(...args);
      const cached = await this.redis.get<unknown>(cacheKey);
      
      if (cached !== null) {
        if (config.schema) {
          const parsed = config.schema.safeParse(cached);
          if (parsed.success) return parsed.data;
        } else {
          return cached;
        }
      }
      
      const result = await target.call(this, ...args);
      if (result !== null) {
        await this.redis.set(cacheKey, result, { ttl: config.ttl ?? DEFAULT_TTL });
      }
      return result;
    };
  };
}
```

### Step 4: Implement @Unmemoize Decorator

```typescript
interface UnmemoizeConfig<TArgs extends unknown[]> {
  keys: (...args: TArgs) => string[];
}

function Unmemoize<TArgs extends unknown[]>(config: UnmemoizeConfig<TArgs>) {
  return function <T extends { redis: IRedisService }>(
    target: (this: T, ...args: TArgs) => Promise<unknown>,
    context: ClassMethodDecoratorContext
  ) {
    return async function (this: T, ...args: TArgs) {
      const result = await target.call(this, ...args);
      const keysToInvalidate = config.keys(...args);
      await Promise.all(keysToInvalidate.map((key) => this.redis.del(key)));
      return result;
    };
  };
}
```

### Step 5: Refactor UserFeatureRepository

Create a new unified `UserFeatureRepository` that uses decorators:

```typescript
export class UserFeatureRepository implements IUserFeatureRepository {
  constructor(
    private prisma: PrismaClient,
    private redis: IRedisService
  ) {}

  async findByUserId(userId: number): Promise<UserFeatures[]> {
    return this.prisma.userFeatures.findMany({ where: { userId } });
  }

  @Memoize({
    key: (userId: number, featureId: FeatureId) => `features:user:${userId}:${featureId}`,
    schema: userFeaturesSchema,
  })
  async findByUserIdAndFeatureId(userId: number, featureId: FeatureId): Promise<UserFeatures | null> {
    return this.prisma.userFeatures.findUnique({
      where: { userId_featureId: { userId, featureId } },
    });
  }

  @Memoize({
    key: (userId: number) => `features:user:autoOptIn:${userId}`,
    schema: booleanSchema,
  })
  async findAutoOptInByUserId(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autoOptInFeatures: true },
    });
    return user?.autoOptInFeatures ?? false;
  }

  @Unmemoize({
    keys: (userId: number, featureId: FeatureId) => [`features:user:${userId}:${featureId}`],
  })
  async upsert(userId: number, featureId: FeatureId, enabled: boolean, assignedBy: string): Promise<UserFeatures> {
    return this.prisma.userFeatures.upsert({
      where: { userId_featureId: { userId, featureId } },
      create: { userId, featureId, enabled, assignedBy },
      update: { enabled, assignedBy },
    });
  }

  @Unmemoize({
    keys: (userId: number, featureId: FeatureId) => [`features:user:${userId}:${featureId}`],
  })
  async delete(userId: number, featureId: FeatureId): Promise<void> {
    await this.prisma.userFeatures.delete({
      where: { userId_featureId: { userId, featureId } },
    });
  }

  @Unmemoize({
    keys: (userId: number) => [`features:user:autoOptIn:${userId}`],
  })
  async updateAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { autoOptInFeatures: enabled },
    });
  }

  // Methods without caching (complex queries)
  async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string): Promise<boolean> {
    // ... existing implementation
  }

  async checkIfUserBelongsToTeamWithFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    // ... existing implementation
  }
}
```

### Step 6: Update DI Configuration

Update the DI module to use the new unified repository:

```typescript
// packages/features/flags/di/UserFeatureRepository.module.ts
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserFeatureRepository,
  depsMap: {
    prisma: prismaModuleLoader,
    redis: redisModuleLoader,
  },
});
```

### Step 7: Write Tests

Create comprehensive tests for the decorators:

1. **`packages/features/cache/decorators/__tests__/Memoize.test.ts`**
   - Test cache hit returns cached value
   - Test cache miss fetches from source and caches
   - Test Zod validation on cached data
   - Test null results are not cached
   - Test TTL is respected

2. **`packages/features/cache/decorators/__tests__/Unmemoize.test.ts`**
   - Test cache keys are invalidated after method execution
   - Test multiple keys can be invalidated
   - Test method result is returned correctly

## File Structure

```
packages/features/
  cache/
    decorators/
      __tests__/
        Memoize.test.ts
        Unmemoize.test.ts
      Memoize.ts
      Unmemoize.ts
      types.ts
      index.ts
  flags/
    repositories/
      UserFeatureRepository.ts  (new unified repository)
      # Keep existing files for backward compatibility during migration
    di/
      UserFeatureRepository.module.ts  (new module)
      tokens.ts  (add new token)
```

## Migration Strategy

1. Create the new decorator infrastructure alongside existing code
2. Create the new unified `UserFeatureRepository` with decorators
3. Add new DI module for the unified repository
4. Update consumers to use the new repository
5. Remove old CachedXXRepository, RedisXXRepository files after migration is complete

## Benefits

1. **Reduced boilerplate**: 1 class instead of 3 per entity
2. **Declarative caching**: Cache behavior is visible at method level
3. **Co-located logic**: Caching and invalidation rules are next to the methods they affect
4. **Type-safe**: Full TypeScript support with proper typing
5. **Testable**: Decorators can be tested independently
6. **Consistent**: Same pattern for all repositories

## Considerations

1. **Decorator limitations**: Legacy decorators (experimentalDecorators) are used since TC39 decorators have different semantics
2. **Redis dependency**: Repository classes must have `redis: IRedisService` property for decorators to work
3. **Zod validation**: Optional but recommended for cached data integrity
4. **TTL**: Default 5 minutes, configurable per method

## Timeline

1. Step 1-2: Create decorator infrastructure (~30 min)
2. Step 3-4: Implement decorators (~30 min)
3. Step 5: Refactor UserFeatureRepository (~30 min)
4. Step 6: Update DI configuration (~15 min)
5. Step 7: Write tests (~45 min)
6. Type checks and lint (~15 min)
7. Create PR (~10 min)

Total estimated time: ~3 hours
