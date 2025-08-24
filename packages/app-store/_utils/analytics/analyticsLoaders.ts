import { createCachedImport } from "../createCachedImport";

export const analyticsLoaders = {
  dub: createCachedImport(() => import("../../dub/lib")),
  plausible: createCachedImport(() => import("../../plausible")),
};

export type AnalyticsLoadersKey = keyof typeof analyticsLoaders;
