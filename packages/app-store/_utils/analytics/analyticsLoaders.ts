import { createCachedImport } from "../createCachedImport";

export const analyticsLoaders = {
  dub: createCachedImport(() => import("../../dub")),
  plausible: createCachedImport(() => import("../../plausible")),
};

export type AnalyticsLoadersKey = keyof typeof analyticsLoaders;
