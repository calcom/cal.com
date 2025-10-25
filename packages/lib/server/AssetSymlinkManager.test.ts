import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { AssetSymlinkManager } from './AssetSymlinkManager';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      unlink: vi.fn(),
      symlink: vi.fn(),
      lstat: vi.fn(),
      readlink: vi.fn(),
      readdir: vi.fn(),
      copyFile: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    }
  }
}));

describe('AssetSymlinkManager', () => {
  let manager: AssetSymlinkManager;
  const mockFsPromises = fs.promises as ReturnType<typeof vi.mocked>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset singleton instance
    // Reset singleton instance
    const manager = AssetSymlinkManager as unknown as { instance?: AssetSymlinkManager };
    manager.instance = undefined;
    
    // Mock cache file operations
    mockFsPromises.readFile.mockRejectedValue(new Error('No cache'));
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    
    manager = AssetSymlinkManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AssetSymlinkManager.getInstance();
      const instance2 = AssetSymlinkManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createSymlinks', () => {
    it('should create symlinks successfully', async () => {
      mockFsPromises.lstat.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockRejectedValue(new Error('Not found'));
      mockFsPromises.symlink.mockResolvedValue(undefined);

      const configs = [
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
          fallbackToCopy: true
        }
      ];

      const results = await manager.createSymlinks(configs);

      expect(results.size).toBe(1);
      expect(results.get('/target/app1')).toMatchObject({
        success: true,
        method: 'symlink'
      });
      expect(mockFsPromises.symlink).toHaveBeenCalledWith('/source/app1', '/target/app1', 'dir');
    });

    it('should skip existing valid symlinks', async () => {
      mockFsPromises.lstat.mockResolvedValue({ isSymbolicLink: () => true });
      mockFsPromises.readlink.mockResolvedValue('/source/app1');

      const configs = [
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
        }
      ];

      const results = await manager.createSymlinks(configs);

      expect(results.get('/target/app1')).toMatchObject({
        success: true,
        method: 'skipped'
      });
      expect(mockFsPromises.symlink).not.toHaveBeenCalled();
    });

    it('should fallback to copy when symlink fails', async () => {
      mockFsPromises.lstat.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockRejectedValue(new Error('Not found'));
      mockFsPromises.symlink.mockRejectedValue(new Error('Permission denied'));
      mockFsPromises.readdir.mockResolvedValue([
        { name: 'file1.js', isDirectory: () => false },
        { name: 'subdir', isDirectory: () => true }
      ]);

      const configs = [
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
          fallbackToCopy: true
        }
      ];

      const results = await manager.createSymlinks(configs);

      expect(results.get('/target/app1')).toMatchObject({
        success: true,
        method: 'copy'
      });
      expect(mockFsPromises.copyFile).toHaveBeenCalled();
    });

    it('should fail without fallback when symlink fails', async () => {
      mockFsPromises.lstat.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockRejectedValue(new Error('Not found'));
      mockFsPromises.symlink.mockRejectedValue(new Error('Permission denied'));

      const configs = [
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
          fallbackToCopy: false
        }
      ];

      const results = await manager.createSymlinks(configs);

      expect(results.get('/target/app1')).toMatchObject({
        success: false,
        method: 'symlink',
        error: 'Permission denied'
      });
    });

    it('should track timing information', async () => {
      mockFsPromises.lstat.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockRejectedValue(new Error('Not found'));
      mockFsPromises.symlink.mockResolvedValue(undefined);

      const configs = [
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
        }
      ];

      const results = await manager.createSymlinks(configs);
      const result = results.get('/target/app1');

      expect(result?.timeTaken).toBeDefined();
      expect(typeof result?.timeTaken).toBe('number');
      expect(result?.timeTaken).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupSymlinks', () => {
    it('should remove symlinks', async () => {
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await manager.cleanupSymlinks(['/target/app1', '/target/app2']);

      expect(mockFsPromises.unlink).toHaveBeenCalledTimes(2);
      expect(mockFsPromises.unlink).toHaveBeenCalledWith('/target/app1');
      expect(mockFsPromises.unlink).toHaveBeenCalledWith('/target/app2');
    });

    it('should ignore errors when symlinks dont exist', async () => {
      mockFsPromises.unlink.mockRejectedValue(new Error('File not found'));

      await expect(manager.cleanupSymlinks(['/target/app1'])).resolves.not.toThrow();
    });
  });

  describe('getRouteAssets', () => {
    const mockAppManifest = {
      'google-calendar': { dirName: 'google-calendar' },
      'google-meet': { dirName: 'google-meet' },
      'zoom': { dirName: 'zoom-video' },
      'routing-forms': { dirName: 'routing-forms' },
      'eventtype': { dirName: 'event-type' },
    };

    it('should return core apps for any route', () => {
      const configs = manager.getRouteAssets('/', mockAppManifest);
      
      const slugs = configs.map(c => c.targetPath.split('/').pop());
      expect(slugs).toContain('routing-forms');
      expect(slugs).toContain('eventtype');
    });

    it('should extract app-specific routes', () => {
      const configs = manager.getRouteAssets('/apps/google-calendar/setup', mockAppManifest);
      
      const hasGoogleCalendar = configs.some(c => 
        c.targetPath.includes('google-calendar')
      );
      expect(hasGoogleCalendar).toBe(true);
    });

    it('should add event type apps for event routes', () => {
      const configs = manager.getRouteAssets('/event-types/123', mockAppManifest);
      
      const slugs = configs.map(c => c.targetPath.split('/').pop());
      expect(slugs).toContain('google-calendar');
      expect(slugs).toContain('google-meet');
      expect(slugs).toContain('zoom');
    });

    it('should filter out invalid apps', () => {
      const configs = manager.getRouteAssets('/apps/non-existent-app', mockAppManifest);
      
      const hasNonExistent = configs.some(c => 
        c.targetPath.includes('non-existent-app')
      );
      expect(hasNonExistent).toBe(false);
    });

    it('should include both static and locale paths', () => {
      const configs = manager.getRouteAssets('/apps/google-calendar', mockAppManifest);
      
      const googleCalendarConfigs = configs.filter(c => 
        c.sourcePath.includes('google-calendar')
      );
      
      const hasStatic = googleCalendarConfigs.some(c => c.targetPath.includes('app-assets'));
      const hasLocales = googleCalendarConfigs.some(c => c.targetPath.includes('locales'));
      
      expect(hasStatic).toBe(true);
      expect(hasLocales).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should load existing cache on initialization', async () => {
      const mockCache = { '/target/app1': '/source/app1' };
      mockFsPromises.readFile.mockResolvedValueOnce(JSON.stringify(mockCache));
      
      // Create new instance to trigger cache load
      // Reset singleton instance
    const manager = AssetSymlinkManager as unknown as { instance?: AssetSymlinkManager };
    manager.instance = undefined;
      const newManager = AssetSymlinkManager.getInstance();

      // Give it time to load cache
      await new Promise(resolve => setTimeout(resolve, 10));

      const metrics = newManager.getMetrics();
      expect(metrics.totalSymlinks).toBeGreaterThan(0);
    });

    it('should save cache after creating symlinks', async () => {
      mockFsPromises.lstat.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockRejectedValue(new Error('Not found'));
      mockFsPromises.symlink.mockResolvedValue(undefined);

      await manager.createSymlinks([
        {
          sourcePath: '/source/app1',
          targetPath: '/target/app1',
        }
      ]);

      expect(mockFsPromises.writeFile).toHaveBeenCalled();
      const cacheData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1]);
      expect(cacheData['/target/app1']).toBe('/source/app1');
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = manager.getMetrics();
      
      expect(metrics).toHaveProperty('totalSymlinks');
      expect(metrics).toHaveProperty('cacheSize');
      expect(typeof metrics.totalSymlinks).toBe('number');
      expect(typeof metrics.cacheSize).toBe('number');
    });
  });
});