import type { AppMeta } from "@calcom/types/App";

import { getNormalizedAppMetadata } from "../../getNormalizedAppMetadata";
import { videoAppsMetadata as rawVideoAppsMetadata } from "../../videoApps.metadata.generated";

type RawVideoAppsMetaData = typeof rawVideoAppsMetadata;
type VideoAppsMetaData = {
  [key in keyof RawVideoAppsMetaData]: Omit<AppMeta, "dirName"> & { dirName: string };
};

export const videoAppsMetaData = {} as VideoAppsMetaData;
for (const [key, value] of Object.entries(rawVideoAppsMetadata)) {
  videoAppsMetaData[key as keyof typeof videoAppsMetaData] = getNormalizedAppMetadata(value);
}
