import type { SelectedCalendar } from "@prisma/client";
import { sortBy } from "lodash";
import * as process from "process";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload, CredentialWithAppName } from "@calcom/types/Credential";
import type { EventResult } from "@calcom/types/EventManager";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendarCredentials = (credentials: Array<CredentialPayload>) => {
  const calendarCredentials = getApps(credentials)
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
        const { calendar, integration, credential } = item;

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
          cals.map((cal) => {
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
  const calendars = calendarCredentials.map((credential) => getCalendar(credential));
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

/**
 * This function fetch the json file that NextJS generates and uses to hydrate the static page on browser.
 * If for some reason NextJS still doesn't generate this file, it will wait until it finishes generating it.
 * On development environment it takes a long time because Next must compiles the whole page.
 * @param username
 * @param month A string representing year and month using YYYY-MM format
 */
const getNextCache = async (username: string, month: string): Promise<EventBusyDate[][]> => {
  let localCache: EventBusyDate[][] = [];
  try {
    const { NODE_ENV } = process.env;
    const cacheDir = `${NODE_ENV === "development" ? NODE_ENV : process.env.BUILD_ID}`;
    const baseUrl = `${WEBAPP_URL}/_next/data/${cacheDir}/en`;
    console.log(`${baseUrl}/${username}/calendar-cache/${month}.json?user=${username}&month=${month}`);
    localCache = await fetch(
      `${baseUrl}/${username}/calendar-cache/${month}.json?user=${username}&month=${month}`
    )
      .then((r) => r.json())
      .then((json) => json?.pageProps?.results);
  } catch (e) {
    log.warn(e);
  }
  return localCache;
};

export const getBusyCalendarTimes = async (
  username: string,
  withCredentials: CredentialPayload[],
  dateFrom: string,
  dateTo: string
) => {
  let results: EventBusyDate[][] = [];
  if (dayjs(dateFrom).isSame(dayjs(dateTo), "month")) {
    results = await getNextCache(username, dayjs(dateFrom).format("YYYY-MM"));
  } else {
    // if dateFrom and dateTo is from different months get cache by each month
    const months: string[] = [dayjs(dateFrom).format("YYYY-MM")];
    for (
      let i = 1;
      dayjs(dateFrom).add(i, "month").isBefore(dateTo) ||
      dayjs(dateFrom).add(i, "month").isSame(dateTo, "month");
      i++
    ) {
      months.push(dayjs(dateFrom).add(i, "month").format("YYYY-MM"));
    }
    const data: EventBusyDate[][][] = await Promise.all(months.map((month) => getNextCache(username, month)));
    results = data.flat(1);
  }
  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  credential: CredentialWithAppName,
  calEvent: CalendarEvent
): Promise<EventResult<NewCalendarEventType>> => {
  const uid: string = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;
  let calError: string | undefined = undefined;

  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.additionalNotes = "Notes have been hidden by the organiser"; // TODO: i18n this string?
  }

  // TODO: Surface success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar.createEvent(calEvent).catch(async (error) => {
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
        log.error("createEvent failed", error, calEvent);
        // @TODO: This code will be off till we can investigate an error with it
        //https://github.com/calcom/cal.com/issues/3949
        // await sendBrokenIntegrationEmail(calEvent, "calendar");
        return undefined;
      })
    : undefined;

  return {
    appName: credential.appName,
    type: credential.type,
    success,
    uid,
    iCalUID: creationResult?.iCalUID || undefined,
    createdEvent: creationResult,
    originalEvent: calEvent,
    calError,
    calWarnings: creationResult?.additionalInfo?.calWarnings || [],
  };
};

export const updateEvent = async (
  credential: CredentialWithAppName,
  calEvent: CalendarEvent,
  bookingRefUid: string | null,
  externalCalendarId: string | null
): Promise<EventResult<NewCalendarEventType>> => {
  const uid = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = false;
  let calError: string | undefined = undefined;
  let calWarnings: string[] | undefined = [];

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
            // @TODO: This code will be off till we can investigate an error with it
            // @see https://github.com/calcom/cal.com/issues/3949
            // await sendBrokenIntegrationEmail(calEvent, "calendar");
            log.error("updateEvent failed", e, calEvent);
            if (e?.calError) {
              calError = e.calError;
            }
            return undefined;
          })
      : undefined;

  if (Array.isArray(updatedResult)) {
    calWarnings = updatedResult.flatMap((res) => res.additionalInfo?.calWarnings ?? []);
  } else {
    calWarnings = updatedResult?.additionalInfo?.calWarnings || [];
  }

  return {
    appName: credential.appName,
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
    calError,
    calWarnings,
  };
};

export const deleteEvent = (
  credential: CredentialPayload,
  uid: string,
  event: CalendarEvent
): Promise<unknown> => {
  const calendar = getCalendar(credential);
  if (calendar) {
    return calendar.deleteEvent(uid, event);
  }

  return Promise.resolve({});
};
