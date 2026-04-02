import type { AppMeta } from "@calcom/types/App";
// We have to import all the booker-apps config/metadata in here as without that we couldn't
import type { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getAppAssetFullPath } from "./getAppAssetFullPath";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: AppMeta;
};

export const getNormalizedAppMetadata = (appMeta: RawAppStoreMetaData[keyof RawAppStoreMetaData]) => {
  const dirName = "dirName" in appMeta ? appMeta.dirName : appMeta.slug;
  if (!dirName) {
    throw new Error(`Couldn't derive dirName for app ${appMeta.name}`);
  }
  const metadata = {
    appData: null,
    dirName,
    __template: "",
    ...appMeta,
  } as Omit<AppStoreMetaData[keyof AppStoreMetaData], "dirName"> & { dirName: string };
  metadata.logo = getAppAssetFullPath(metadata.logo, {
    dirName,
    isTemplate: metadata.isTemplate,
  });
  return metadata;
};
