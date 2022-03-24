import { App } from "@calcom/types/App";

import appStore from ".";

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export function getAppRegistry() {
  return Object.values(appStore).map((app) => {
    // Let's not leak api keys to the front end
    const { key, ...metadata } = app.metadata;
    return metadata;
  }) as App[];
}
