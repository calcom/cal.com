import { Prisma } from "@prisma/client";
import { TFunction } from "next-i18next";
import { z } from "zod";

// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { defaultLocations, EventLocationType } from "@calcom/app-store/locations";
import { EventTypeModel } from "@calcom/prisma/zod";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { App, AppMeta } from "@calcom/types/App";

export type EventTypeApps = NonNullable<NonNullable<z.infer<typeof EventTypeMetaDataSchema>>["apps"]>;
export type EventTypeAppsList = keyof EventTypeApps;

const ALL_APPS_MAP = Object.keys(appStoreMetadata).reduce((store, key) => {
  const metadata = appStoreMetadata[key as keyof typeof appStoreMetadata] as AppMeta;
  if (metadata.logo && !metadata.logo.includes("/")) {
    const appDirName = `${metadata.isTemplate ? "templates" : ""}/${metadata.slug}`;
    metadata.logo = `/api/app-store/${appDirName}/${metadata.logo}`;
  }
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

type OptionTypeBase = {
  label: string;
  value: EventLocationType["type"];
  disabled?: boolean;
};

function translateLocations(locations: OptionTypeBase[], t: TFunction) {
  return locations.map((l) => ({
    ...l,
    label: t(l.label),
  }));
}

export function getLocationOptions(integrations: ReturnType<typeof getApps>, t: TFunction) {
  const locations: OptionTypeBase[] = [];
  defaultLocations.forEach((l) => {
    locations.push({
      label: l.label,
      value: l.type,
    });
  });
  integrations.forEach((app) => {
    if (app.locationOption) {
      locations.push(app.locationOption);
    }
  });

  return translateLocations(locations, t);
}

export function getLocationGroupedOptions(integrations: ReturnType<typeof getApps>, t: TFunction) {
  const apps: Record<string, { label: string; value: string; disabled?: boolean; icon?: string }[]> = {};
  integrations.forEach((app) => {
    if (app.locationOption) {
      // All apps that are labeled as a locationOption are video apps. Extract the secondary category if available
      let category =
        app.categories.length >= 2 ? app.categories.find((category) => category !== "video") : app.category;
      if (!category) category = "video";
      const option = { ...app.locationOption, icon: app.imageSrc };
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
    const tmp = { label: category, options: apps[category] };
    if (tmp.label === "in person") {
      tmp.options = tmp.options.map((l) => ({
        ...l,
        label: t(l.label),
      }));
    } else {
      tmp.options.map((l) => ({
        ...l,
        label: t(l.label.toLowerCase().split(" ").join("_")),
      }));
    }

    tmp.label = t(tmp.label);

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
    let locationOption: OptionTypeBase | null = null;

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

    const credential: typeof credentials[number] | null = credentials[0] || null;
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

export const getEventTypeAppData = <T extends EventTypeAppsList>(
  eventType: Pick<z.infer<typeof EventTypeModel>, "price" | "currency" | "metadata">,
  appId: T,
  forcedGet?: boolean
): EventTypeApps[T] => {
  const metadata = eventType.metadata;
  const appMetadata = metadata?.apps && metadata.apps[appId];
  if (appMetadata) {
    const allowDataGet = forcedGet ? true : appMetadata.enabled;
    return allowDataGet ? appMetadata : null;
  }

  // Backward compatibility for existing event types.
  // TODO: After the new AppStore EventType App flow is stable, write a migration to migrate metadata to new format which will let us remove this compatibility code
  // Migration isn't being done right now, to allow a revert if needed
  const legacyAppsData = {
    stripe: {
      enabled: eventType.price > 0,
      // Price default is 0 in DB. So, it would always be non nullish.
      price: eventType.price,
      // Currency default is "usd" in DB.So, it would also be available always
      currency: eventType.currency,
    },
    rainbow: {
      enabled: !!(eventType.metadata?.smartContractAddress && eventType.metadata?.blockchainId),
      smartContractAddress: eventType.metadata?.smartContractAddress || "",
      blockchainId: eventType.metadata?.blockchainId || 0,
    },
    giphy: {
      enabled: !!eventType.metadata?.giphyThankYouPage,
      thankYouPage: eventType.metadata?.giphyThankYouPage || "",
    },
  } as const;

  // TODO: This assertion helps typescript hint that only one of the app's data can be returned
  const legacyAppData = legacyAppsData[appId as Extract<T, keyof typeof legacyAppsData>];
  const allowDataGet = forcedGet ? true : legacyAppData?.enabled;
  return allowDataGet ? legacyAppData : null;
};

export default getApps;
