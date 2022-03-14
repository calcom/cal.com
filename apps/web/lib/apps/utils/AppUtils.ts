import { Prisma } from "@prisma/client";
import _ from "lodash";

import appStore from "@calcom/app-store";
import { APPS as CalendarApps } from "@calcom/lib/calendar/config";
import { LocationType } from "@calcom/lib/location";
import type { App } from "@calcom/types/App";

import { APPS as PaymentApps } from "@lib/apps/payment/config";

const ALL_APPS_MAP = {
  ...Object.values(appStore).map((app) => app.metadata),
  /* To be deprecated start */
  ...CalendarApps,
  ...PaymentApps,
  /* To be deprecated end */
} as App[];

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export const ALL_APPS = Object.values(ALL_APPS_MAP);

type OptionTypeBase = {
  label: string;
  value: LocationType;
  disabled?: boolean;
};

export function getLocationOptions(integrations: AppMeta) {
  const defaultLocations: OptionTypeBase[] = [
    { value: LocationType.InPerson, label: "in_person_meeting" },
    { value: LocationType.Phone, label: "phone_call" },
  ];

  integrations.forEach((app) => {
    if (app.locationOption) {
      defaultLocations.push(app.locationOption);
    }
  });

  return defaultLocations;
}

/**
 * This should get all avaialable apps to the user based on his saved
 * credentials, this should also get globally available apps.
 */
function getApps(userCredentials: CredentialData[]) {
  const apps = ALL_APPS.map((appMeta) => {
    const appName = appMeta.type.split("_").join("");
    const app = appStore[appName as keyof typeof appStore];
    const credentials = userCredentials
      .filter((credential) => credential.type === appMeta.type)
      .map((credential) => _.pick(credential, ["id", "type"])); // ensure we don't leak `key` to frontend
    let locationOption: OptionTypeBase | null = null;

    /** Check if app has location option AND add it if user has credentials for it OR is a global one */
    if (app && "lib" in app && "locationOption" in app.lib && (appMeta.isGlobal || credentials.length > 0)) {
      locationOption = app.lib.locationOption;
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

export function getAppName(name: string) {
  return ALL_APPS_MAP[name].name;
}

export function getAppType(name: string): string {
  const type = ALL_APPS_MAP[name].type;

  if (type.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export default getApps;
