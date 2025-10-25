# Cal.com Dev Server Optimization Architecture

## Executive Summary

Based on the performance analysis, we've identified three critical bottlenecks:
1. **Static Asset Copying**: 431 synchronous file operations causing 1-2s delay
2. **App Store Module Loading**: Sequential loading of 62 apps adding ~0.5s
3. **Circular Dependencies**: 264 circular references impacting bundle complexity

This architecture design provides solutions for each bottleneck, prioritized by impact.

## 1. Lazy Asset Loading System

### Problem
- Copying 431 static files synchronously blocks server startup
- Each file operation takes 2-5ms, totaling 1-2 seconds

### Solution A: Symlink Architecture (Recommended)
```typescript
// packages/features/ee/server-assets/AssetSymlinkManager.ts
interface AssetSymlinkManager {
  setupSymlinks(): Promise<void>
  validateSymlinks(): boolean
  cleanupSymlinks(): Promise<void>
}

// Implementation:
1. Create symlinks instead of copying files
2. One-time setup during build/install
3. Near-instant "copying" on dev server start
4. Fallback to copy if symlinks unavailable
```

### Solution B: Lazy Copy with Manifest
```typescript
// packages/features/ee/server-assets/LazyAssetLoader.ts
interface AssetManifest {
  assets: Map<string, AssetMetadata>
  loadAsset(path: string): Promise<void>
  preloadCritical(): Promise<void>
}

// Features:
1. Generate manifest of all assets during build
2. Copy only critical assets on startup
3. Lazy-load other assets on first request
4. Cache loaded assets for session
```

### Implementation Priority: HIGH
- Estimated time saving: 1-2 seconds
- Complexity: Low-Medium
- Risk: Low (with proper fallbacks)

## 2. Route-Based App Loading Architecture

### Problem
- All 62 apps load sequentially on startup
- Each app imports dependencies eagerly
- No code splitting at app level

### Solution: Dynamic App Registry
```typescript
// packages/lib/app-store/AppRegistry.ts
interface AppRegistry {
  // Core apps loaded immediately
  coreApps: Set<string>
  
  // Route-based lazy loading
  loadApp(slug: string): Promise<AppModule>
  
  // Preload apps for specific routes
  preloadRoute(route: string): Promise<void>
  
  // Cache loaded apps
  cache: Map<string, AppModule>
}

// Usage in routes:
// apps/web/pages/api/integrations/[...args].ts
export default async function handler(req, res) {
  const appSlug = extractAppSlug(req)
  const app = await AppRegistry.loadApp(appSlug)
  return app.handler(req, res)
}
```

### Core Apps (Always Loaded)
```typescript
const CORE_APPS = [
  'apple-calendar',
  'google-calendar',
  'google-meet',
  'zoom',
  'caldav-calendar'
] // ~5 most used apps
```

### Route Mapping
```typescript
const ROUTE_APP_MAP = {
  '/api/integrations/googlecalendar': ['google-calendar', 'google-meet'],
  '/api/integrations/office365': ['office365-calendar', 'office365-video'],
  '/api/integrations/zoom': ['zoom'],
  // ... etc
}
```

### Implementation Priority: HIGH
- Estimated time saving: 300-500ms
- Complexity: Medium
- Risk: Medium (needs thorough testing)

## 3. Caching Layer for App Registry

### Problem
- App metadata computed on every load
- No persistence between dev server restarts
- Redundant dependency resolution

### Solution: Multi-Level Cache
```typescript
// packages/lib/app-store/AppCache.ts
interface AppCache {
  // L1: In-memory cache (fastest)
  memory: Map<string, CachedApp>
  
  // L2: File system cache (persistent)
  disk: DiskCache
  
  // Cache warming on startup
  warmCache(apps: string[]): Promise<void>
  
  // Invalidation strategy
  invalidate(appSlug: string): void
}

// Cache structure:
interface CachedApp {
  metadata: AppMetadata
  dependencies: string[]
  routes: string[]
  lastModified: number
  checksum: string
}
```

### Cache Warming Strategy
```typescript
// On dev server start:
1. Load cache manifest from disk
2. Validate checksums for changed files
3. Warm memory cache with core apps
4. Background load frequently used apps
```

### Implementation Priority: MEDIUM
- Estimated time saving: 100-200ms
- Complexity: Medium
- Risk: Low

## 4. Circular Dependency Resolution

### Problem
- 264 circular dependencies in Prisma models
- Increases bundle complexity and size
- Prevents effective tree-shaking

### Solution: Dependency Injection Pattern
```typescript
// packages/prisma/client/injected.ts
interface PrismaInjector {
  registerModel(name: string, model: any): void
  getModel(name: string): any
  resolveCircular(deps: string[]): void
}

// Before (circular):
// User.ts imports Team.ts
// Team.ts imports User.ts

// After (injected):
// User.ts registers with injector
// Team.ts registers with injector
// Both request dependencies from injector
```

### Implementation Priority: LOW
- Estimated time saving: 50-100ms
- Complexity: High
- Risk: High (requires extensive refactoring)

## Implementation Plan

### Phase 1: Quick Wins (Week 1)
1. **Implement Symlink Architecture**
   - Create AssetSymlinkManager
   - Add to build process
   - Test cross-platform compatibility
   - Add fallback mechanism

2. **Core App Identification**
   - Analyze app usage metrics
   - Define CORE_APPS list
   - Separate core vs optional loading

### Phase 2: Route-Based Loading (Week 2)
1. **Dynamic App Registry**
   - Implement AppRegistry class
   - Convert static imports to dynamic
   - Add route mapping logic
   - Test all app integrations

2. **Route Preloading**
   - Analyze common user flows
   - Implement smart preloading
   - Add performance metrics

### Phase 3: Caching Layer (Week 3)
1. **Multi-Level Cache**
   - Implement memory cache
   - Add disk persistence
   - Create cache warming logic
   - Add invalidation hooks

2. **Performance Monitoring**
   - Add startup time metrics
   - Track cache hit rates
   - Monitor memory usage

### Phase 4: Circular Dependencies (Week 4+)
1. **Dependency Analysis**
   - Map all circular refs
   - Identify breaking patterns
   - Plan injection points

2. **Gradual Migration**
   - Start with worst offenders
   - Test thoroughly
   - Monitor bundle size

## Success Metrics

### Target Performance
- Dev server startup: < 3 seconds (from 8-10s)
- First page load: < 1 second
- Hot reload: < 500ms

### Monitoring
```typescript
interface PerformanceMetrics {
  startupTime: number
  assetLoadTime: number
  appLoadTime: number
  cacheHitRate: number
  memoryUsage: number
}
```

## Risk Mitigation

1. **Symlinks on Windows**
   - Requires admin privileges
   - Fallback to copying
   - Clear error messages

2. **Dynamic Loading Bugs**
   - Comprehensive test suite
   - Gradual rollout
   - Feature flags

3. **Cache Invalidation**
   - File watchers for changes
   - Checksum validation
   - Manual cache clear option

## Conclusion

This architecture prioritizes the highest-impact optimizations first:
1. Symlink architecture (1-2s saved)
2. Route-based loading (0.5s saved)
3. Caching layer (0.2s saved)

Combined, these optimizations should reduce dev server startup from 8-10 seconds to under 3 seconds, with minimal risk to stability.