import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { AssetSymlinkManager } from "@calcom/lib/server/AssetSymlinkManager";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import { LRUCache } from 'lru-cache';

// Cache for app metadata with 5 minute TTL
type CacheableApp = App;

const appMetadataCache = new LRUCache<string, CacheableApp | null>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

// Cache for full app registry
const appRegistryCache = new LRUCache<string, App[]>({
  max: 10,
  ttl: 60 * 1000, // 1 minute
});

// Route-based app loading configuration
const ROUTE_APP_MAPPING: Record<string, string[]> = {
  '/': ['routing-forms', 'eventtype', 'embed', 'installed-apps', 'bookings'], // Core apps
  '/apps': ['installed-apps'], // App listing page
  '/event-types': ['eventtype', 'google-calendar', 'google-meet', 'zoom', 'daily-video'],
  '/bookings': ['bookings', 'google-calendar', 'stripe'],
  '/workflows': ['routing-forms', 'sendgrid', 'twilio'],
  '/settings/my-account/conferencing': ['google-meet', 'zoom', 'daily-video', 'huddle01', 'jitsi'],
};

// Apps that should always be loaded (critical path)
const ALWAYS_LOAD_APPS = new Set([
  'routing-forms',
  'eventtype', 
  'embed',
  'installed-apps',
  'bookings'
]);

export interface OptimizedAppRegistryOptions {
  route?: string;
  forceRefresh?: boolean;
  preloadAssets?: boolean;
}

/**
 * Get app metadata with caching
 */
export async function getAppWithMetadataOptimized(app: { dirName: string } | { slug: string }): Promise<CacheableApp | null> {
  const cacheKey = 'dirName' in app ? `dir:${app.dirName}` : `slug:${app.slug}`;
  
  // Check cache first
  const cached = appMetadataCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let appMetadata: App | null = null;

  if ("dirName" in app) {
    appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata] as App;
  } else {
    const foundEntry = Object.entries(appStoreMetadata).find(([, meta]) => {
      return meta.slug === app.slug;
    });
    if (foundEntry) {
      appMetadata = foundEntry[1] as App;
    }
  }

  if (appMetadata) {
    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { key, ...metadata } = appMetadata;
    appMetadataCache.set(cacheKey, metadata);
    return metadata;
  }

  appMetadataCache.set(cacheKey, null);
  return null;
}

/**
 * Get apps needed for a specific route
 */
export function getAppsForRoute(route: string): string[] {
  const apps = new Set<string>(ALWAYS_LOAD_APPS);

  // Add route-specific apps
  for (const [routePattern, routeApps] of Object.entries(ROUTE_APP_MAPPING)) {
    if (route.startsWith(routePattern)) {
      routeApps.forEach(app => apps.add(app));
    }
  }

  // Extract app from dynamic routes
  const appMatch = route.match(/\/apps\/([^/]+)/);
  if (appMatch && appMatch[1]) {
    apps.add(appMatch[1]);
  }

  return Array.from(apps);
}

/**
 * Optimized app registry that only loads necessary apps
 */
export async function getOptimizedAppRegistry(options: OptimizedAppRegistryOptions = {}): Promise<App[]> {
  const { route = '/', forceRefresh = false, preloadAssets = false } = options;
  
  const cacheKey = `registry:${route}`;
  
  // Check cache unless force refresh
  if (!forceRefresh) {
    const cached = appRegistryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Get apps needed for this route
  const neededApps = getAppsForRoute(route);
  
  // Load app metadata in parallel
  const appPromises = neededApps.map(async (slug) => {
    const appMeta = await getAppWithMetadataOptimized({ slug });
    return appMeta ? { ...appMeta, slug } : null;
  });

  const apps = (await Promise.all(appPromises))
    .filter((app): app is App => app !== null);

  // Preload assets if requested
  if (preloadAssets && typeof window === 'undefined') {
    const symlinkManager = AssetSymlinkManager.getInstance();
    const symlinkConfigs = symlinkManager.getRouteAssets(route, appStoreMetadata);
    await symlinkManager.createSymlinks(symlinkConfigs);
  }

  appRegistryCache.set(cacheKey, apps);
  return apps;
}

/**
 * Lazy load additional apps on-demand
 */
export async function lazyLoadApp(slug: string): Promise<App | null> {
  // Check if already in cache
  const cacheKey = `slug:${slug}`;
  const cached = appMetadataCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Load app metadata
  const app = await getAppWithMetadataOptimized({ slug });
  if (!app) return null;

  // Create symlinks for app assets
  if (typeof window === 'undefined') {
    const symlinkManager = AssetSymlinkManager.getInstance();
    const configs = [{
      sourcePath: `/apps/${app.dirName}/static`,
      targetPath: `/public/app-assets/${slug}`,
      fallbackToCopy: true
    }];
    await symlinkManager.createSymlinks(configs);
  }

  return app;
}

/**
 * Preload apps that might be needed soon
 */
export async function preloadApps(slugs: string[]): Promise<void> {
  const promises = slugs.map(slug => lazyLoadApp(slug));
  await Promise.all(promises);
}

/**
 * Clear app registry caches
 */
export function clearAppRegistryCaches(): void {
  appMetadataCache.clear();
  appRegistryCache.clear();
}

/**
 * Get cache metrics for monitoring
 */
export function getAppRegistryMetrics() {
  return {
    metadataCache: {
      size: appMetadataCache.size,
      calculatedSize: appMetadataCache.calculatedSize,
    },
    registryCache: {
      size: appRegistryCache.size,
      calculatedSize: appRegistryCache.calculatedSize,
    }
  };
}