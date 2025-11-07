// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { EventLocationType } from "@calcom/app-store/locations";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { AppCategories } from "@calcom/prisma/client";
import type { App, AppMeta } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

export * from "./_utils/getEventTypeAppData";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

// Cache for loaded app metadata
const appMetadataCache = new Map<string, AppMeta>();

// Lazy loading cache for ALL_APPS_MAP
let ALL_APPS_MAP: Record<string, AppMeta> | null = null;

async function getAllAppsMap(): Promise<Record<string, AppMeta>> {
  if (ALL_APPS_MAP) return ALL_APPS_MAP;

  ALL_APPS_MAP = {};
  const appKeys = Object.keys(appStoreMetadata);

  await Promise.all(
    appKeys.map(async (key) => {
      const metadataLoader = appStoreMetadata[key as keyof typeof appStoreMetadata];
      if (metadataLoader && typeof metadataLoader === 'function') {
        const metadata = await metadataLoader();
        if (metadata) {
          ALL_APPS_MAP![key] = metadata;

          // Clean up metadata
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          delete ALL_APPS_MAP![key]["/*"];
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          delete ALL_APPS_MAP![key]["__createdUsingCli"];
        }
      }
    })
  );

  return ALL_APPS_MAP;
}

export type CredentialDataWithTeamName = CredentialForCalendarService & {
  team?: {
    name: string;
  } | null;
};

// Export ALL_APPS as a getter that loads lazily
export const getAllApps = async (): Promise<AppMeta[]> => {
  const appsMap = await getAllAppsMap();
  return Object.values(appsMap);
};

// For backward compatibility, provide a synchronous version that throws an error
// This forces consumers to migrate to the async version
export const ALL_APPS = (() => {
  throw new Error("ALL_APPS is now async. Use getAllApps() instead.");
})();

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
async function getApps(credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) {
  const appsMap = await getAllAppsMap();
  const apps = Object.values(appsMap).reduce((reducedArray, appMeta) => {
    const appCredentials = credentials.filter((credential) => credential.appId === appMeta.slug);

    if (filterOnCredentials && !appCredentials.length && !appMeta.isGlobal) return reducedArray;

    let locationOption: LocationOption | null = null;

    /** If the app is a globally installed one, let's inject it's key */
    if (appMeta.isGlobal) {
      const credential = {
        id: 0,
        type: appMeta.type,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        key: appMeta.key!,
        userId: 0,
        user: { email: "" },
        teamId: null,
        appId: appMeta.slug,
        invalid: false,
        delegatedTo: null,
        delegatedToId: null,
        delegationCredentialId: null,
        team: {
          name: "Global",
        },
      };
      logger.debug(
        `${appMeta.type} is a global app, injecting credential`,
        safeStringify(getPiiFreeCredential(credential))
      );
      appCredentials.push(credential);
    }

    /** Check if app has location option AND add it if user has credentials for it */
    if (appCredentials.length > 0 && appMeta?.appData?.location) {
      locationOption = {
        value: appMeta.appData.location.type,
        label: appMeta.appData.location.label || "No label set",
        disabled: false,
      };
    }

    const credential: (typeof appCredentials)[number] | null = appCredentials[0] || null;

    reducedArray.push({
      ...appMeta,
      /**
       * @deprecated use `credentials`
       */
      credential,
      credentials: appCredentials,
      /** Option to display in `location` field while editing event types */
      locationOption,
    });

    return reducedArray;
  }, [] as (App & { credential: CredentialDataWithTeamName; credentials: CredentialDataWithTeamName[]; locationOption: LocationOption | null })[]);

  return apps;
}

export async function getLocalAppMetadata() {
  return await getAllApps();
}

export async function hasIntegrationInstalled(type: App["type"]): Promise<boolean> {
  const apps = await getAllApps();
  return apps.some((app) => app.type === type && !!app.installed);
}

export async function getAppName(name: string): Promise<string | null> {
  const appsMap = await getAllAppsMap();
  return appsMap[name]?.name ?? null;
}

export async function getAppType(name: string): Promise<string> {
  const appsMap = await getAllAppsMap();
  const type = appsMap[name]?.type;

  if (!type) return "Unknown";

  if (type.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export async function getAppFromSlug(slug: string | undefined): Promise<AppMeta | undefined> {
  const apps = await getAllApps();
  return apps.find((app) => app.slug === slug);
}

export async function getAppFromLocationValue(type: string): Promise<AppMeta | undefined> {
  const apps = await getAllApps();
  return apps.find((app) => app?.appData?.location?.type === type);
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
