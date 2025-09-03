/**
 * App Loader - Isolated dynamic import system for App Store
 *
 * This loader prevents static analysis from eagerly compiling all app chunks
 * by isolating dynamic imports away from the shared registry system.
 * Only App Store routes should import this file.
 */
import type { AppMeta } from "@calcom/types/App";

// Type-safe app loading result
export interface LoadedApp {
  metadata: AppMeta;
  apiHandlers?: Record<string, unknown>;
  components?: {
    InstallAppButton?: React.ComponentType<unknown>;
    AppSettingsInterface?: React.ComponentType<unknown>;
    EventTypeAppCardInterface?: React.ComponentType<unknown>;
    EventTypeAppSettingsInterface?: React.ComponentType<unknown>;
  };
}

// App loading error types
export class AppLoadError extends Error {
  constructor(
    public appId: string,
    public reason: "not-found" | "invalid" | "load-failed",
    message?: string
  ) {
    super(message || `Failed to load app: ${appId} (${reason})`);
    this.name = "AppLoadError";
  }
}

/**
 * Load app metadata without triggering component compilation
 * Use this for app listing and basic metadata access
 */
export async function loadAppMetadata(appId: string): Promise<AppMeta | null> {
  try {
    // Import only metadata, no components
    const { appStoreMetadata } = await import("./appStoreMetaData");

    // Find app by slug or dirName
    const appEntry = Object.entries(appStoreMetadata).find(([dirName, meta]) => {
      return meta.slug === appId || dirName === appId;
    });

    if (!appEntry) {
      return null;
    }

    const [, metadata] = appEntry;
    // Remove API keys for frontend safety
    const { key: _key, ...safeMetadata } = metadata;
    return safeMetadata;
  } catch (error) {
    console.error(`Failed to load metadata for app: ${appId}`, error);
    return null;
  }
}

/**
 * Load app API handlers on-demand
 * Only call this from API routes that need the handlers
 */
export async function loadAppApiHandlers(appId: string): Promise<Record<string, unknown> | null> {
  try {
    const { apiHandlers } = await import("./apps.server.generated");
    const handler = apiHandlers[appId as keyof typeof apiHandlers];

    if (!handler) {
      throw new AppLoadError(appId, "not-found", `No API handlers found for app: ${appId}`);
    }

    return await handler;
  } catch (error) {
    if (error instanceof AppLoadError) {
      throw error;
    }
    throw new AppLoadError(appId, "load-failed", `Failed to load API handlers: ${error}`);
  }
}

/**
 * Load app browser components on-demand
 * Only call this from client-side App Store pages
 */
export async function loadAppComponents(appId: string): Promise<LoadedApp["components"] | null> {
  try {
    const [
      { InstallAppButtonMap },
      { AppSettingsComponentsMap },
      { EventTypeAddonMap },
      { EventTypeSettingsMap },
    ] = await Promise.all([
      import("./apps.browser.generated").then((m) => ({ InstallAppButtonMap: m.InstallAppButtonMap })),
      import("./apps.browser.generated").then((m) => ({
        AppSettingsComponentsMap: m.AppSettingsComponentsMap,
      })),
      import("./apps.browser.generated").then((m) => ({ EventTypeAddonMap: m.EventTypeAddonMap })),
      import("./apps.browser.generated").then((m) => ({ EventTypeSettingsMap: m.EventTypeSettingsMap })),
    ]);

    const components: LoadedApp["components"] = {};

    // Load components if they exist for this app
    if (InstallAppButtonMap[appId as keyof typeof InstallAppButtonMap]) {
      components.InstallAppButton = InstallAppButtonMap[
        appId as keyof typeof InstallAppButtonMap
      ] as React.ComponentType<unknown>;
    }

    if (AppSettingsComponentsMap[appId as keyof typeof AppSettingsComponentsMap]) {
      components.AppSettingsInterface = AppSettingsComponentsMap[
        appId as keyof typeof AppSettingsComponentsMap
      ] as React.ComponentType<unknown>;
    }

    if (EventTypeAddonMap[appId as keyof typeof EventTypeAddonMap]) {
      components.EventTypeAppCardInterface = EventTypeAddonMap[
        appId as keyof typeof EventTypeAddonMap
      ] as React.ComponentType<unknown>;
    }

    if (EventTypeSettingsMap[appId as keyof typeof EventTypeSettingsMap]) {
      components.EventTypeAppSettingsInterface = EventTypeSettingsMap[
        appId as keyof typeof EventTypeSettingsMap
      ] as React.ComponentType<unknown>;
    }

    return Object.keys(components).length > 0 ? components : null;
  } catch (error) {
    throw new AppLoadError(appId, "load-failed", `Failed to load components: ${error}`);
  }
}

/**
 * Load complete app (metadata + components) for App Store pages
 * This should only be called from App Store routes
 */
export async function loadApp(appId: string): Promise<LoadedApp | null> {
  try {
    const [metadata, components] = await Promise.all([
      loadAppMetadata(appId),
      loadAppComponents(appId).catch(() => null), // Components are optional
    ]);

    if (!metadata) {
      return null;
    }

    return {
      metadata,
      components: components || undefined,
    };
  } catch (error) {
    if (error instanceof AppLoadError) {
      throw error;
    }
    throw new AppLoadError(appId, "load-failed", `Failed to load app: ${error}`);
  }
}

/**
 * Batch load multiple apps efficiently
 * Use this for App Store listing pages
 */
export async function loadAppsBatch(appIds: string[]): Promise<Record<string, LoadedApp | null>> {
  const results = await Promise.allSettled(
    appIds.map(async (appId) => ({ appId, app: await loadApp(appId) }))
  );

  const loadedApps: Record<string, LoadedApp | null> = {};

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      loadedApps[result.value.appId] = result.value.app;
    } else {
      console.error(`Failed to load app in batch:`, result.reason);
      // Extract appId from error if possible, fallback to index
      const appId = result.reason instanceof AppLoadError ? result.reason.appId : "unknown";
      loadedApps[appId] = null;
    }
  });

  return loadedApps;
}

/**
 * Context-based app family loading for grouped apps
 * Use this for apps that share similar patterns (e.g., video conferencing apps)
 */
export async function loadAppFamily(
  family: "video" | "calendar" | "analytics" | "payment" | "crm"
): Promise<LoadedApp[]> {
  // Define app families to enable grouped loading
  const families = {
    video: ["googlevideo", "zoomvideo", "dailyvideo", "jitsivideo", "whereby", "huddle01video"],
    calendar: ["googlecalendar", "office365calendar", "applecalendar", "caldavcalendar"],
    analytics: ["ga4", "gtm", "plausible", "fathom", "matomo", "posthog"],
    payment: ["stripepayment", "paypal", "mock-payment-app"],
    crm: ["hubspot", "salesforce", "closecom", "pipedrive-crm", "zohocrm"],
  };

  const familyAppIds = families[family] || [];
  const loadedApps = await loadAppsBatch(familyAppIds);

  return Object.values(loadedApps).filter((app): app is LoadedApp => app !== null);
}
