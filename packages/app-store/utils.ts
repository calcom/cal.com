import { Prisma } from "@prisma/client";
import { TFunction } from "next-i18next";

import type { App } from "@calcom/types/App";

import appStore from ".";
import { LocationType } from "./locations";

const ALL_APPS_MAP = Object.keys(appStore).reduce((store, key) => {
  store[key] = appStore[key as keyof typeof appStore].metadata;
  return store;
}, {} as Record<string, App>);

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true, key: true, userId: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export const ALL_APPS = Object.values(ALL_APPS_MAP);

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

function translateLocations(locations: OptionTypeBase[], t: TFunction) {
  return locations.map((l) => ({
    ...l,
    label: t(l.label),
  }));
}
const defaultLocations: OptionTypeBase[] = [
  { value: LocationType.InPerson, label: "in_person_meeting" },
  { value: LocationType.Link, label: "link_meeting" },
  { value: LocationType.Phone, label: "phone_call" },
];

export function getLocationOptions(integrations: AppMeta, t: TFunction) {
  integrations.forEach((app) => {
    if (app.locationOption) {
      defaultLocations.push(app.locationOption);
    }
  });

  return translateLocations(defaultLocations, t);
}

/**
 * This should get all avaialable apps to the user based on his saved
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
        key: appMeta.key!,
        userId: +new Date().getTime(),
      });
    }

    /** Check if app has location option AND add it if user has credentials for it */
    if (credentials.length > 0 && appMeta?.locationType) {
      locationOption = {
        value: appMeta.locationType,
        label: appMeta.locationLabel || "No label set",
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

export type AppMeta = ReturnType<typeof getApps>;

/** @deprecated use `getApps`  */
export function hasIntegration(apps: AppMeta, type: string): boolean {
  return !!apps.find((app) => app.type === type && !!app.installed && app.credentials.length > 0);
}

export function hasIntegrationInstalled(type: App["type"]): boolean {
  return ALL_APPS.some((app) => app.type === type && !!app.installed);
}

export function getLocationTypes(): string[] {
  return ALL_APPS.reduce((locations, app) => {
    if (typeof app.locationType === "string") {
      locations.push(app.locationType);
    }
    return locations;
  }, [] as string[]);
}

export function getLocationLabels(t: TFunction) {
  const defaultLocationLabels = defaultLocations.reduce((locations, location) => {
    locations[location.value] = t(location.label);
    return locations;
  }, {} as Record<LocationType, string>);

  return ALL_APPS.reduce((locations, app) => {
    if (typeof app.locationType === "string") {
      locations[app.locationType] = t(app.locationLabel || "No label set");
    }
    return locations;
  }, defaultLocationLabels);
}

export function getAppName(name: string) {
  return ALL_APPS_MAP[name as keyof typeof ALL_APPS_MAP]?.name || "No App Name";
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

export default getApps;
