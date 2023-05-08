import { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import type { EventLocationType } from "@calcom/app-store/locations";
import { defaultLocations } from "@calcom/app-store/locations";
import type { App, AppMeta } from "@calcom/types/App";

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

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true, key: true, userId: true, appId: true, invalid: true },
});

export type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export const InstalledAppVariants = [
  "conferencing",
  "calendar",
  "payment",
  "analytics",
  "automation",
  "other",
  "web3",
] as const;

export const ALL_APPS = Object.values(ALL_APPS_MAP);

export function getLocationGroupedOptions(integrations: ReturnType<typeof getApps>, t: TFunction) {
  const apps: Record<
    string,
    { label: string; value: string; disabled?: boolean; icon?: string; slug?: string }[]
  > = {};
  integrations.forEach((app) => {
    if (app.locationOption) {
      // All apps that are labeled as a locationOption are video apps. Extract the secondary category if available
      let category =
        app.categories.length >= 2 ? app.categories.find((category) => category !== "video") : app.category;
      if (!category) category = "video";
      const option = { ...app.locationOption, icon: app.logo, slug: app.slug };
      if (apps[category]) {
        apps[category] = [...apps[category], option];
      } else {
        apps[category] = [option];
      }
    }
  });

  defaultLocations.forEach((l) => {
    const category = l.category;
    if (apps[category]) {
      apps[category] = [
        ...apps[category],
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    } else {
      apps[category] = [
        {
          label: l.label,
          value: l.type,
          icon: l.iconUrl,
        },
      ];
    }
  });
  const locations = [];

  // Translating labels and pushing into array
  for (const category in apps) {
    const tmp = {
      label: t(category),
      options: apps[category].map((l) => ({
        ...l,
        label: t(l.label),
      })),
    };

    locations.push(tmp);
  }

  return locations;
}

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
function getApps(userCredentials: CredentialData[]) {
  const apps = ALL_APPS.map((appMeta) => {
    const credentials = userCredentials.filter((credential) => credential.type === appMeta.type);
    let locationOption: LocationOption | null = null;

    /** If the app is a globally installed one, let's inject it's key */
    if (appMeta.isGlobal) {
      credentials.push({
        id: +new Date().getTime(),
        type: appMeta.type,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        key: appMeta.key!,
        userId: +new Date().getTime(),
        appId: appMeta.slug,
        invalid: false,
      });
    }

    /** Check if app has location option AND add it if user has credentials for it */
    if (credentials.length > 0 && appMeta?.appData?.location) {
      locationOption = {
        value: appMeta.appData.location.type,
        label: appMeta.appData.location.label || "No label set",
        disabled: false,
      };
    }

    const credential: (typeof credentials)[number] | null = credentials[0] || null;
    return {
      ...appMeta,
      /**
       * @deprecated use `credentials`
       */
      credential,
      credentials,
      /** Option to display in `location` field while editing event types */
      locationOption,
    };
  });

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

export default getApps;
