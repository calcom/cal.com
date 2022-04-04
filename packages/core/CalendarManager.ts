import { Credential, SelectedCalendar } from "@prisma/client";
import _ from "lodash";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import getApps from "@calcom/app-store/utils";
import { getUid } from "@calcom/lib/CalEventParser";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import notEmpty from "@calcom/lib/notEmpty";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

/** TODO: Remove once all references are updated to app-store */
export { getCalendar };

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
            primary: cal.primary || null,
            isSelected: selectedCalendars.some((selected) => selected.externalId === cal.externalId),
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

export const getBusyCalendarTimes = async (
  withCredentials: Credential[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  const calendars = withCredentials
    .filter((credential) => credential.type.endsWith("_calendar"))
    .map((credential) => getCalendar(credential))
    .filter(notEmpty);

  let results: EventBusyDate[][] = [];
  try {
    results = await Promise.all(calendars.map((c) => c.getAvailability(dateFrom, dateTo, selectedCalendars)));
  } catch (error) {
    log.warn(error);
  }

  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (credential: Credential, calEvent: CalendarEvent): Promise<EventResult> => {
  const uid: string = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;

  // Check if the disabledNotes flag is set to true
  if (calEvent.hideCalendarNotes) {
    calEvent.description = "Notes have been hidden by the organiser"; // TODO: i18n this string?
  }

  const creationResult = calendar
    ? await calendar.createEvent(calEvent).catch((e) => {
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
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid = getUid(calEvent);
  const calendar = getCalendar(credential);
  let success = true;

  const updatedResult =
    calendar && bookingRefUid
      ? await calendar.updateEvent(bookingRefUid, calEvent).catch((e) => {
          log.error("updateEvent failed", e, calEvent);
          success = false;
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
