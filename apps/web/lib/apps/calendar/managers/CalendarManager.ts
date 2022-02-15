import { Credential, SelectedCalendar } from "@prisma/client";
import _ from "lodash";

import { getUid } from "@lib/CalEventParser";
import { getErrorFromUnknown } from "@lib/errors";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";
import notEmpty from "@lib/notEmpty";

import AppleCalendarService from "../../apple_calendar/services/CalendarService";
import CalDavCalendarService from "../../caldav_calendar/services/CalendarService";
import GoogleCalendarService from "../../google_calendar/services/CalendarService";
import Office365CalendarService from "../../office365_calendar/services/CalendarService";
import { APPS } from "../config";
import { APPS_TYPES } from "../constants/general";
import { Calendar, CalendarEvent } from "../interfaces/Calendar";
import { CalendarServiceType, EventBusyDate } from "../types/CalendarTypes";

const CALENDARS: Record<string, CalendarServiceType> = {
  [APPS_TYPES.apple]: AppleCalendarService,
  [APPS_TYPES.caldav]: CalDavCalendarService,
  [APPS_TYPES.google]: GoogleCalendarService,
  [APPS_TYPES.office365]: Office365CalendarService,
};

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendar = (credential: Credential): Calendar | null => {
  const { type: calendarType } = credential;

  const calendar = CALENDARS[calendarType];
  if (!calendar) {
    log.warn(`calendar of type ${calendarType} does not implemented`);
    return null;
  }

  return new calendar(credential);
};

export const getCalendarCredentials = (credentials: Array<Omit<Credential, "userId">>, userId: number) => {
  const calendarCredentials = credentials
    .filter((credential) => credential.type.endsWith("_calendar"))
    .flatMap((credential) => {
      const integration = APPS[credential.type];

      const calendar = getCalendar({
        ...credential,
        userId,
      });
      return integration && calendar && integration.variant === "calendar"
        ? [{ integration, credential, calendar }]
        : [];
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
