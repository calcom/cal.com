// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { getAppMetadata } from "@calcom/app-store/appStoreMetaData";
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

// Cache for loaded apps
let ALL_APPS_CACHE: AppMeta[] | null = null;
let ALL_APPS_MAP_CACHE: Record<string, AppMeta> | null = null;

// Function to load all apps metadata
async function loadAllApps() {
  if (ALL_APPS_CACHE && ALL_APPS_MAP_CACHE) {
    return { apps: ALL_APPS_CACHE, appsMap: ALL_APPS_MAP_CACHE };
  }

  // For now, return empty arrays since we can't synchronously load all apps
  // This needs to be changed to load apps from database or a static list
  ALL_APPS_CACHE = [];
  ALL_APPS_MAP_CACHE = {};
  return { apps: ALL_APPS_CACHE, appsMap: ALL_APPS_MAP_CACHE };
}

export type CredentialDataWithTeamName = CredentialForCalendarService & {
  team?: {
    name: string;
  } | null;
};

// For backward compatibility, provide synchronous access
// But this will be empty until we implement proper loading
export const ALL_APPS: AppMeta[] = [];
const ALL_APPS_MAP: Record<string, AppMeta> = {};

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
function getApps(credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) {
  const apps = ALL_APPS.reduce((reducedArray, appMeta) => {
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
          name: "Default",
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

export function getLocalAppMetadata() {
  return ALL_APPS;
}

export function hasIntegrationInstalled(type: App["type"]): boolean {
  return ALL_APPS.some((app) => app.type === type && !!app.installed);
}

export function getAppName(name: string): string | null {
  return ALL_APPS_MAP[name as keyof typeof ALL_APPS_MAP]?.name ?? null;
}

export function getAppType(name: string): string {
  const type = ALL_APPS_MAP[name as keyof typeof ALL_APPS_MAP].type;

  if (type.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export function getAppFromSlug(slug: string | undefined): AppMeta | undefined {
  // For now, return undefined since we don't have preloaded data
  // This needs to be implemented properly
  return undefined;
}

export function getAppFromLocationValue(type: string): AppMeta | undefined {
  return ALL_APPS.find((app) => app?.appData?.location?.type === type);
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
