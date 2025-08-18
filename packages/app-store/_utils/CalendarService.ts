/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../types/ical.d.ts"/>
import type { Prisma } from "@prisma/client";
import ICAL from "ical.js";
import type { Attendee, DateArray, DurationObject } from "ics";
import { createEvent } from "ics";
import type { DAVAccount, DAVCalendar, DAVObject } from "tsdav";
import {
  createAccount,
  createCalendarObject,
  deleteCalendarObject,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
  updateCalendarObject,
} from "tsdav";
import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import sanitizeCalendarObject from "@calcom/lib/sanitizeCalendarObject";
import type { Person as AttendeeInCalendarEvent } from "@calcom/types/Calendar";
import type {
  Calendar,
  CalendarServiceEvent,
  CalendarEvent,
  CalendarEventType,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
  TeamMember,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getLocation, getRichDescription } from "../../lib/CalEventParser.js";
import { symmetricDecrypt } from "../../lib/crypto.js";
import logger from "../../lib/logger.js";

const TIMEZONE_FORMAT = "YYYY-MM-DDTHH:mm:ss[Z]";
const DEFAULT_CALENDAR_TYPE = "caldav";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

type FetchObjectsWithOptionalExpandOptionsType = {
  selectedCalendars: IntegrationCalendar[];
  startISOString: string;
  dateTo: string;
  headers?: Record<string, string>;
};

function hasFileExtension(url: string): boolean {
  const path = new URL(url).pathname;
  const fileName = path.split("/").pop();
  return fileName ? fileName.includes(".") : false;
}

export default class CalendarService implements Calendar {
  private url = "";
  private credentials: DAVAccount | null = null;
  private headers: Record<string, string> = {};
  private integrationName = "";
  private readonly isFixedCredentials = false;

  constructor(credential: CredentialPayload, integrationName: string, url?: string) {
    this.integrationName = integrationName;

    const { url: credentialURL, username, password } = JSON.parse(
      symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY)
    );

    this.url = url || credentialURL;

    this.credentials = {
      serverUrl: this.url,
      credentials: {
        username,
        password,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    };

    this.headers = getBasicAuthHeaders({
      username,
      password,
    });
  }

  convertDate(date: string): DateArray {
    return dayjs(date)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;
  }

  getDuration(start: string, end: string): DurationObject {
    const startDate = dayjs(start);
    const endDate = dayjs(end);

    // If start and end are on different days, we bail on duration and go with
    // the default.
    if (!startDate.isSame(endDate, "day")) {
      const hours = endDate.diff(startDate, "hour");
      return { hours };
    }

    const diff = endDate.diff(startDate);
    const duration = dayjs.duration(diff);

    return { hours: duration.hours(), minutes: duration.minutes() };
  }

  async createEvent(event: CalendarEvent, credentialId: number): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars();
      const uid = uuidv4();

      if (!calendars.length) {
        throw new Error("No calendar found");
      }

      const calendar = calendars[0];

      const icsDuration = this.getDuration(event.startTime, event.endTime);
      const icsAttendees: Attendee[] = event.attendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        rsvp: true,
        partstat: "NEEDS-ACTION",
        role: "REQ-PARTICIPANT",
      }));

      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: icsDuration,
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: icsAttendees,
        method: "REQUEST",
        ...{ status: "CONFIRMED" },
      });

      if (error) {
        logger.debug("Error creating iCalString");
        throw new Error("Error creating iCalString");
      }

      if (!iCalString) {
        logger.debug("Error creating iCalString");
        throw new Error("Error creating iCalString");
      }

      await createCalendarObject({
        calendar: {
          url: calendar.externalId,
        },
        iCalString,
        filename: `${uid}.ics`,
        headers: this.headers,
      });

      return {
        uid,
        id: uid,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {},
      };
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  async updateEvent(
    uid: string,
    event: CalendarEvent,
    externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    try {
      const events = await this.getEventsByUID(uid);

      if (!events.length) {
        throw new Error("Event not found");
      }

      const icsDuration = this.getDuration(event.startTime, event.endTime);
      const icsAttendees: Attendee[] = event.attendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        rsvp: true,
        partstat: "NEEDS-ACTION",
        role: "REQ-PARTICIPANT",
      }));

      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: icsDuration,
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: icsAttendees,
        method: "REQUEST",
        ...{ status: "CONFIRMED" },
      });

      if (error) {
        logger.debug("Error creating iCalString");
        return {};
      }

      if (!iCalString) {
        logger.debug("Error creating iCalString");
        return {};
      }

      const davEvent = events[0];

      await updateCalendarObject({
        calendarObject: {
          url: davEvent.url,
          data: iCalString,
          etag: davEvent.etag,
        },
        headers: this.headers,
      });

      return {
        uid,
        id: uid,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {},
      };
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  async deleteEvent(uid: string, event: CalendarEvent, externalCalendarId?: string): Promise<unknown> {
    try {
      const events = await this.getEventsByUID(uid);

      if (!events.length) {
        throw new Error("Event not found");
      }

      const davEvent = events[0];

      await deleteCalendarObject({
        calendarObject: {
          url: davEvent.url,
          etag: davEvent.etag,
        },
        headers: this.headers,
      });
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  private async fetchEventsWithReportParam(
    calendarEventObjectMap: Map<string, IntegrationCalendar>,
    { dateFrom, dateTo }: { dateFrom: string; dateTo: string }
  ) {
    const objects = await fetchCalendarObjects({
      calendar: {
        url: this.url,
      },
      headers: this.headers,
      expand: true,
      reportOptions: {
        start: dayjs(dateFrom).utc().format(TIMEZONE_FORMAT),
        end: dayjs(dateTo).utc().format(TIMEZONE_FORMAT),
      },
    });

    const events: EventBusyDate[] = [];

    objects.forEach((object) => {
      if (object.data && calendarEventObjectMap.size > 0) {
        const calendar = calendarEventObjectMap.get(object.url.split("/").filter(Boolean).slice(-2, -1)[0]);
        if (calendar) {
          let vevent: ICAL.Component | null = null;
          try {
            const vcalendar = new ICAL.Component(ICAL.parse(object.data));
            vevent = vcalendar.getFirstSubcomponent("vevent");
          } catch (reason) {
            logger.error(reason);
            throw reason;
          }

          if (vevent && vevent.getFirstPropertyValue("status") !== "CANCELLED") {
            const event = new ICAL.Event(vevent);
            const dtstart = vevent.getFirstPropertyValue("dtstart");
            const dtend = vevent.getFirstPropertyValue("dtend");
            const startDate = dayjs(dtstart.toJSDate()).utc();
            const endDate = dayjs(dtend.toJSDate()).utc();

            events.push({
              start: startDate.toDate(),
              end: endDate.toDate(),
            });
          }
        }
      }
    });

    return events;
  }

  private async fetchEventsFromEachCalendar(
    calendars: IntegrationCalendar[],
    { dateFrom, dateTo }: { dateFrom: string; dateTo: string }
  ) {
    const calendarPromises = calendars.map(async (calendar) => {
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calendar.externalId,
        },
        expand: true,
        headers: this.headers,
        reportOptions: {
          start: dayjs(dateFrom).utc().format(TIMEZONE_FORMAT),
          end: dayjs(dateTo).utc().format(TIMEZONE_FORMAT),
        },
      });

      const events: EventBusyDate[] = [];

      objects.forEach((object) => {
        if (object.data) {
          let vevent: ICAL.Component | null = null;
          try {
            const vcalendar = new ICAL.Component(ICAL.parse(object.data));
            vevent = vcalendar.getFirstSubcomponent("vevent");
          } catch (reason) {
            logger.error(reason);
            throw reason;
          }

          if (vevent && vevent.getFirstPropertyValue("status") !== "CANCELLED") {
            const event = new ICAL.Event(vevent);
            const dtstart = vevent.getFirstPropertyValue("dtstart");
            const dtend = vevent.getFirstPropertyValue("dtend");
            const startDate = dayjs(dtstart.toJSDate()).utc();
            const endDate = dayjs(dtend.toJSDate()).utc();

            events.push({
              start: startDate.toDate(),
              end: endDate.toDate(),
            });
          }
        }
      });

      return events;
    });

    const allEvents = await Promise.all(calendarPromises);
    return allEvents.flat();
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    try {
      const calendars = await this.listCalendars();
      const filteredCalendars = calendars.filter((calendar) =>
        selectedCalendars.some((selectedCalendar) => selectedCalendar.externalId === calendar.externalId)
      );

      if (filteredCalendars.length === 0) {
        return [];
      }

      // Check if we can use the reportOptions on the root URL
      try {
        const calendarEventObjectMap = new Map<string, IntegrationCalendar>();
        filteredCalendars.forEach((calendar) => {
          const calendarName = calendar.externalId.split("/").filter(Boolean).slice(-1)[0];
          calendarEventObjectMap.set(calendarName, calendar);
        });

        return await this.fetchEventsWithReportParam(calendarEventObjectMap, { dateFrom, dateTo });
      } catch (reason) {
        // If that fails, fetch events from each calendar individually
        return await this.fetchEventsFromEachCalendar(filteredCalendars, { dateFrom, dateTo });
      }
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      if (!this.credentials) {
        throw new Error("No credentials provided");
      }

      const account = await createAccount({
        account: this.credentials,
        headers: this.headers,
      });

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      });

      return calendars.map((cal) => {
        const calendar: IntegrationCalendar = {
          externalId: cal.url,
          name: cal.displayName ?? "",
          primary: cal.displayName === "Personal" || cal.displayName === "Calendar",
          integration: this.integrationName,
        };
        return calendar;
      }) as IntegrationCalendar[];
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  private async getEventsByUID(uid: string): Promise<DAVObject[]> {
    try {
      const calendars = await this.listCalendars();

      if (!calendars.length) {
        throw new Error("No calendar found");
      }

      let events: DAVObject[] = [];

      for (const calendar of calendars) {
        const calendarEvents = await fetchCalendarObjects({
          calendar: {
            url: calendar.externalId,
          },
          objectUrls: [`${uid}.ics`],
          headers: this.headers,
        });

        events = events.concat(calendarEvents);
      }

      return events;
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }
}