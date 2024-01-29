import type { AppCategories } from "@prisma/client";

// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { EventLocationType } from "@calcom/app-store/locations";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { App, AppMeta } from "@calcom/types/App";
import type { CredentialPayload } from "@calcom/types/Credential";

export * from "./_utils/getEventTypeAppData";

type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

const ALL_APPS_MAP = Object.keys(appStoreMetadata).reduce((store, key) => {
  const metadata = appStoreMetadata[key as keyof typeof appStoreMetadata] as AppMeta;

  store[key] = metadata;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  delete store[key]["/*"];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  delete store[key]["__createdUsingCli"];
  return store;
}, {} as Record<string, AppMeta>);

export type CredentialDataWithTeamName = CredentialPayload & {
  team?: {
    name: string;
  } | null;
};

export const ALL_APPS = Object.values(ALL_APPS_MAP);

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
function getApps(credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) {
  const apps = ALL_APPS.reduce((reducedArray, appMeta) => {
    const appCredentials = credentials.filter((credential) => credential.type === appMeta.type);

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
  return ALL_APPS.find((app) => app.slug === slug);
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

export const defaultVideoAppCategories: AppCategories[] = [
  "conferencing",
  "messaging",
  // Legacy name for conferencing
  "video",
];

export default getApps;
