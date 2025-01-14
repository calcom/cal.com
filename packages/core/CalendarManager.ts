// eslint-disable-next-line no-restricted-imports
import { sortBy } from "lodash";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import dayjs from "@calcom/dayjs";
import { getUid } from "@calcom/lib/CalEventParser";
import { CalendarAppDomainWideDelegationError } from "@calcom/lib/CalendarAppError";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
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

type CredentialForCalendarServiceGeneric<T> = T extends null
  ? null
  : T & {
      delegatedTo: {
        serviceAccountKey: {
          client_email: string;
          private_key: string;
          client_id: string;
        };
      } | null;
    };

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

function _buildDelegatedTo({
  domainWideDelegation,
}: {
  domainWideDelegation: {
    serviceAccountKey: ServiceAccountKey | null;
  } | null;
}) {
  if (!domainWideDelegation || !domainWideDelegation.serviceAccountKey) {
    return null;
  }

  return {
    serviceAccountKey: domainWideDelegation.serviceAccountKey,
  };
}

async function _getCredentialsWithAppAndTheirDwdMap(credentials: Array<CredentialPayload>) {
  const calendarApps = getApps(credentials, true).filter((app) => app.type.endsWith("_calendar"));
  const credentialsWithApp = calendarApps.flatMap((app) => {
    return app.credentials.map((credential) => ({
      credential,
      app,
    }));
  });

  const delegatedToIds = _getDwdIds(credentialsWithApp);
  const domainWideDelegations =
    await DomainWideDelegationRepository.findByIdsIncludeSensitiveServiceAccountKey(delegatedToIds);

  const dwdMap = new Map(domainWideDelegations.map((d) => [d.id, d]));

  return {
    credentialsWithApp,
    dwdMap,
  };

  function _getDwdIds(_credentialsWithApp: typeof credentialsWithApp) {
    return Array.from(
      new Set(
        credentialsWithApp
          .filter(
            (
              credentialWithApp
            ): credentialWithApp is typeof credentialWithApp & {
              credential: typeof credentialWithApp.credential & { delegatedToId: string };
            } => !!credentialWithApp.credential.delegatedToId
          )
          .map(({ credential }) => credential.delegatedToId)
      )
    );
  }
}

/**
 * CalendarService needs delegatedTo to have serviceAccountKey for DWD Credential. It fetches that.
 */
export async function getCredentialForCalendarService<
  T extends ({ delegatedToId?: string | null } & Record<string, unknown>) | null
>(credential: T): Promise<CredentialForCalendarServiceGeneric<T>> {
  // Explicitly handle null case with type assertion
  if (credential === null) return null as CredentialForCalendarServiceGeneric<T>;

  // When no delegatedToId, return with delegatedTo as null
  if (!credential.delegatedToId) {
    return {
      ...credential,
      delegatedTo: null,
    } as CredentialForCalendarServiceGeneric<T>;
  }
  const domainWideDelegation = await DomainWideDelegationRepository.findByIdIncludeSensitiveServiceAccountKey(
    {
      id: credential.delegatedToId,
    }
  );

  const delegatedTo = _buildDelegatedTo({
    domainWideDelegation,
  });

  return {
    ...credential,
    delegatedTo,
  } as CredentialForCalendarServiceGeneric<T>;
}

// TODO: Should unit test it.
export const getCalendarCredentials = async (credentials: Array<CredentialPayload>) => {
  const { credentialsWithApp, dwdMap } = await _getCredentialsWithAppAndTheirDwdMap(credentials);

  const calendarCredentials = credentialsWithApp.flatMap(({ credential, app }) => {
    const domainWideDelegation = credential.delegatedToId
      ? dwdMap.get(credential.delegatedToId) || null
      : null;

    const credentialForCalendarService = {
      ...credential,
      delegatedTo: _buildDelegatedTo({
        domainWideDelegation,
      }),
    };

    const calendar = getCalendar(credentialForCalendarService);
    return app.variant === "calendar"
      ? [{ integration: app, credential: credentialForCalendarService, calendar }]
      : [];
  });

  return calendarCredentials;
};

export const getConnectedCalendars = async (
  calendarCredentials: Awaited<ReturnType<typeof getCalendarCredentials>>,
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
        const domainWideDelegationCredentialId = credential.delegatedToId ?? null;
        if (!calendar) {
          return {
            integration,
            credentialId,
            domainWideDelegationCredentialId,
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
              domainWideDelegationCredentialId,
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
          domainWideDelegationCredentialId,
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

        if (error instanceof CalendarAppDomainWideDelegationError) {
          errorMessage = error.message;
        }

        log.error("getConnectedCalendars failed", safeStringify(error), safeStringify({ item }));

        return {
          integration: cleanIntegrationKeys(item.integration),
          credentialId: item.credential.id,
          domainWideDelegationCredentialId: item.credential.delegatedToId,
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
   * withCredentials can possibly have a duplicate credential in case DWD is enabled.
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
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  externalId?: string
): Promise<EventResult<NewCalendarEventType>> => {
  const uid: string = getUid(calEvent);
  const credentialForCalendarService = await getCredentialForCalendarService(credential);
  const calendar = await getCalendar(credentialForCalendarService);
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

  const externalCalendarIdWhenDwdCredentialIsChosen = credential.delegatedToId ? externalId : undefined;

  // TODO: Surface success/error messages coming from apps to improve end user visibility
  const creationResult = calendar
    ? await calendar
        // Ideally we should pass externalId always, but let's start with DWD case first as in that case, CalendarService need to handle a special case for DWD to determine the selectedCalendar.
        // Such logic shouldn't exist in CalendarService as it would be same for all calendar apps.
        .createEvent(calEvent, credential.id, externalCalendarIdWhenDwdCredentialIsChosen)
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
  credential: CredentialPayload,
  calEvent: CalendarEvent,
  bookingRefUid: string | null,
  externalCalendarId: string | null
): Promise<EventResult<NewCalendarEventType>> => {
  const uid = getUid(calEvent);
  const credentialForCalendarService = await getCredentialForCalendarService(credential);
  const calendar = await getCalendar(credentialForCalendarService);
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
  const credentialForCalendarService = await getCredentialForCalendarService(credential);
  const calendar = await getCalendar(credentialForCalendarService);
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
