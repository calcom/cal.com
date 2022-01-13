import { InstalledApp, SelectedCalendar } from "@prisma/client";
import _ from "lodash";

import { getUid } from "@lib/CalEventParser";
import { getErrorFromUnknown } from "@lib/errors";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";
import notEmpty from "@lib/notEmpty";

import { ALL_INTEGRATIONS } from "../getIntegrations";
import { CALENDAR_INTEGRATIONS_TYPES } from "./constants/generals";
import { CalendarServiceType, EventBusyDate } from "./constants/types";
import { Calendar, CalendarEvent } from "./interfaces/Calendar";
import AppleCalendarService from "./services/AppleCalendarService";
import CalDavCalendarService from "./services/CalDavCalendarService";
import GoogleCalendarService from "./services/GoogleCalendarService";
import Office365CalendarService from "./services/Office365CalendarService";

const CALENDARS: Record<string, CalendarServiceType> = {
  [CALENDAR_INTEGRATIONS_TYPES.apple]: AppleCalendarService,
  [CALENDAR_INTEGRATIONS_TYPES.caldav]: CalDavCalendarService,
  [CALENDAR_INTEGRATIONS_TYPES.google]: GoogleCalendarService,
  [CALENDAR_INTEGRATIONS_TYPES.office365]: Office365CalendarService,
};

const log = logger.getChildLogger({ prefix: ["CalendarManager"] });

export const getCalendar = (installedApp: InstalledApp): Calendar | null => {
  const { type: calendarType } = installedApp;

  const calendar = CALENDARS[calendarType];
  if (!calendar) {
    log.warn(`calendar of type ${calendarType} does not implemented`);
    return null;
  }

  return new calendar(installedApp);
};

export const getCalendarInstalledApps = (
  installedApps: Array<Omit<InstalledApp, "userId">>,
  userId: number
) => {
  const calendarInstalledApps = installedApps
    .filter((installedApp) => installedApp.type.endsWith("_calendar"))
    .flatMap((installedApp) => {
      const integration = ALL_INTEGRATIONS.find((integration) => integration.type === installedApp.type);

      const calendar = getCalendar({
        ...installedApp,
        userId,
      });
      return integration && calendar && integration.variant === "calendar"
        ? [{ integration, installedApp, calendar }]
        : [];
    });

  return calendarInstalledApps;
};

export const getConnectedCalendars = async (
  calendarInstalledApps: ReturnType<typeof getCalendarInstalledApps>,
  selectedCalendars: { externalId: string }[]
) => {
  const connectedCalendars = await Promise.all(
    calendarInstalledApps.map(async (item) => {
      const { calendar, integration, installedApp } = item;

      const installedAppId = installedApp.id;
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
          installedAppId,
          primary,
          calendars,
        };
      } catch (_error) {
        const error = getErrorFromUnknown(_error);
        return {
          integration,
          installedAppId,
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
  installedApps: InstalledApp[],
  dateFrom: string,
  dateTo: string,
  selectedCalendars: SelectedCalendar[]
) => {
  const calendars = installedApps
    .filter((installedApp) => installedApp.type.endsWith("_calendar"))
    .map((installedApp) => getCalendar(installedApp))
    .filter(notEmpty);

  let results: EventBusyDate[][] = [];
  try {
    results = await Promise.all(calendars.map((c) => c.getAvailability(dateFrom, dateTo, selectedCalendars)));
  } catch (error) {
    log.warn(error);
  }

  return results.reduce((acc, availability) => acc.concat(availability), []);
};

export const createEvent = async (
  installedApp: InstalledApp,
  calEvent: CalendarEvent
): Promise<EventResult> => {
  const uid: string = getUid(calEvent);
  const calendar = getCalendar(installedApp);
  let success = true;

  const creationResult = calendar
    ? await calendar.createEvent(calEvent).catch((e) => {
        log.error("createEvent failed", e, calEvent);
        success = false;
        return undefined;
      })
    : undefined;

  return {
    type: installedApp.type,
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

export const updateEvent = async (
  installedApp: InstalledApp,
  calEvent: CalendarEvent,
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid = getUid(calEvent);
  const calendar = getCalendar(installedApp);
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
    type: installedApp.type,
    success,
    uid,
    updatedEvent: updatedResult,
    originalEvent: calEvent,
  };
};

export const deleteEvent = (installedApp: InstalledApp, uid: string): Promise<unknown> => {
  const calendar = getCalendar(installedApp);

  if (calendar) {
    return calendar.deleteEvent(uid, event);
  }

  return Promise.resolve({});
};
