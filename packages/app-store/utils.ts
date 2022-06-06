import { Prisma } from "@prisma/client";
import { TFunction } from "next-i18next";

import type { AppMeta } from "@calcom/types/App";

import { getAppRegistry } from "./_appRegistry";
// If you import this file on any app it should produce circular dependency
// import appStore from "./index";
import { appStoreMetadata } from "./apps.generated";
import { LocationType } from "./locations";

const ALL_APPS_MAP = Object.keys(appStoreMetadata).reduce((store, key) => {
  store[key] = appStoreMetadata[key as keyof typeof appStoreMetadata];
  return store;
}, {} as Record<string, AppMeta>);

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true, key: true, userId: true, appId: true },
});

type CredentialData = Omit<Prisma.CredentialGetPayload<typeof credentialData>, "type">;

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
  { value: LocationType.Phone, label: "attendee_phone_number" },
  { value: LocationType.UserPhone, label: "host_phone_number" },
];

export function getLocationOptions(integrations: AppMeta, t: TFunction) {
  const locations = [...defaultLocations];
  integrations.forEach((app) => {
    if (app.locationOption) {
      locations.push(app.locationOption);
    }
  });

  return translateLocations(locations, t);
}

/**
 * This should get all available apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
async function getApps(userCredentials: CredentialData[]) {
  const appsWithMeta = await getAppRegistry();
  const apps = appsWithMeta.map((app) => {
    const credentials = userCredentials.filter((credential) => credential.appId === app.slug);
    let locationOption: OptionTypeBase | null = null;

    /** If the app is a globally installed one, let's inject it's key */
    if (app.isGlobal) {
      credentials.push({
        id: +new Date().getTime(),
        key: app.key!,
        userId: +new Date().getTime(),
        appId: app.slug,
      });
    }

    /** Check if app has location option AND add it if user has credentials for it */
    if (credentials.length > 0 && app?.locationType) {
      locationOption = {
        value: app.locationType,
        label: app.locationLabel || "No label set",
        disabled: false,
      };
    }

    const credential: typeof credentials[number] | null = credentials[0] || null;
    return {
      ...app,
      appId: app.slug,
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
    if (location.label === "attendee_phone_number") {
      locations[location.value] = t("your_number");
      return locations;
    }
    if (location.label === "host_phone_number") {
      locations[location.value] = `${t("phone_call")} (${t("number_provided")})`;
      return locations;
    }
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

export function getAppName(name: string): string | null {
  return ALL_APPS_MAP[name as keyof typeof ALL_APPS_MAP]?.name ?? null;
}

export default getApps;
