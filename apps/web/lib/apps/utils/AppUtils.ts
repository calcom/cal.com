import { Prisma } from "@prisma/client";
import _ from "lodash";

import appStore from "@calcom/app-store";
import { LocationType } from "@calcom/lib/location";
import type { App } from "@calcom/types/App";

import { APPS as CalendarApps } from "@lib/apps/calendar/config";
import { APPS as ConferencingApps } from "@lib/apps/conferencing/config";
import { APPS as PaymentApps } from "@lib/apps/payment/config";

const ALL_APPS_MAP = {
  ...Object.values(appStore).map((app) => app.metadata),
  ...CalendarApps,
  ...ConferencingApps,
  ...PaymentApps,
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

export function getLocationOptions() {
  const defaultLocations: OptionTypeBase[] = [
    { value: LocationType.InPerson, label: "in_person_meeting" },
    { value: LocationType.Jitsi, label: "Jitsi Meet" },
    { value: LocationType.Phone, label: "phone_call" },
  ];

  Object.values(appStore).forEach((app) => {
    if ("locationOption" in app.lib) {
      defaultLocations.push(app.lib.locationOption);
    }
  });

  return defaultLocations;
}

function getApps(userCredentials: CredentialData[]) {
  const apps = ALL_APPS.map((app) => {
    const credentials = userCredentials
      .filter((credential) => credential.type === app.type)
      .map((credential) => _.pick(credential, ["id", "type"])); // ensure we don't leak `key` to frontend

    const credential: typeof credentials[number] | null = credentials[0] || null;
    return {
      ...app,
      /**
       * @deprecated use `credentials`
       */
      credential,
      credentials,
    };
  });

  return apps;
}

export type AppMeta = ReturnType<typeof getApps>;

export function hasIntegration(apps: AppMeta, type: string): boolean {
  return !!apps.find(
    (app) =>
      app.type === type &&
      !!app.installed &&
      /* TODO: find a better way to do this */
      (type === "jitsi_video" || type === "huddle01_video" || app.credentials.length > 0)
  );
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
