import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getAppWithMetadataOptimized,
  getAppsForRoute,
  getOptimizedAppRegistry,
  lazyLoadApp,
  preloadApps,
  clearAppRegistryCaches,
  getAppRegistryMetrics
} from './optimizedAppRegistry';

// Mock dependencies
vi.mock('@calcom/app-store/appStoreMetaData', () => ({
  appStoreMetadata: {
    'google-calendar': {
      slug: 'google-calendar',
      dirName: 'google-calendar',
      name: 'Google Calendar',
      category: 'calendar',
      key: 'secret-key'
    },
    'zoom': {
      slug: 'zoom',
      dirName: 'zoom-video',
      name: 'Zoom',
      category: 'video',
      key: 'secret-key'
    },
    'routing-forms': {
      slug: 'routing-forms',
      dirName: 'routing-forms',
      name: 'Routing Forms',
      category: 'automation',
      key: 'secret-key'
    },
    'eventtype': {
      slug: 'eventtype',
      dirName: 'event-type',
      name: 'Event Type',
      category: 'core',
      key: 'secret-key'
    }
  }
}));

vi.mock('@calcom/lib/server/AssetSymlinkManager', () => ({
  AssetSymlinkManager: {
    getInstance: vi.fn(() => ({
      getRouteAssets: vi.fn(() => []),
      createSymlinks: vi.fn(() => Promise.resolve(new Map()))
    }))
  }
}));

describe('optimizedAppRegistry', () => {
  beforeEach(() => {
    clearAppRegistryCaches();
    vi.clearAllMocks();
  });

  describe('getAppWithMetadataOptimized', () => {
    it('should get app by dirName and cache it', async () => {
      const app = await getAppWithMetadataOptimized({ dirName: 'google-calendar' });
      
      expect(app).toBeDefined();
      expect(app?.slug).toBe('google-calendar');
      expect(app?.name).toBe('Google Calendar');
      expect(app).not.toHaveProperty('key'); // Should remove sensitive data

      // Second call should use cache
      const app2 = await getAppWithMetadataOptimized({ dirName: 'google-calendar' });
      expect(app2).toBe(app);
    });

    it('should get app by slug and cache it', async () => {
      const app = await getAppWithMetadataOptimized({ slug: 'zoom' });
      
      expect(app).toBeDefined();
      expect(app?.slug).toBe('zoom');
      expect(app?.dirName).toBe('zoom-video');

      // Check cache metrics
      const metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBe(1);
    });

    it('should return null for non-existent app', async () => {
      const app = await getAppWithMetadataOptimized({ slug: 'non-existent' });
      expect(app).toBeNull();

      // Should still cache the null result
      const metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBe(1);
    });
  });

  describe('getAppsForRoute', () => {
    it('should return core apps for root route', () => {
      const apps = getAppsForRoute('/');
      
      expect(apps).toContain('routing-forms');
      expect(apps).toContain('eventtype');
      expect(apps).toContain('embed');
      expect(apps).toContain('installed-apps');
      expect(apps).toContain('bookings');
    });

    it('should include event type apps for event routes', () => {
      const apps = getAppsForRoute('/event-types/123');
      
      expect(apps).toContain('eventtype');
      expect(apps).toContain('google-calendar');
      expect(apps).toContain('google-meet');
      expect(apps).toContain('zoom');
    });

    it('should extract app from dynamic routes', () => {
      const apps = getAppsForRoute('/apps/google-calendar/setup');
      
      expect(apps).toContain('google-calendar');
      expect(apps).toContain('installed-apps'); // Should still include core apps
    });

    it('should include conferencing apps for settings route', () => {
      const apps = getAppsForRoute('/settings/my-account/conferencing');
      
      expect(apps).toContain('google-meet');
      expect(apps).toContain('zoom');
      expect(apps).toContain('daily-video');
    });
  });

  describe('getOptimizedAppRegistry', () => {
    it('should load only necessary apps for route', async () => {
      const apps = await getOptimizedAppRegistry({ route: '/' });
      
      // Should have core apps
      const slugs = apps.map(app => app.slug);
      expect(slugs).toContain('routing-forms');
      expect(slugs).toContain('eventtype');
      
      // Should not have video apps
      expect(slugs).not.toContain('zoom');
    });

    it('should cache registry results', async () => {
      const apps1 = await getOptimizedAppRegistry({ route: '/event-types' });
      const apps2 = await getOptimizedAppRegistry({ route: '/event-types' });
      
      expect(apps2).toBe(apps1); // Should be same reference from cache
      
      const metrics = getAppRegistryMetrics();
      expect(metrics.registryCache.size).toBe(1);
    });

    it('should force refresh when requested', async () => {
      const apps1 = await getOptimizedAppRegistry({ route: '/apps' });
      const apps2 = await getOptimizedAppRegistry({ route: '/apps', forceRefresh: true });
      
      expect(apps2).not.toBe(apps1); // Should be new array
      expect(apps2).toEqual(apps1); // But same content
    });

    it('should preload assets when requested', async () => {
      const { AssetSymlinkManager } = await import('@calcom/lib/server/AssetSymlinkManager');
      const mockInstance = AssetSymlinkManager.getInstance();
      
      await getOptimizedAppRegistry({ 
        route: '/event-types',
        preloadAssets: true 
      });
      
      expect(mockInstance.getRouteAssets).toHaveBeenCalled();
      expect(mockInstance.createSymlinks).toHaveBeenCalled();
    });
  });

  describe('lazyLoadApp', () => {
    it('should load app on demand', async () => {
      const app = await lazyLoadApp('google-calendar');
      
      expect(app).toBeDefined();
      expect(app?.slug).toBe('google-calendar');
    });

    it('should create symlinks for loaded app', async () => {
      const { AssetSymlinkManager } = await import('@calcom/lib/server/AssetSymlinkManager');
      const mockInstance = AssetSymlinkManager.getInstance();
      
      await lazyLoadApp('zoom');
      
      expect(mockInstance.createSymlinks).toHaveBeenCalled();
    });

    it('should return null for non-existent app', async () => {
      const app = await lazyLoadApp('non-existent');
      expect(app).toBeNull();
    });
  });

  describe('preloadApps', () => {
    it('should preload multiple apps', async () => {
      await preloadApps(['google-calendar', 'zoom']);
      
      const metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle non-existent apps gracefully', async () => {
      await expect(preloadApps(['non-existent', 'zoom'])).resolves.not.toThrow();
      
      const metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBeGreaterThanOrEqual(2); // null result also cached
    });
  });

  describe('cache management', () => {
    it('should clear all caches', async () => {
      // Load some data
      await getOptimizedAppRegistry({ route: '/' });
      await lazyLoadApp('zoom');
      
      let metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBeGreaterThan(0);
      expect(metrics.registryCache.size).toBeGreaterThan(0);
      
      // Clear caches
      clearAppRegistryCaches();
      
      metrics = getAppRegistryMetrics();
      expect(metrics.metadataCache.size).toBe(0);
      expect(metrics.registryCache.size).toBe(0);
    });

    it('should provide cache metrics', async () => {
      await getOptimizedAppRegistry({ route: '/' });
      
      const metrics = getAppRegistryMetrics();
      expect(metrics).toHaveProperty('metadataCache');
      expect(metrics).toHaveProperty('registryCache');
      expect(metrics.metadataCache).toHaveProperty('size');
      expect(metrics.metadataCache).toHaveProperty('calculatedSize');
    });
  });
});