import type { AppMeta } from "@calcom/types/App";

import { calendarAppsMetadata as rawCalendarAppsMetadata } from "../../calendarApps.metadata.generated";
import { getNormalizedAppMetadata } from "../../getNormalizedAppMetadata";

type RawCalendarAppsMetaData = typeof rawCalendarAppsMetadata;
type CalendarAppsMetaData = {
  [key in keyof RawCalendarAppsMetaData]: Omit<AppMeta, "dirName"> & { dirName: string };
};

export const calendarAppsMetaData = {} as CalendarAppsMetaData;
for (const [key, value] of Object.entries(rawCalendarAppsMetadata)) {
  calendarAppsMetaData[key as keyof typeof calendarAppsMetaData] = getNormalizedAppMetadata(value);
}
