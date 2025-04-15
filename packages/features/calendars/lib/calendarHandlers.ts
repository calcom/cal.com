import processExternalId from "@calcom/app-store/_utils/calendars/processExternalId";
import { getCalendar as getCalendarOriginal } from "@calcom/app-store/_utils/getCalendar";

export const getCalendar = getCalendarOriginal;
export { processExternalId };
