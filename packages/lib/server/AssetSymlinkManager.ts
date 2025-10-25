import fs from 'fs';
import path from 'path';

export interface SymlinkConfig {
  sourcePath: string;
  targetPath: string;
  fallbackToCopy?: boolean;
}

export interface SymlinkResult {
  success: boolean;
  method: 'symlink' | 'copy' | 'skipped';
  error?: string;
  timeTaken?: number;
}

export class AssetSymlinkManager {
  private static instance: AssetSymlinkManager;
  private symlinkCache: Map<string, string> = new Map();
  private readonly cacheFile: string;

  private constructor() {
    this.cacheFile = path.join(process.cwd(), '.next', 'symlink-cache.json');
    this.loadCache();
  }

  public static getInstance(): AssetSymlinkManager {
    if (!AssetSymlinkManager.instance) {
      AssetSymlinkManager.instance = new AssetSymlinkManager();
    }
    return AssetSymlinkManager.instance;
  }

  /**
   * Create symlinks for app assets with automatic fallback to copying
   */
  public async createSymlinks(configs: SymlinkConfig[]): Promise<Map<string, SymlinkResult>> {
    const results = new Map<string, SymlinkResult>();

    for (const config of configs) {
      const startTime = Date.now();
      const result = await this.createSymlink(config);
      result.timeTaken = Date.now() - startTime;
      results.set(config.targetPath, result);
    }

    await this.saveCache();
    return results;
  }

  /**
   * Create a single symlink with caching and fallback logic
   */
  private async createSymlink(config: SymlinkConfig): Promise<SymlinkResult> {
    const { sourcePath, targetPath, fallbackToCopy = true } = config;

    // Check if symlink already exists and is valid
    if (await this.isValidSymlink(targetPath, sourcePath)) {
      return { success: true, method: 'skipped' };
    }

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Remove existing file/symlink if present
    try {
      await fs.promises.unlink(targetPath);
    } catch {
      // File doesn't exist, which is fine
    }

    // Try to create symlink
    try {
      await fs.promises.symlink(sourcePath, targetPath, 'dir');
      this.symlinkCache.set(targetPath, sourcePath);
      return { success: true, method: 'symlink' };
    } catch (symlinkError) {
      if (!fallbackToCopy) {
        return { 
          success: false, 
          method: 'symlink', 
          error: symlinkError instanceof Error ? symlinkError.message : 'Unknown error' 
        };
      }

      // Fallback to copying
      try {
        await this.copyDirectory(sourcePath, targetPath);
        return { success: true, method: 'copy' };
      } catch (copyError) {
        return { 
          success: false, 
          method: 'copy', 
          error: copyError instanceof Error ? copyError.message : 'Unknown error' 
        };
      }
    }
  }

  /**
   * Check if a symlink exists and points to the correct source
   */
  private async isValidSymlink(targetPath: string, expectedSource: string): Promise<boolean> {
    try {
      const stats = await fs.promises.lstat(targetPath);
      if (!stats.isSymbolicLink()) return false;

      const actualSource = await fs.promises.readlink(targetPath);
      return path.resolve(actualSource) === path.resolve(expectedSource);
    } catch {
      return false;
    }
  }

  /**
   * Copy directory recursively as fallback
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    await fs.promises.mkdir(target, { recursive: true });

    const entries = await fs.promises.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await fs.promises.copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * Clean up symlinks for specific apps
   */
  public async cleanupSymlinks(targetPaths: string[]): Promise<void> {
    for (const targetPath of targetPaths) {
      try {
        await fs.promises.unlink(targetPath);
        this.symlinkCache.delete(targetPath);
      } catch {
        // Ignore errors if symlink doesn't exist
      }
    }
    await this.saveCache();
  }

  /**
   * Get app assets that need symlinking based on route
   */
  public getRouteAssets(route: string, appManifest: Record<string, { dirName?: string }>): SymlinkConfig[] {
    const configs: SymlinkConfig[] = [];
    
    // Extract app slugs from the route
    const appSlugs = this.extractAppSlugsFromRoute(route, appManifest);
    
    for (const slug of appSlugs) {
      const appDir = appManifest[slug]?.dirName;
      if (!appDir) continue;

      // Add static assets
      configs.push({
        sourcePath: path.join(process.cwd(), 'apps', appDir, 'static'),
        targetPath: path.join(process.cwd(), 'public', 'app-assets', slug),
        fallbackToCopy: true
      });

      // Add locales if they exist
      configs.push({
        sourcePath: path.join(process.cwd(), 'apps', appDir, 'locales'),
        targetPath: path.join(process.cwd(), 'public', 'locales', slug),
        fallbackToCopy: true
      });
    }

    return configs;
  }

  /**
   * Extract app slugs that might be needed for a given route
   */
  private extractAppSlugsFromRoute(route: string, appManifest: Record<string, { dirName?: string }>): string[] {
    const slugs: string[] = [];
    
    // Core apps always needed
    const coreApps = ['routing-forms', 'eventtype', 'embed', 'installed-apps', 'bookings'];
    slugs.push(...coreApps);

    // Extract app-specific routes
    if (route.includes('/apps/')) {
      const appMatch = route.match(/\/apps\/([^/]+)/);
      if (appMatch && appMatch[1]) {
        slugs.push(appMatch[1]);
      }
    }

    // Extract event type apps
    if (route.includes('/event-types')) {
      // Add common event type apps
      slugs.push('google-calendar', 'google-meet', 'zoom', 'daily-video');
    }

    // Filter to only valid apps
    return slugs.filter(slug => appManifest[slug]);
  }

  /**
   * Load symlink cache from disk
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.cacheFile, 'utf-8');
      const cache = JSON.parse(data);
      this.symlinkCache = new Map(Object.entries(cache));
    } catch {
      // Cache doesn't exist or is invalid, start fresh
      this.symlinkCache = new Map();
    }
  }

  /**
   * Save symlink cache to disk
   */
  private async saveCache(): Promise<void> {
    try {
      const cache = Object.fromEntries(this.symlinkCache);
      await fs.promises.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Failed to save symlink cache:', error);
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    totalSymlinks: number;
    cacheSize: number;
  } {
    return {
      totalSymlinks: this.symlinkCache.size,
      cacheSize: JSON.stringify(Array.from(this.symlinkCache)).length
    };
  }
}