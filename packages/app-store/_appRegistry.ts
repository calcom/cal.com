import prisma from "@calcom/prisma";
import { App } from "@calcom/types/App";

import appStoreMetadata from "./metadata";

/** @todo Maybe add this to the DB */
const slugToDirName = {
  "apple-calendar": "applecalendar",
  "caldav-calendar": "caldavcalendar",
  "daily-video": "dailyvideo",
  "google-calendar": "googlecalendar",
  "google-meet": "googlevideo",
  hubspot: "hubspotothercalendar",
  huddle01: "huddle01video",
  jitsi: "jitsivideo",
  msteams: "office365calendar",
  "office365-calendar": "office365video",
  slack: "slackmessaging",
  stripe: "stripepayment",
  tandem: "tandemvideo",
  "wipe-my-cal": "wipemycalother",
  zoom: "zoomvideo",
};

export function getAppDirFromSlug(slug: string) {
  return slugToDirName[slug as keyof typeof slugToDirName];
}

export function getAppFromSlug(slug: string) {
  const dirName = getAppDirFromSlug(slug);
  const app = appStoreMetadata[dirName as keyof typeof appStoreMetadata];
  // Let's not leak api keys to the front end
  const { key, ...metadata } = app;
  return metadata;
}

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export async function getAppRegistry() {
  const dbApps = await prisma.app.findMany({ select: { slug: true, categories: true } });
  return dbApps.reduce((apps, dbapp) => {
    const app = getAppFromSlug(dbapp.slug);
    if (!app) return apps;
    // Skip if app isn't installed
    if (!app.installed) return apps;
    apps.push(app);
    return apps;
  }, [] as Omit<App, "key">[]);
}
