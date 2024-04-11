import type { SelectedCalendar } from "@prisma/client";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential, getPiiFreeSelectedCalendar } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { performance } from "@calcom/lib/server/perfObserver";
import type { EventBusyData } from "@calcom/types/Calendar";
import type { CredentialPayload, OverlayCredentialPayload } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["getCalendarsEvents"] });

// array of calendars that fetch event titles for overlay
const overlayCalendarsWithEventTitles = ["google_calendar"];

const getCalendarsEvents = async (
  withCredentials: CredentialPayload[] | OverlayCredentialPayload[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[],
  overlayUserType?: "overlay" | "cal"
): Promise<EventBusyData[][]> => {
  const calendarCredentials = withCredentials
    .filter((credential) => credential.type.endsWith("_calendar"))
    // filter out invalid credentials - these won't work.
    .filter((credential) => !credential.invalid);

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
    log.debug(
      `Getting availability for`,
      safeStringify({
        calendarService: c.constructor.name,
        selectedCalendars: passedSelectedCalendars.map(getPiiFreeSelectedCalendar),
      })
    );
    let eventBusyDates = [];
    if (overlayCalendarsWithEventTitles.includes(type)) {
      eventBusyDates = await c.getAvailability(dateFrom, dateTo, passedSelectedCalendars, overlayUserType);
    } else {
      const eventData = await c.getAvailability(dateFrom, dateTo, passedSelectedCalendars);
      eventBusyDates = eventData.map((event) => {
        return {
          ...event,
          title: "Busy",
        };
      });
    }
    performance.mark("eventBusyDatesEnd");
    performance.measure(
      `[getAvailability for ${selectedCalendarIds.join(", ")}][$1]'`,
      "eventBusyDatesStart",
      "eventBusyDatesEnd"
    );

    return eventBusyDates.map((a) => ({
      ...a,
      source: `${appId}`,
    }));
  });
  const awaitedResults = await Promise.all(results);
  performance.mark("getBusyCalendarTimesEnd");
  performance.measure(
    `getBusyCalendarTimes took $1 for creds ${calendarCredentials.map((cred) => cred.id)}`,
    "getBusyCalendarTimesStart",
    "getBusyCalendarTimesEnd"
  );
  log.debug(
    "Result",
    safeStringify({
      calendarCredentials: calendarCredentials.map(getPiiFreeCredential),
      selectedCalendars: selectedCalendars.map(getPiiFreeSelectedCalendar),
      calendarEvents: awaitedResults,
    })
  );
  return awaitedResults;
};

export default getCalendarsEvents;
