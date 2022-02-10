import { Prisma } from "@prisma/client";
import _ from "lodash";

import { APPS as CalendarApps } from "@lib/apps/calendar/config";
import { APPS as ConferencingApps } from "@lib/apps/conferencing/config";
import { App } from "@lib/apps/interfaces/App";
import { APPS as PaymentApps } from "@lib/apps/payment/config";

const ALL_APPS_MAP = { ...CalendarApps, ...ConferencingApps, ...PaymentApps };

/**
 *  We can't use aliases in playwright tests (yet)
 * https://github.com/microsoft/playwright/issues/7121
 */
const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export const ALL_APPS = Object.entries(ALL_APPS_MAP).map((app) => app[1]);

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
    (app) => app.type === type && !!app.installed && (type === "daily_video" || app.credentials.length > 0)
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
