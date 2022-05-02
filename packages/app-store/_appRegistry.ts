import prisma from "@calcom/prisma";
import { App } from "@calcom/types/App";

import appStoreMetadata from "./metadata";

export function getAppWithMetadata(app: { dirName: string }) {
  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];
  // Let's not leak api keys to the front end
  const { key, ...metadata } = appMetadata;
  return metadata;
}

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export async function getAppRegistry() {
  const dbApps = await prisma.app.findMany({ select: { dirName: true, slug: true, categories: true } });
  return dbApps.reduce((apps, dbapp) => {
    const app = getAppWithMetadata(dbapp);
    if (!app) return apps;
    // Skip if app isn't installed
    if (!app.installed) return apps;
    apps.push(app);
    return apps;
  }, [] as Omit<App, "key">[]);
}
