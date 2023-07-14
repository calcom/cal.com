import type { SelectedCalendar } from "@prisma/client";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { performance } from "@calcom/lib/server/perfObserver";
import type { EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

const getCalendarsEvents = async (
  withCredentials: CredentialPayload[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
): Promise<EventBusyDate[][]> => {
  const calendarCredentials = withCredentials.filter((credential) => credential.type.endsWith("_calendar"));
  const calendars = await Promise.all(calendarCredentials.map((credential) => getCalendar(credential)));
  performance.mark("getBusyCalendarTimesStart");
  const results = calendars.map(async (c, i) => {
    /** Filter out nulls */
    if (!c) return [];
    /** We rely on the index so we can match credentials with calendars */
    const { type, appId } = calendarCredentials[i];
    /** We just pass the calendars that matched the credential type,
     * TODO: Migrate credential type or appId
     */
    const passedSelectedCalendars = selectedCalendars.filter((sc) => sc.integration === type);
    if (!passedSelectedCalendars.length) return [];
    /** We extract external Ids so we don't cache too much */
    const selectedCalendarIds = passedSelectedCalendars.map((sc) => sc.externalId);
    /** If we don't then we actually fetch external calendars (which can be very slow) */
    performance.mark("eventBusyDatesStart");
    const eventBusyDates = await c.getAvailability(dateFrom, dateTo, passedSelectedCalendars);
    performance.mark("eventBusyDatesEnd");
    performance.measure(
      `[getAvailability for ${selectedCalendarIds.join(", ")}][$1]'`,
      "eventBusyDatesStart",
      "eventBusyDatesEnd"
    );

    return eventBusyDates.map((a) => ({ ...a, source: `${appId}` }));
  });
  const awaitedResults = await Promise.all(results);
  performance.mark("getBusyCalendarTimesEnd");
  performance.measure(
    `getBusyCalendarTimes took $1 for creds ${calendarCredentials.map((cred) => cred.id)}`,
    "getBusyCalendarTimesStart",
    "getBusyCalendarTimesEnd"
  );
  return awaitedResults;
};

export default getCalendarsEvents;
