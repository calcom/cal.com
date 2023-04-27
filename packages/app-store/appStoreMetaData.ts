import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getAppAssetFullPath } from "./getAppAssetFullPath";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: AppMeta;
};

export const appStoreMetadata = {} as AppStoreMetaData;
for (const [key, value] of Object.entries(rawAppStoreMetadata)) {
  const dirName = "dirName" in value ? value.dirName : value.slug;
  if (!dirName) {
    throw new Error(`Couldn't derive dirName for app ${key}`);
  }
  const metadata = (appStoreMetadata[key as keyof typeof appStoreMetadata] = {
    appData: null,
    dirName,
    __template: "",
    ...value,
  } as AppStoreMetaData[keyof AppStoreMetaData]);
  metadata.logo = getAppAssetFullPath(metadata.logo, {
    dirName,
    isTemplate: metadata.isTemplate,
  });
}
