/**
 * Isolated App Loader
 *
 * This module provides runtime dynamic imports for apps, preventing static analysis
 * from detecting app dependencies during build time. This prevents Turbopack/Webpack
 * from compiling all app chunks when any app-related code is imported.
 *
 * Key techniques:
 * - Runtime string concatenation for import paths
 * - Separated concerns (metadata vs components vs API handlers)
 * - Error boundaries for graceful failures
 */
import type { AppDeclarativeHandler } from "@calcom/types/AppHandler";

// Types for the isolated loader system
interface AppConfig {
  name: string;
  slug: string;
  type: string;
  categories: string[];
  dependencies?: string[];
  [key: string]: unknown;
}

interface AppComponents {
  default?: React.ComponentType<Record<string, unknown>>;
  [key: string]: React.ComponentType<Record<string, unknown>> | unknown;
}

interface AppApiHandlers {
  [endpoint: string]: AppDeclarativeHandler | ((...args: unknown[]) => unknown);
}

interface LoadAppResult {
  slug: string;
  config: AppConfig;
  components: AppComponents;
  apiHandlers?: AppApiHandlers;
}

/**
 * Load app metadata/config without triggering component compilation
 * Uses runtime string construction to prevent static analysis
 */
export async function loadAppMetadata(appSlug: string): Promise<AppConfig> {
  try {
    // Runtime string construction prevents static analysis
    const configPath = `@calcom/app-store/${appSlug}/config.json`;
    const config = await import(configPath);
    return config.default || config;
  } catch (error) {
    throw new Error(`Failed to load app metadata for ${appSlug}: ${error}`);
  }
}

/**
 * Load app API handlers for integration endpoints
 * Only compiles specific app's API code when needed
 */
export async function loadAppApiHandlers(appSlug: string): Promise<AppApiHandlers> {
  try {
    // Runtime string construction prevents static analysis
    const handlersPath = `@calcom/app-store/${appSlug}/api`;
    const handlers = await import(handlersPath);
    return handlers.default || handlers;
  } catch (error) {
    throw new Error(`Failed to load app API handlers for ${appSlug}: ${error}`);
  }
}

/**
 * Load app React components on-demand
 * Only compiles specific app's components when needed
 */
export async function loadAppComponents(appSlug: string): Promise<AppComponents> {
  try {
    // Runtime string construction prevents static analysis
    const componentsPath = `@calcom/app-store/${appSlug}/components`;
    const components = await import(componentsPath);
    return components;
  } catch (error) {
    throw new Error(`Failed to load app components for ${appSlug}: ${error}`);
  }
}

/**
 * Load complete app (metadata + components) with error handling
 */
export async function loadApp(appSlug: string): Promise<{
  config: AppConfig;
  components: AppComponents;
}> {
  try {
    const [config, components] = await Promise.all([loadAppMetadata(appSlug), loadAppComponents(appSlug)]);

    return { config, components };
  } catch (error) {
    throw new Error(`Failed to load app ${appSlug}: ${error}`);
  }
}

/**
 * Batch load multiple apps with error handling
 */
export async function loadAppsBatch(appSlugs: string[]): Promise<
  Array<{
    slug: string;
    config: AppConfig;
    components: AppComponents;
  }>
> {
  const results = await Promise.allSettled(
    appSlugs.map(async (slug) => {
      const app = await loadApp(slug);
      return { slug, ...app };
    })
  );

  return results
    .filter((result): result is PromiseFulfilledResult<LoadAppResult> => result.status === "fulfilled")
    .map((result) => result.value);
}

/**
 * Load app family (main app + dependencies) with dependency resolution
 */
export async function loadAppFamily(appSlug: string): Promise<{
  main: { config: AppConfig; components: AppComponents };
  dependencies: Array<{ slug: string; config: AppConfig; components: AppComponents }>;
}> {
  try {
    const mainApp = await loadApp(appSlug);
    const dependencies = mainApp.config.dependencies || [];

    const dependencyApps = dependencies.length > 0 ? await loadAppsBatch(dependencies as string[]) : [];

    return {
      main: mainApp,
      dependencies: dependencyApps,
    };
  } catch (error) {
    throw new Error(`Failed to load app family for ${appSlug}: ${error}`);
  }
}

/**
 * Check if app is available without loading it
 */
export async function checkAppAvailability(appSlug: string): Promise<boolean> {
  try {
    await loadAppMetadata(appSlug);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load app with fallback to default configuration
 */
export async function loadAppWithFallback(
  appSlug: string,
  fallbackConfig?: Partial<AppConfig>
): Promise<{
  config: AppConfig;
  components: AppComponents | null;
}> {
  try {
    return await loadApp(appSlug);
  } catch (error) {
    if (fallbackConfig) {
      return {
        config: {
          name: fallbackConfig.name || appSlug,
          slug: appSlug,
          type: fallbackConfig.type || "other",
          categories: fallbackConfig.categories || ["other"],
          ...fallbackConfig,
        } as AppConfig,
        components: null,
      };
    }
    throw error;
  }
}
