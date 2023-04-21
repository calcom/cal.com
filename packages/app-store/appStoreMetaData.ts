import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: AppMeta;
};

export const appStoreMetadata = {} as AppStoreMetaData;

for (const [key, value] of Object.entries(rawAppStoreMetadata)) {
  appStoreMetadata[key as keyof typeof appStoreMetadata] = {
    appData: null,
    dirName: "dirName" in value ? value.dirName : value.slug,
    __template: "",
    ...value,
  } as AppStoreMetaData[keyof AppStoreMetaData];
}
