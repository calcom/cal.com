import type { SelectedCalendar } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { sortBy } from "lodash";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { performance } from "@calcom/lib/server/perfObserver";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { EventResult } from "@calcom/types/EventManager";

import getCalendarsEvents from "./getCalendarsEvents";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

export const getCalendarCredentials = (credentials: Array<CredentialPayload>) => {
  const calendarCredentials = getApps(credentials, true)
    .filter((app) => app.type.endsWith("_calendar"))
    .flatMap((app) => {
      const credentials = app.credentials.flatMap((credential) => {
        const calendar = getCalendar(credential);
        return app.variant === "calendar" ? [{ integration: app, credential, calendar }] : [];
      });

      return credentials.length ? credentials : [];
    });

  return calendarCredentials;
};

export const getConnectedCalendars = async (
  calendarCredentials: ReturnType<typeof getCalendarCredentials>,
  selectedCalendars: { externalId: string }[],
  destinationCalendarExternalId?: string
) => {
  let destinationCalendar: IntegrationCalendar | undefined;
  const connectedCalendars = await Promise.all(
    calendarCredentials.map(async (item) => {
      try {
        const { integration, credential } = item;
        const calendar = await item.calendar;
        // Don't leak credentials to the client
        const credentialId = credential.id;
        if (!calendar) {
          return {
            integration,
            credentialId,
          };
        }
        const cals = await calendar.listCalendars();
        const calendars = sortBy(
          cals.map((cal: IntegrationCalendar) => {
            if (cal.externalId === destinationCalendarExternalId) destinationCalendar = cal;
            return {
              ...cal,
              readOnly: cal.readOnly || false,
              primary: cal.primary || null,
              isSelected: selectedCalendars.some((selected) => selected.externalId === cal.externalId),
              credentialId,
            };
          }),
          ["primary"]
        );
        const primary = calendars.find((item) => item.primary) ?? calendars.find((cal) => cal !== undefined);
        if (!primary) {
          return {
            integration,
            credentialId,
            error: {
              message: "No primary calendar found",
            },
          };
        }
        // HACK https://github.com/calcom/cal.com/pull/7644/files#r1131508414
        if (destinationCalendar && !Object.isFrozen(destinationCalendar)) {
          destinationCalendar.primaryEmail = primary.email;
          destinationCalendar.integrationTitle = integration.title;
          destinationCalendar = Object.freeze(destinationCalendar);
        }

        return {
          integration: cleanIntegrationKeys(integration),
          credentialId,
          primary,
          calendars,
        };
      } catch (error) {
        let errorMessage = "Could not get connected calendars";

        // Here you can expect for specific errors
        if (error instanceof Error) {
          if (error.message === "invalid_grant") {
            errorMessage = "Access token expired or revoked";
          }
        }

        log.error("getConnectedCalendars failed", safeStringify(error), safeStringify({ item }));

        return {
          integration: cleanIntegrationKeys(item.integration),
          credentialId: item.credential.id,
          error: {
            message: errorMessage,
          },
        };
      }
    })
  );

  return { connectedCalendars, destinationCalendar };
};

/**
 * Important function to prevent leaking credentials to the client
 * @param appIntegration
 * @returns App
 */
const cleanIntegrationKeys = (
  appIntegration: ReturnType<typeof getCalendarCredentials>[number]["integration"] & {
    credentials?: Array<CredentialPayload>;
    credential: CredentialPayload;
  }
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { credentials, credential, ...rest } = appIntegration;
  return rest;
};

// here I will fetch the page json file.
export const getCachedResults = async (
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

    return eventBusyDates.map((a: object) => ({ ...a, source: `${appId}` }));
  });
  const awaitedResults = await Promise.all(results);
  performance.mark("getBusyCalendarTimesEnd");
  performance.measure(
    `getBusyCalendarTimes took $1 for creds ${calendarCredentials.map((cred) => cred.id)}`,
    "getBusyCalendarTimesStart",
    "getBusyCalendarTimesEnd"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return awaitedResults as any;
};

/**
 * Get months between given dates
 * @returns ["2023-04", "2024-05"]
 */
const getMonths = (dateFrom: string, dateTo: string): string[] => {
  const months: string[] = [dayjs(dateFrom).format("YYYY-MM")];
  for (
    let i = 1;
    dayjs(dateFrom).add(i, "month").isBefore(dateTo) ||
    dayjs(dateFrom).add(i, "month").isSame(dateTo, "month");
    i++
  ) {
    months.push(dayjs(dateFrom).add(i, "month").format("YYYY-MM"));
  }
  return months;
};

export const getBusyCalendarTimes = async (
  username: string,
  withCredentials: CredentialPayload[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  let results: EventBusyDate[][] = [];
  // const months = getMonths(dateFrom, dateTo);
  try {
    // Subtract 11 hours from the start date to avoid problems in UTC- time zones.
    const startDate = dayjs(dateFrom).subtract(11, "hours").format();
    // Add 14 hours from the start date to avoid problems in UTC+ time zones.
    const endDate = dayjs(dateTo).endOf("month").add(14, "hours").format();
    results = await getCalendarsEvents(withCredentials, startDate, endDate, selectedCalendars);
  } catch (e) {
    log.warn(safeStringify(e));
  }
  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  externalId?: string
): Promise<EventResult<NewCalendarEventType>> => {
  const uid: string = getUid(calEvent);
  const calendar = await getCalendar(credential);
  let success = true;
  let calError: string | undefined = undefined;

  log.debug(
    "Creating calendar event",
    safeStringify({
      calEvent: getPiiFreeCalendarEvent(calEvent),
    })
  );
  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.additionalNotes = "Notes have been hidden by the organizer"; // TODO: i18n this string?
  }

  // TODO: Surface success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar
        .createEvent(calEvent, credential.id)
        .catch(async (error: { code: number; calError: string }) => {
          success = false;
          /**
           * There is a time when selectedCalendar externalId doesn't match witch certain credential
           * so google returns 404.
           * */
          if (error?.code === 404) {
            return undefined;
          }
          if (error?.calError) {
            calError = error.calError;
          }
          log.error(
            "createEvent failed",
            safeStringify({ error, calEvent: getPiiFreeCalendarEvent(calEvent) })
          );
          // @TODO: This code will be off till we can investigate an error with it
          //https://github.com/calcom/cal.com/issues/3949
          // await sendBrokenIntegrationEmail(calEvent, "calendar");
          return undefined;
        })
    : undefined;
  if (!creationResult) {
    logger.error(
      "createEvent failed",
      safeStringify({
        success,
        uid,
        creationResult,
        originalEvent: getPiiFreeCalendarEvent(calEvent),
        calError,
      })
    );
  }
  log.debug(
    "Created calendar event",
    safeStringify({
      calEvent: getPiiFreeCalendarEvent(calEvent),
      creationResult,
    })
  );
  return {
    appName: credential.appId || "",
    type: credential.type,
    success,
    uid,
    iCalUID: creationResult?.iCalUID || undefined,
    createdEvent: creationResult,
    originalEvent: calEvent,
    calError,
    calWarnings: creationResult?.additionalInfo?.calWarnings || [],
    externalId,
    credentialId: credential.id,
  };
};

export const updateEvent = async (
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  bookingRefUid: string | null,
  externalCalendarId: string | null
): Promise<EventResult<NewCalendarEventType>> => {
  const uid = getUid(calEvent);
  const calendar = await getCalendar(credential);
  let success = false;
  let calError: string | undefined = undefined;
  let calWarnings: string[] | undefined = [];
  log.debug(
    "Updating calendar event",
    safeStringify({
      bookingRefUid,
      calEvent: getPiiFreeCalendarEvent(calEvent),
    })
  );
  if (bookingRefUid === "") {
    log.error(
      "updateEvent failed",
      "bookingRefUid is empty",
      safeStringify({ calEvent: getPiiFreeCalendarEvent(calEvent) })
    );
  }
  const updatedResult: NewCalendarEventType | NewCalendarEventType[] | undefined =
    calendar && bookingRefUid
      ? await calendar
          .updateEvent(bookingRefUid, calEvent, externalCalendarId)
          .then((event: NewCalendarEventType | NewCalendarEventType[]) => {
            success = true;
            return event;
          })
          .catch(async (e: { calError: string }) => {
            // @TODO: This code will be off till we can investigate an error with it
            // @see https://github.com/calcom/cal.com/issues/3949
            // await sendBrokenIntegrationEmail(calEvent, "calendar");
            log.error(
              "updateEvent failed",
              safeStringify({ e, calEvent: getPiiFreeCalendarEvent(calEvent) })
            );
            if (e?.calError) {
              calError = e.calError;
            }
            return undefined;
          })
      : undefined;

  if (!updatedResult) {
    logger.error(
      "updateEvent failed",
      safeStringify({
        success,
        bookingRefUid,
        credential: getPiiFreeCredential(credential),
        originalEvent: getPiiFreeCalendarEvent(calEvent),
        calError,
      })
    );
  }

  if (Array.isArray(updatedResult)) {
    calWarnings = updatedResult.flatMap((res) => res.additionalInfo?.calWarnings ?? []);
  } else {
    calWarnings = updatedResult?.additionalInfo?.calWarnings || [];
  }

  return {
    appName: credential.appId || "",
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
    calError,
    calWarnings,
  };
};

export const deleteEvent = async ({
  credential,
  bookingRefUid,
  event,
  externalCalendarId,
}: {
  credential: CredentialPayload;
  bookingRefUid: string;
  event: CalendarEvent;
  externalCalendarId?: string | null;
}): Promise<unknown> => {
  const calendar = await getCalendar(credential);
  log.debug(
    "Deleting calendar event",
    safeStringify({
      bookingRefUid,
      event: getPiiFreeCalendarEvent(event),
    })
  );
  if (calendar) {
    return calendar.deleteEvent(bookingRefUid, event, externalCalendarId);
  } else {
    log.error(
      "Could not do deleteEvent - No calendar adapter found",
      safeStringify({
        credential: getPiiFreeCredential(credential),
        event,
      })
    );
  }

  return Promise.resolve({});
};
