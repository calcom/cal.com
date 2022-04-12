import { App } from "@calcom/types/App";

import appStore from ".";

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export function getAppRegistry() {
  return Object.values(appStore).reduce((apps, app) => {
    // Skip if app isn't installed
    if (!app.metadata.installed) return apps;
    // Let's not leak api keys to the front end
    const { key, ...metadata } = app.metadata;
    apps.push(metadata);
    return apps;
  }, [] as Omit<App, "key">[]);
}
