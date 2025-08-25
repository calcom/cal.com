import { prepareAppsWithCredentials } from "../prepareAppsWithCredentials";
import type { CredentialDataWithTeamName } from "../prepareAppsWithCredentials";
import { sanitizeAppsMetadata } from "../sanitizeAppsMetadata";
import { calendarAppsMetaData } from "./calendarAppsMetaData";

const ALL_CALENDAR_APPS = sanitizeAppsMetadata<typeof calendarAppsMetaData>(calendarAppsMetaData);

export const getCalendarApps = (credentials: CredentialDataWithTeamName[], filterOnCredentials?: boolean) => {
  return prepareAppsWithCredentials(ALL_CALENDAR_APPS, credentials, filterOnCredentials);
};
