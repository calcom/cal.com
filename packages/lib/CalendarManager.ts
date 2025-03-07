// eslint-disable-next-line no-restricted-imports
import { sortBy } from "lodash";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import { CalendarAppDelegationCredentialError } from "@calcom/lib/CalendarAppError";
import { buildNonDelegationCredentials } from "@calcom/lib/delegationCredential/clientAndServer";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type {
  CalendarEvent,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  SelectedCalendar,
} from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { EventResult } from "@calcom/types/EventManager";

import getCalendarsEvents from "./getCalendarsEvents";
import { getCalendarsEventsWithTimezones } from "./getCalendarsEvents";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

export const getCalendarCredentials = (credentials: Array<CredentialForCalendarService>) => {
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

export const getCalendarCredentialsWithoutDelegation = (credentials: CredentialPayload[]) => {
  return getCalendarCredentials(buildNonDelegationCredentials(credentials));
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
        const delegationCredentialId = credential.delegatedToId ?? null;
        if (!calendar) {
          return {
            integration,
            credentialId,
            delegationCredentialId,
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
              delegationCredentialId,
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
          delegationCredentialId,
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

        if (error instanceof CalendarAppDelegationCredentialError) {
          errorMessage = error.message;
        }

        log.error("getConnectedCalendars failed", safeStringify(error), safeStringify({ item }));

        return {
          integration: cleanIntegrationKeys(item.integration),
          credentialId: item.credential.id,
          delegationCredentialId: item.credential.delegatedToId,
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
  appIntegration: Awaited<ReturnType<typeof getCalendarCredentials>>[number]["integration"] & {
    credentials?: Array<CredentialPayload>;
    credential: CredentialPayload;
  }
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { credentials, credential, ...rest } = appIntegration;
  return rest;
};

export const getBusyCalendarTimes = async (
  /**
   * withCredentials can possibly have a duplicate credential in case DelegationCredential is enabled.
   * There is no way to deduplicate that at the moment because a `credential` doesn't directly know for which email it is,
   */
  withCredentials: CredentialForCalendarService[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[],
  shouldServeCache?: boolean,
  includeTimeZone?: boolean
) => {
  let results: (EventBusyDate & { timeZone?: string })[][] = [];
  // const months = getMonths(dateFrom, dateTo);
  try {
    // Subtract 11 hours from the start date to avoid problems in UTC- time zones.
    const startDate = dayjs(dateFrom).subtract(11, "hours").format();
    // Add 14 hours from the start date to avoid problems in UTC+ time zones.
    const endDate = dayjs(dateTo).endOf("month").add(14, "hours").format();

    if (includeTimeZone) {
      results = await getCalendarsEventsWithTimezones(withCredentials, startDate, endDate, selectedCalendars);
    } else {
      results = await getCalendarsEvents(
        withCredentials,
        startDate,
        endDate,
        selectedCalendars,
        shouldServeCache
      );
    }
  } catch (e) {
    log.warn(safeStringify(e));
  }
  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  credential: CredentialForCalendarService,
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

  const externalCalendarIdWhenDelegationCredentialIsChosen = credential.delegatedToId
    ? externalId
    : undefined;

  // TODO: Surface success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar
        // Ideally we should pass externalId always, but let's start with DelegationCredential case first as in that case, CalendarService need to handle a special case for DelegationCredential to determine the selectedCalendar.
        // Such logic shouldn't exist in CalendarService as it would be same for all calendar apps.
        .createEvent(calEvent, credential.id, externalCalendarIdWhenDelegationCredentialIsChosen)
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
            safeStringify(error),
            safeStringify({ calEvent: getPiiFreeCalendarEvent(calEvent) })
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
    delegatedToId: credential.delegatedToId ?? undefined,
  };
};

export const updateEvent = async (
  credential: CredentialForCalendarService,
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
  credential: CredentialForCalendarService;
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
