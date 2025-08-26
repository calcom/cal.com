import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import { getAllDelegationCredentialsForUser } from "@calcom/lib/delegationCredential/server";
import { AppRepository } from "@calcom/lib/server/repository/app/PrismaAppRepository";
import type { UserAdminTeams } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

export type TDependencyData = {
  name?: string;
  installed?: boolean;
}[];

/**
 * Get App metadata either using dirName or slug
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
  const appRepository = new AppRepository();
  const [dbApps, installCountPerApp] = await Promise.all([
    appRepository.getAllEnabledApps(),
    getInstallCountPerApp(),
  ]);
  const apps = [] as App[];
  for await (const app of dbApps) {
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;
    app.createdAt = app.createdAt.toISOString();
    apps.push({
      ...app,
      category: app.categories[0] || "other",
      installed:
        true /* All apps from DB are considered installed by default. @TODO: Add and filter our by `enabled` property */,
      installCount: installCountPerApp[app.slug] || 0,
    });
  }
  return apps;
}

export async function getAppRegistryWithCredentials(userId: number, userAdminTeams: UserAdminTeams = []) {
  // Get teamIds to grab existing credentials

  const [dbApps, user, delegationCredentials, installCountPerApp] = await Promise.all([
    appRepository.getAllEnabledAppsWithCredentials({ userId, teamIds }),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        id: true,
        metadata: true,
      },
    }),
    user ? await getAllDelegationCredentialsForUser({ user: { id: userId, email: user.email } }) : [],
    getInstallCountPerApp(),
  ]);

  const usersDefaultApp = userMetadata.parse(user?.metadata)?.defaultConferencingApp?.appSlug;
  const apps = [] as (App & {
    credentials: Credential[];
    isDefault?: boolean;
  })[];
  for await (const app of dbApps) {
    const delegationCredentialsForApp = delegationCredentials.filter(
      (credential) => credential.appId === app.slug
    );
    const nonDelegationCredentialsForApp = app.credentials;
    const allCredentials = [...delegationCredentialsForApp, ...nonDelegationCredentialsForApp];
    // Skip if app isn't installed
    /* This is now handled from the DB */
    // if (!app.installed) return apps;
    app.createdAt = app.createdAt.toISOString();
    let dependencyData: TDependencyData = [];
    if (app.dependencies) {
      dependencyData = app.dependencies.map((dependency) => {
        const dependencyApp = dbApps.find((dbAppIterator) => dbAppIterator.slug === dependency);
        const dependencyInstalled = dependencyApp?.credentials.length || false;
        // If the app marked as dependency is simply deleted from the codebase, we can have the situation where App is marked installed in DB but we couldn't get the app.
        return { name: dependencyApp?.name || "", installed: dependencyInstalled };
      });
    }

    apps.push({
      ...app,
      categories: app.categories,
      credentials: allCredentials,
      installed: true,
      installCount: installCountPerApp[app.slug] || 0,
      isDefault: usersDefaultApp === app.slug,
      ...(app.dependencies && { dependencyData }),
    });
  }

  return apps;
}
