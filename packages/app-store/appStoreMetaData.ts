import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: () => Promise<Omit<AppMeta, "dirName"> & { dirName: string }>;
};

// Lazy loading wrapper for app metadata - now calls the lazy functions
const createLazyAppMetadata = (key: string, lazyFunction: () => Promise<any>) => {
  return async () => {
    const rawMetadata = await lazyFunction();
    return getNormalizedAppMetadata(rawMetadata);
  };
};

export const appStoreMetadata = {} as AppStoreMetaData;
for (const [key, lazyFunction] of Object.entries(rawAppStoreMetadata)) {
  appStoreMetadata[key as keyof typeof appStoreMetadata] = createLazyAppMetadata(key, lazyFunction as any);
}
