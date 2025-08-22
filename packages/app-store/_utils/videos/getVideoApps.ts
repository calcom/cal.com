import { prepareAppsWithCredentials } from "../prepareAppsWithCredentials";
import type { CredentialDataWithTeamName } from "../prepareAppsWithCredentials";
import { sanitizeAppsMetadata } from "../sanitizeAppsMetadata";
import { videoAppsMetaData } from "./videoAppsMetaData";

const ALL_VIDEO_APPS = sanitizeAppsMetadata<typeof videoAppsMetaData>(videoAppsMetaData);

export const getVideoApps = (credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) => {
  return prepareAppsWithCredentials(ALL_VIDEO_APPS, credentials, filterOnCredentials);
};
