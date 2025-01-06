import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";
import { appDataSchemas, appKeysSchemas } from "./apps.schemas.generated";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: Omit<AppMeta, "dirName"> & { dirName: string };
};

export const appStoreMetadata = {} as AppStoreMetaData;
for (const [key, value] of Object.entries(rawAppStoreMetadata)) {
  const appDataSchema = appDataSchemas[key as keyof typeof appDataSchemas];
  const appKeysSchema = appKeysSchemas[key as keyof typeof appKeysSchemas];
  const parsedMetadata = {
    ...value,
    appData: appDataSchema.parse(value.appData),
    key: appKeysSchema.parse(value.key),
  };
  appStoreMetadata[key as keyof typeof appStoreMetadata] = getNormalizedAppMetadata(parsedMetadata);
}
