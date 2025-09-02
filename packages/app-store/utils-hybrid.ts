import type { AppCategories } from "@prisma/client";

import type { EventLocationType } from "@calcom/app-store/locations";
import prisma from "@calcom/prisma";
import type { AppMeta } from "@calcom/types/App";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getAppWithMetadata } from "./_appRegistry";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
};

export type CredentialDataWithTeamName = CredentialForCalendarService & {
  team?: {
    name: string;
  } | null;
};

const appMetadataCache = new Map<string, AppMeta>();
const appSlugToMetadataCache = new Map<string, AppMeta>();

export async function getAppFromSlug(slug: string | undefined): Promise<AppMeta | undefined> {
  if (!slug) return undefined;

  if (appSlugToMetadataCache.has(slug)) {
    return appSlugToMetadataCache.get(slug);
  }

  const metadata = await getAppWithMetadata({ slug });
  if (metadata) {
    appSlugToMetadataCache.set(slug, metadata);
  }
  return metadata || undefined;
}

export async function getAppName(slug: string): Promise<string | null> {
  const app = await getAppFromSlug(slug);
  return app?.name ?? null;
}

export async function getAppType(slug: string): Promise<string> {
  const app = await getAppFromSlug(slug);
  if (!app) return "Unknown";

  const type = app.type;
  if (type.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export async function getAppFromLocationValue(type: string): Promise<AppMeta | undefined> {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: { slug: true, dirName: true },
  });

  for (const dbApp of dbApps) {
    const metadata = await getAppWithMetadata({ slug: dbApp.slug });
    if (metadata?.appData?.location?.type === type) {
      return metadata;
    }
  }

  return undefined;
}

export async function getCalendarApps(): Promise<AppMeta[]> {
  const dbApps = await prisma.app.findMany({
    where: {
      enabled: true,
      categories: { has: "calendar" },
    },
    select: { slug: true, dirName: true },
  });

  const calendarApps: AppMeta[] = [];
  for (const dbApp of dbApps) {
    const metadata = await getAppWithMetadata({ slug: dbApp.slug });
    if (metadata) {
      calendarApps.push(metadata);
    }
  }

  return calendarApps;
}

export async function getPaymentApps(): Promise<AppMeta[]> {
  const dbApps = await prisma.app.findMany({
    where: {
      enabled: true,
      categories: { has: "payment" },
    },
    select: { slug: true, dirName: true },
  });

  const paymentApps: AppMeta[] = [];
  for (const dbApp of dbApps) {
    const metadata = await getAppWithMetadata({ slug: dbApp.slug });
    if (metadata) {
      paymentApps.push(metadata);
    }
  }

  return paymentApps;
}

export async function getAnalyticsApps(): Promise<AppMeta[]> {
  const dbApps = await prisma.app.findMany({
    where: {
      enabled: true,
      categories: { has: "analytics" },
    },
    select: { slug: true, dirName: true },
  });

  const analyticsApps: AppMeta[] = [];
  for (const dbApp of dbApps) {
    const metadata = await getAppWithMetadata({ slug: dbApp.slug });
    if (metadata && metadata.appData?.tag) {
      analyticsApps.push(metadata);
    }
  }

  return analyticsApps;
}

export async function getLocationApps(): Promise<AppMeta[]> {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: { slug: true, dirName: true },
  });

  const locationApps: AppMeta[] = [];
  for (const dbApp of dbApps) {
    const metadata = await getAppWithMetadata({ slug: dbApp.slug });
    if (metadata?.appData?.location) {
      locationApps.push(metadata);
    }
  }

  return locationApps;
}

export function getAppFromSlugSync(slug: string | undefined): AppMeta | undefined {
  if (!slug) return undefined;
  return appSlugToMetadataCache.get(slug);
}

export function getAppNameSync(slug: string): string | null {
  const app = getAppFromSlugSync(slug);
  return app?.name ?? null;
}

export function getAppTypeSync(slug: string): string {
  const app = getAppFromSlugSync(slug);
  if (!app) return "Unknown";

  const type = app.type;
  if (type.endsWith("_calendar")) {
    return "Calendar";
  }
  if (type.endsWith("_payment")) {
    return "Payment";
  }
  return "Unknown";
}

export function doesAppSupportTeamInstall({
  appCategories,
  concurrentMeetings = undefined,
  isPaid,
}: {
  appCategories: string[];
  concurrentMeetings: boolean | undefined;
  isPaid: boolean;
}) {
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

export const defaultVideoAppCategories: AppCategories[] = ["messaging", "conferencing", "video"];
