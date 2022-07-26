import { Credential, SelectedCalendar } from "@prisma/client";
import { createHash } from "crypto";
import _ from "lodash";
import cache from "memory-cache";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import { sendBrokenIntegrationEmail } from "@calcom/emails";
import { getUid } from "@calcom/lib/CalEventParser";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { CalendarEvent, EventBusyDate, NewCalendarEventType } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendarCredentials = (credentials: Array<Credential>, userId: number) => {
  const calendarCredentials = getApps(credentials)
    .filter((app) => app.type.endsWith("_calendar"))
    .flatMap((app) => {
      const credentials = app.credentials.flatMap((credential) => {
        const calendar = getCalendar(credential);
        return app && calendar && app.variant === "calendar"
          ? [{ integration: app, credential, calendar }]
          : [];
      });
      return credentials.length ? credentials : [];
    });

  return calendarCredentials;
};

export const getConnectedCalendars = async (
  calendarCredentials: ReturnType<typeof getCalendarCredentials>,
  selectedCalendars: { externalId: string }[]
) => {
  const connectedCalendars = await Promise.all(
    calendarCredentials.map(async (item) => {
      const { calendar, integration, credential } = item;

      const credentialId = credential.id;
      try {
        const cals = await calendar.listCalendars();
        const calendars = _(cals)
          .map((cal) => ({
            ...cal,
            readOnly: cal.readOnly || false,
            primary: cal.primary || null,
            isSelected: selectedCalendars.some((selected) => selected.externalId === cal.externalId),
            credentialId,
          }))
          .sortBy(["primary"])
          .value();
        const primary = calendars.find((item) => item.primary) ?? calendars[0];
        if (!primary) {
          throw new Error("No primary calendar found");
        }
        return {
          integration,
          credentialId,
          primary,
          calendars,
        };
      } catch (_error) {
        const error = getErrorFromUnknown(_error);
        return {
          integration,
          credentialId,
          error: {
            message: error.message,
          },
        };
      }
    })
  );

  return connectedCalendars;
};

const CACHING_TIME = 30_000; // 30 seconds

const getCachedResults = async (
  withCredentials: Credential[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  const calendarCredentials = withCredentials.filter((credential) => credential.type.endsWith("_calendar"));
  const calendars = calendarCredentials.map((credential) => getCalendar(credential));

  const startGetBusyCalendarTimes = performance.now();
  const results = calendars.map(async (c, i) => {
    /** Filter out nulls */
    if (!c) return [];
    /** We rely on the index so we can match credentials with calendars */
    const { id, type } = calendarCredentials[i];
    /** We just pass the calendars that matched the credential type,
     * TODO: Migrate credential type or appId
     */
    const passedSelectedCalendars = selectedCalendars.filter((sc) => sc.integration === type);
    /** We extract external Ids so we don't cache too much */
    const selectedCalendarIds = passedSelectedCalendars.map((sc) => sc.externalId);
    /** We create a unique hash key based on the input data */
    const cacheKey = JSON.stringify({ id, selectedCalendarIds, dateFrom, dateTo });
    const cacheHashedKey = createHash("md5").update(cacheKey).digest("hex");
    /** Check if we already have cached data and return */
    const cachedAvailability = cache.get(cacheHashedKey);

    if (cachedAvailability) {
      log.debug(`Cache HIT: Calendar Availability for key: ${cacheKey}`);
      return cachedAvailability;
    }
    log.debug(`Cache MISS: Calendar Availability for key ${cacheKey}`);
    /** If we don't then we actually fetch external calendars (which can be very slow) */
    const availability = await c.getAvailability(dateFrom, dateTo, passedSelectedCalendars);
    /** We save the availability to a few seconds so recurrent calls are nearly instant */

    cache.put(cacheHashedKey, availability, CACHING_TIME);
    return availability;
  });
  const awaitedResults = await Promise.all(results);
  const endGetBusyCalendarTimes = performance.now();

  log.debug(
    `getBusyCalendarTimes took ${
      endGetBusyCalendarTimes - startGetBusyCalendarTimes
    }ms for creds ${calendarCredentials.map((cred) => cred.id)}`
  );
  return awaitedResults;
};

export const getBusyCalendarTimes = async (
  withCredentials: Credential[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  let results: EventBusyDate[][] = [];
  try {
    results = await getCachedResults(withCredentials, dateFrom, dateTo, selectedCalendars);
  } catch (error) {
    log.warn(error);
  }

  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  credential: Credential,
  calEvent: CalendarEvent
): Promise<EventResult<NewCalendarEventType>> => {
  const uid: string = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;

  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.additionalNotes = "Notes have been hidden by the organiser"; // TODO: i18n this string?
  }

  // TODO: Surfice success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar.createEvent(calEvent).catch(async (e) => {
        await sendBrokenIntegrationEmail(calEvent, "calendar");
        log.error("createEvent failed", e, calEvent);
        success = false;
        return undefined;
      })
    : undefined;

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

export const updateEvent = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRefUid: string | null,
  externalCalendarId: string | null
): Promise<EventResult<NewCalendarEventType>> => {
  const uid = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = false;
  if (bookingRefUid === "") {
    log.error("updateEvent failed", "bookingRefUid is empty", calEvent, credential);
  }
  const updatedResult =
    calendar && bookingRefUid
      ? await calendar
          .updateEvent(bookingRefUid, calEvent, externalCalendarId)
          .then((event) => {
            success = true;
            return event;
          })
          .catch(async (e) => {
            await sendBrokenIntegrationEmail(calEvent, "calendar");
            log.error("updateEvent failed", e, calEvent);
            return undefined;
          })
      : undefined;

  return {
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
  };
};

export const deleteEvent = (credential: Credential, uid: string, event: CalendarEvent): Promise<unknown> => {
  const calendar = getCalendar(credential);
  if (calendar) {
    return calendar.deleteEvent(uid, event);
  }

  return Promise.resolve({});
};
