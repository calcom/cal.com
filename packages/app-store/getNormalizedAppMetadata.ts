import type { AppMeta } from "@calcom/types/App";

import { getAppAssetFullPath } from "./getAppAssetFullPath";

export const getNormalizedAppMetadata = (appMeta: Record<string, any>) => {
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
