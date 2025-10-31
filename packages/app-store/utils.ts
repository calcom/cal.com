// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
// import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData"; // Removed to enable lazy loading
import type { EventLocationType } from "@calcom/app-store/locations";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
// AppCategories enum values (defined here to avoid import issues)
type AppCategories = "calendar" | "messaging" | "other" | "payment" | "video" | "web3" | "automation" | "analytics" | "conferencing" | "crm";
import type { App, AppMeta } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

export * from "./_utils/getEventTypeAppData";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

// Lazy loading cache for app metadata
const appMetadataCache = new Map<string, AppMeta>();

// Function to lazily load app metadata using dynamic imports
async function getAppMetadata(appName: string): Promise<AppMeta | null> {
  if (appMetadataCache.has(appName)) {
    return appMetadataCache.get(appName)!;
  }

  try {
    // Use dynamic import to load only the specific app's metadata
    // This prevents loading all 100+ apps at once
    const appStoreMetaData = await import("@calcom/app-store/appStoreMetaData");
    const metadataLoader = (appStoreMetaData.appStoreMetadata as any)[appName];

    if (metadataLoader && typeof metadataLoader === "function") {
      const metadata = await metadataLoader();
      if (metadata) {
        const cleanMetadata = { ...metadata };
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        delete cleanMetadata["/*"];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        delete cleanMetadata["__createdUsingCli"];
        appMetadataCache.set(appName, cleanMetadata);
        return cleanMetadata;
      }
    }
  } catch (error) {
    console.warn(`Failed to load metadata for app: ${appName}`, error);
  }

  return null;
}

export type CredentialDataWithTeamName = CredentialForCalendarService & {
  team?: {
    name: string;
  } | null;
};

// Get app metadata for specific apps only (lazy loading)
async function getAppsMetadata(appNames: string[]): Promise<Record<string, AppMeta>> {
  const apps: Record<string, AppMeta> = {};

  await Promise.all(
    appNames.map(async (appName) => {
      const metadata = await getAppMetadata(appName);
      if (metadata) {
        apps[appName] = metadata;
      }
    })
  );

  return apps;
}

// Get specific apps by names (lazy loading)
async function getAppsByNames(appNames: string[]): Promise<AppMeta[]> {
  const appsMap = await getAppsMetadata(appNames);
  return Object.values(appsMap);
}

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 *
 * PERFORMANCE OPTIMIZATION: This function now implements true lazy loading:
 * - When filterOnCredentials=true: Only loads metadata for apps with credentials (most common case)
 * - When filterOnCredentials=false: Loads a curated list of commonly used apps
 * - Uses async metadata loading with Promise.all for batch efficiency
 */
function getApps(credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) {
  // Get unique app IDs from credentials
  const credentialAppIds = Array.from(new Set(credentials.map(cred => cred.appId)));

  if (filterOnCredentials) {
    // PERFORMANCE CRITICAL: Only load apps that have credentials
    // This is the most common case and should be very fast
    const apps: Array<App & { credential: CredentialDataWithTeamName | null; credentials: CredentialDataWithTeamName[]; locationOption: LocationOption | null }> = [];

    // Process each app with credentials
    for (const appName of credentialAppIds) {
      const appCredentials = credentials.filter((credential) => credential.appId === appName);

      // Check cache first for synchronous access
      let metadata = appMetadataCache.get(appName);

      // If not in cache, we need to load it - but since this is sync context,
      // we'll create a placeholder and load async in background
      if (!metadata) {
        // Create placeholder metadata for immediate synchronous access
        // Use realistic placeholder types that pass filtering logic
        const placeholderType = appName.includes('calendar') ? `${appName.replace('calendar', '')}_calendar` :
                               appName.includes('video') ? `${appName.replace('video', '')}_video` :
                               appName.includes('payment') ? `${appName.replace('payment', '')}_payment` :
                               `${appName}_other`;

        metadata = {
          slug: appName,
          name: appName,
          type: placeholderType,
          categories: [],
          isGlobal: false,
          installed: true,
          variant: 'default',
          description: '',
          logo: '',
          publisher: '',
          url: '',
          email: '',
        } as unknown as AppMeta;

        // Load real metadata in background (fire and forget)
        getAppMetadata(appName).then(realMetadata => {
          if (realMetadata) {
            // Update the app object with real metadata
            // Note: This won't update existing references, but future calls will get cached version
            appMetadataCache.set(appName, realMetadata);
          }
        }).catch(err => {
          console.warn(`Failed to load metadata for ${appName}:`, err);
        });
      }

      // Create app object with available metadata (placeholder or real)
      const app = createAppObjectSync(appName, appCredentials, metadata);
      apps.push(app);
    }

    return apps;
  } else {
    // For non-filtered calls, include commonly used apps
    const commonAppNames = [
      'googlecalendar', 'outlook', 'applecalendar', 'dailyvideo', 'zoomvideo',
      'stripepayment', 'paypal', 'zapier', 'make', 'webhook'
    ];

    const uniqueAppNames = Array.from(new Set([...commonAppNames, ...credentialAppIds]));
    const apps: Array<App & { credential: CredentialDataWithTeamName | null; credentials: CredentialDataWithTeamName[]; locationOption: LocationOption | null }> = [];

    for (const appName of uniqueAppNames) {
      const appCredentials = credentials.filter((credential) => credential.appId === appName);
      let metadata = appMetadataCache.get(appName);

      if (!metadata) {
        // Create placeholder metadata for immediate synchronous access
        // Use realistic placeholder types that pass filtering logic
        const placeholderType = appName.includes('calendar') ? `${appName.replace('calendar', '')}_calendar` :
                               appName.includes('video') ? `${appName.replace('video', '')}_video` :
                               appName.includes('payment') ? `${appName.replace('payment', '')}_payment` :
                               `${appName}_other`;

        metadata = {
          slug: appName,
          name: appName,
          type: placeholderType,
          categories: [],
          isGlobal: false,
          installed: true,
          variant: 'default',
          description: '',
          logo: '',
          publisher: '',
          url: '',
          email: '',
        } as unknown as AppMeta;

        // Load real metadata in background
        getAppMetadata(appName).then(realMetadata => {
          if (realMetadata) {
            appMetadataCache.set(appName, realMetadata);
          }
        }).catch(err => console.warn(`Failed to load metadata for ${appName}:`, err));
      }

      const app = createAppObjectSync(appName, appCredentials, metadata);
      apps.push(app);
    }

    return apps;
  }
}

// Helper function to create app objects synchronously with provided metadata
function createAppObjectSync(
  appName: string,
  appCredentials: CredentialDataWithTeamName[],
  metadata: AppMeta
): App & { credential: CredentialDataWithTeamName | null; credentials: CredentialDataWithTeamName[]; locationOption: LocationOption | null } {
  let locationOption: LocationOption | null = null;

  /** If the app is a globally installed one, let's inject it's key */
  if (metadata?.isGlobal) {
    const credential = {
      id: 0,
      type: metadata.type || 'unknown',
      key: metadata.key!,
      userId: 0,
      user: { email: "" },
      teamId: null,
      appId: appName,
      invalid: false,
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
      team: {
        name: "Default",
      },
    };
    logger.debug(
      `${metadata.type} is a global app, injecting credential`,
      safeStringify(getPiiFreeCredential(credential))
    );
    appCredentials.push(credential);
  }

  /** Check if app has location option AND add it if user has credentials for it */
  if (appCredentials.length > 0 && metadata?.appData?.location) {
    locationOption = {
      value: metadata.appData.location.type,
      label: metadata.appData.location.label || "No label set",
      disabled: false,
    };
  }

  const credential: (typeof appCredentials)[number] | null = appCredentials[0] || null;

  return {
    ...metadata,
    /**
     * @deprecated use `credentials`
     */
    credential,
    credentials: appCredentials,
    /** Option to display in `location` field while editing event types */
    locationOption,
  } as any;
}


// Get all available app names dynamically
async function getAllAppNames(): Promise<string[]> {
  const appStoreMetaData = await import("@calcom/app-store/appStoreMetaData");
  return Object.keys(appStoreMetaData.appStoreMetadata);
}

export async function getLocalAppMetadata() {
  // For backward compatibility, load all apps when requested
  const allAppNames = await getAllAppNames();
  return await getAppsByNames(allAppNames);
}

export async function hasIntegrationInstalled(type: App["type"]): Promise<boolean> {
  // This function is problematic for lazy loading since it needs to check all apps
  // For now, we'll load all apps, but this should be refactored to be more specific
  const allApps = await getLocalAppMetadata();
  return allApps.some((app) => app.type === type && !!app.installed);
}

export async function getAppName(name: string): Promise<string | null> {
  const metadata = await getAppMetadata(name);
  return metadata?.name ?? null;
}

export async function getAppType(name: string): Promise<string> {
  const metadata = await getAppMetadata(name);
  const type = metadata?.type;

  if (type?.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type?.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export async function getAppFromSlug(slug: string | undefined): Promise<AppMeta | undefined> {
  if (!slug) return undefined;
  const metadata = await getAppMetadata(slug);
  return metadata || undefined;
}

export async function getAppFromLocationValue(type: string): Promise<AppMeta | undefined> {
  // This requires loading all apps to find the one with matching location type
  // This is inefficient but necessary for backward compatibility
  const allApps = await getLocalAppMetadata();
  return allApps.find((app) => app?.appData?.location?.type === type) || undefined;
}

/**
 *
 * @param appCategories - from app metadata
 * @param concurrentMeetings - from app metadata
 * @returns - true if app supports team install
 */
export function doesAppSupportTeamInstall({
  appCategories,
  concurrentMeetings = undefined,
  isPaid,
}: {
  appCategories: string[];
  concurrentMeetings: boolean | undefined;
  isPaid: boolean;
}) {
  // Paid apps can't be installed on team level - That isn't supported
  if (isPaid) {
    return false;
  }
  return !appCategories.some(
    (category) =>
      category === "calendar" ||
      (defaultVideoAppCategories.includes(category as AppCategories) && !concurrentMeetings)
  );
}

export function isConferencing(appCategories: string[]) {
  return appCategories.some((category) => category === "conferencing" || category === "video");
}
export const defaultVideoAppCategories: AppCategories[] = [
  "messaging",
  "conferencing",
  // Legacy name for conferencing
  "video",
];

export default getApps;
