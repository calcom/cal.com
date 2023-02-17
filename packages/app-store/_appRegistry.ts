import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import prisma, { safeAppSelect, safeCredentialSelect } from "@calcom/prisma";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

export async function getAppWithMetadata(app: { dirName: string }) {
  const appMetadata: App | null = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata] as App;
  if (!appMetadata) return null;
  // Let's not leak api keys to the front end
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, ...metadata } = appMetadata;
  if (metadata.logo && !metadata.logo.includes("/api/app-store/")) {
    const appDirName = `${metadata.isTemplate ? "templates" : ""}/${app.dirName}`;
    metadata.logo = `/api/app-store/${appDirName}/${metadata.logo}`;
  }
  return metadata;
}

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export async function getAppRegistry() {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: { dirName: true, slug: true, categories: true, enabled: true },
  });
  const apps = [] as App[];
  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;

    const { rating, reviews, trending, verified, ...remainingAppProps } = app;
    apps.push({
      rating: rating || 0,
      reviews: reviews || 0,
      trending: trending || true,
      verified: verified || true,
      ...remainingAppProps,
      category: app.category || "other",
      installed:
        true /* All apps from DB are considered installed by default. @TODO: Add and filter our by `enabled` property */,
    });
  }
  return apps;
}

export async function getAppRegistryWithCredentials(userId: number) {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: {
      ...safeAppSelect,
      credentials: {
        where: { userId },
        select: safeCredentialSelect,
      },
    },
    orderBy: {
      credentials: {
        _count: "desc",
      },
    },
  });
  const apps = [] as (App & {
    credentials: Credential[];
  })[];
  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;

    const { rating, reviews, trending, verified, ...remainingAppProps } = app;
    apps.push({
      rating: rating || 0,
      reviews: reviews || 0,
      trending: trending || true,
      verified: verified || true,
      ...remainingAppProps,
      categories: dbapp.categories,
      credentials: dbapp.credentials,
      installed: true,
    });
  }
  return apps;
}
