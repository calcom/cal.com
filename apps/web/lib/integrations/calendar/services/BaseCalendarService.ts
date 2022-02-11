import { Credential, Prisma } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import ICAL from "ical.js";
import { createEvent } from "ics";
import {
  createAccount,
  createCalendarObject,
  DAVAccount,
  deleteCalendarObject,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
  updateCalendarObject,
} from "tsdav";
import { v4 as uuidv4 } from "uuid";

import { getLocation, getRichDescription } from "@lib/CalEventParser";
import { symmetricDecrypt } from "@lib/crypto";
import type { Event } from "@lib/events/EventManager";
import logger from "@lib/logger";

import { TIMEZONE_FORMAT } from "../constants/formats";
import { CALDAV_CALENDAR_TYPE } from "../constants/generals";
import { CalendarEventType, EventBusyDate, NewCalendarEventType } from "../constants/types";
import { Calendar, CalendarEvent, IntegrationCalendar } from "../interfaces/Calendar";
import { convertDate, getAttendees, getDuration } from "../utils/CalendarUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

export default abstract class BaseCalendarService implements Calendar {
  private url = "";
  private credentials: Record<string, string> = {};
  private headers: Record<string, string> = {};
  protected integrationName = "";
  private log: typeof logger;

  constructor(credential: Credential, integrationName: string, url?: string) {
    this.integrationName = integrationName;

    const {
      username,
      password,
      url: credentialURL,
    } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));

    this.url = url || credentialURL;

    this.credentials = { username, password };
    this.headers = getBasicAuthHeaders({ username, password });

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars(event);

      const uid = uuidv4();

      // We create local ICS files
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: convertDate(event.startTime),
        duration: getDuration(event.startTime, event.endTime),
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        /** according to https://datatracker.ietf.org/doc/html/rfc2446#section-3.2.1, in a published iCalendar component.
         * "Attendees" MUST NOT be present
         * `attendees: this.getAttendees(event.attendees),`
         */
      });

      if (error || !iCalString) throw new Error("Error creating iCalString");

      // We create the event directly on iCal
      const responses = await Promise.all(
        calendars
          .filter((c) =>
            event.destinationCalendar?.externalId
              ? c.externalId === event.destinationCalendar.externalId
              : true
          )
          .map((calendar) =>
            createCalendarObject({
              calendar: {
                url: calendar.externalId,
              },
              filename: `${uid}.ics`,
              // according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1, Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property.
              iCalString: iCalString.replace(/METHOD:[^\r\n]+\r\n/g, ""),
              headers: this.headers,
            })
          )
      );

      if (responses.some((r) => !r.ok)) {
        throw new Error(
          `Error creating event: ${(await Promise.all(responses.map((r) => r.text()))).join(", ")}`
        );
      }

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

  async updateEvent(uid: string, event: CalendarEvent) {
    try {
      const events = await this.getEventsByUID(uid);

      /** We generate the ICS files */
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: convertDate(event.startTime),
        duration: getDuration(event.startTime, event.endTime),
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: getAttendees(event.attendees),
      });

      if (error) {
        this.log.debug("Error creating iCalString");

        return {
          type: event.type,
          id: typeof event.uid === "string" ? event.uid : "-1",
          password: "",
          url: typeof event.location === "string" ? event.location : "-1",
        };
      }

      const eventsToUpdate = events.filter((e) => e.uid === uid);

      return Promise.all(
        eventsToUpdate.map((e) => {
          return updateCalendarObject({
            calendarObject: {
              url: e.url,
              data: iCalString,
              etag: e?.etag,
            },
            headers: this.headers,
          });
        })
      ).then((p) => p.map((r) => r.json() as unknown as Event));
    } catch (reason) {
      this.log.error(reason);

      throw reason;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      const events = await this.getEventsByUID(uid);

      const eventsToDelete = events.filter((event) => event.uid === uid);

      await Promise.all(
        eventsToDelete.map((event) => {
          return deleteCalendarObject({
            calendarObject: {
              url: event.url,
              etag: event?.etag,
            },
            headers: this.headers,
          });
        })
      );
    } catch (reason) {
      this.log.error(reason);

      throw reason;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const objects = (
      await Promise.all(
        selectedCalendars
          .filter((sc) => ["caldav_calendar", "apple_calendar"].includes(sc.integration ?? ""))
          .map((sc) =>
            fetchCalendarObjects({
              calendar: {
                url: sc.externalId,
              },
              headers: this.headers,
              expand: true,
              timeRange: {
                start: new Date(dateFrom).toISOString(),
                end: new Date(dateTo).toISOString(),
              },
            })
          )
      )
    ).flat();

    const events = objects
      .filter((e) => !!e.data)
      .map((object) => {
        const jcalData = ICAL.parse(object.data);
        const vcalendar = new ICAL.Component(jcalData);
        const vevent = vcalendar.getFirstSubcomponent("vevent");
        const event = new ICAL.Event(vevent);

        return {
          start: event.startDate.toJSDate().toISOString(),
          end: event.endDate.toJSDate().toISOString(),
        };
      });

    return Promise.resolve(events);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount();

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      });

      return calendars.reduce<IntegrationCalendar[]>((newCalendars, calendar) => {
        if (!calendar.components?.includes("VEVENT")) return newCalendars;

        newCalendars.push({
          externalId: calendar.url,
          name: calendar.displayName ?? "",
          primary: event?.destinationCalendar?.externalId
            ? event.destinationCalendar.externalId === calendar.url
            : false,
          integration: this.integrationName,
        });
        return newCalendars;
      }, []);
    } catch (reason) {
      logger.error(reason);

      throw reason;
    }
  }

  private async getEvents(
    calId: string,
    dateFrom: string | null,
    dateTo: string | null,
    objectUrls?: string[] | null
  ) {
    try {
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calId,
        },
        objectUrls: objectUrls ? objectUrls : undefined,
        timeRange:
          dateFrom && dateTo
            ? {
                start: dayjs(dateFrom).utc().format(TIMEZONE_FORMAT),
                end: dayjs(dateTo).utc().format(TIMEZONE_FORMAT),
              }
            : undefined,
        headers: this.headers,
      });

      const events = objects
        .filter((e) => !!e.data)
        .map((object) => {
          const jcalData = ICAL.parse(object.data);

          const vcalendar = new ICAL.Component(jcalData);

          const vevent = vcalendar.getFirstSubcomponent("vevent");
          const event = new ICAL.Event(vevent);

          const calendarTimezone =
            vcalendar.getFirstSubcomponent("vtimezone")?.getFirstPropertyValue("tzid") || "";

          const startDate = calendarTimezone
            ? dayjs.tz(event.startDate.toString(), calendarTimezone)
            : new Date(event.startDate.toUnixTime() * 1000);

          const endDate = calendarTimezone
            ? dayjs.tz(event.endDate.toString(), calendarTimezone)
            : new Date(event.endDate.toUnixTime() * 1000);

          return {
            uid: event.uid,
            etag: object.etag,
            url: object.url,
            summary: event.summary,
            description: event.description,
            location: event.location,
            sequence: event.sequence,
            startDate,
            endDate,
            duration: {
              weeks: event.duration.weeks,
              days: event.duration.days,
              hours: event.duration.hours,
              minutes: event.duration.minutes,
              seconds: event.duration.seconds,
              isNegative: event.duration.isNegative,
            },
            organizer: event.organizer,
            attendees: event.attendees.map((a) => a.getValues()),
            recurrenceId: event.recurrenceId,
            timezone: calendarTimezone,
          };
        });

      return events;
    } catch (reason) {
      console.error(reason);
      throw reason;
    }
  }

  private async getEventsByUID(uid: string): Promise<CalendarEventType[]> {
    const events: Prisma.PromiseReturnType<typeof this.getEvents> = [];
    const calendars = await this.listCalendars();

    for (const cal of calendars) {
      const calEvents = await this.getEvents(cal.externalId, null, null, [`${cal.externalId}${uid}.ics`]);

      for (const ev of calEvents) {
        events.push(ev);
      }
    }

    return events;
  }

  private async getAccount(): Promise<DAVAccount> {
    return createAccount({
      account: {
        serverUrl: this.url,
        accountType: CALDAV_CALENDAR_TYPE,
        credentials: this.credentials,
      },
      headers: this.headers,
    });
  }
}
