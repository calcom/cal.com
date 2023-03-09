import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getAppFromSlug } from "@calcom/app-store/utils";
import prisma, { safeAppSelect, safeCredentialSelect } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
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
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      metadata: true,
    },
  });

  const usersDefaultApp = userMetadata.parse(user?.metadata)?.defaultConferencingApp?.appSlug;
  const apps = [] as (App & {
    credentials: Credential[];
    isDefault?: boolean;
  })[];
  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;
    let dependencyData: {
      name?: string;
      installed?: boolean;
    }[] = [];
    if (app.dependencies) {
      dependencyData = app.dependencies.map((dependency) => {
        const dependencyInstalled = dbApps.some(
          (dbAppIterator) => dbAppIterator.credentials.length && dbAppIterator.slug === dependency
        );
        // If the app marked as dependency is simply deleted from the codebase, we can have the situation where App is marked installed in DB but we couldn't get the app.
        const dependencyName = getAppFromSlug(dependency)?.name;
        return { name: dependencyName, installed: dependencyInstalled };
      });
    }

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
      isDefault: usersDefaultApp === dbapp.slug,
      ...(app.dependencies && { dependencyData }),
    });
  }

  return apps;
}
