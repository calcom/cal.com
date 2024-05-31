import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: Omit<AppMeta, "dirName"> & { dirName: string };
};

export const appStoreMetadata = {} as AppStoreMetaData;
for (const [key, value] of Object.entries(rawAppStoreMetadata)) {
  appStoreMetadata[key as keyof typeof appStoreMetadata] = getNormalizedAppMetadata(value);
}
