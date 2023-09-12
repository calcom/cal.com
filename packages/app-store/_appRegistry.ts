import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import prisma, { safeAppSelect, safeCredentialSelect } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

/**
 * Get App metdata either using dirName or slug
 */
export async function getAppWithMetadata(app: { dirName: string } | { slug: string }) {
  let appMetadata: App | null;

  if ("dirName" in app) {
    appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata] as App;
  } else {
    const foundEntry = Object.entries(appStoreMetadata).find(([, meta]) => {
      return meta.slug === app.slug;
    });
    if (!foundEntry) return null;
    appMetadata = foundEntry[1] as App;
  }

  if (!appMetadata) return null;
  // Let's not leak api keys to the front end
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, ...metadata } = appMetadata;
  return metadata;
}

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export async function getAppRegistry() {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: { dirName: true, slug: true, categories: true, enabled: true, createdAt: true },
  });
  const apps = [] as App[];
  const installCountPerApp = await getInstallCountPerApp();
  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;
    app.createdAt = dbapp.createdAt.toISOString();
    apps.push({
      ...app,
      category: app.category || "other",
      installed:
        true /* All apps from DB are considered installed by default. @TODO: Add and filter our by `enabled` property */,
      installCount: installCountPerApp[dbapp.slug] || 0,
    });
  }
  return apps;
}

export async function getAppRegistryWithCredentials(userId: number, userAdminTeams: UserAdminTeams = []) {
  // Get teamIds to grab existing credentials
  const teamIds = [];
  for (const team of userAdminTeams) {
    if (!team.isUser) {
      teamIds.push(team.id);
    }
  }

  const dbApps = await prisma.app.findMany({
    where: { enabled: true },
    select: {
      ...safeAppSelect,
      credentials: {
        where: { OR: [{ userId }, { teamId: { in: teamIds } }] },
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
  const installCountPerApp = await getInstallCountPerApp();
  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;
    app.createdAt = dbapp.createdAt.toISOString();
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

    apps.push({
      ...app,
      categories: dbapp.categories,
      credentials: dbapp.credentials,
      installed: true,
      installCount: installCountPerApp[dbapp.slug] || 0,
      isDefault: usersDefaultApp === dbapp.slug,
      ...(app.dependencies && { dependencyData }),
    });
  }

  return apps;
}
