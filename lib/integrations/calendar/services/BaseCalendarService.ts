import { Credential } from "@prisma/client";
import dayjs from "dayjs";
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
import logger from "@lib/logger";

import {
  DEFAULT_CALENDAR_INTEGRATION_NAME,
  DEFAULT_PASSWORD,
  DEFAULT_URL,
  DEFAULT_CALENDAR_DISPLAY_NAME,
  DEFAULT_TIMEZONE,
} from "../constants/defaults";
import { TIMEZONE_FORMAT } from "../constants/formats";
import {
  CALDAV_CALENDAR_TYPE,
  TZID_CALENDAR_PROPERTY,
  UTC_TIMEZONE_TYPE,
  VEVENT_CALENDAR_COMPONENT,
  VTIMEZONE_CALENDAR_COMPONENT,
} from "../constants/generals";
import { CalendarEventType, EventBusyDate, NewCalendarEventType } from "../constants/types";
import { Calendar, CalendarEvent, IntegrationCalendar } from "../interfaces/Calendar";
import { convertDate, getAttendees, getDuration } from "../utils/CalendarUtils";

const { CALENDSO_ENCRYPTION_KEY = "" } = process.env;

export default abstract class BaseCalendarService implements Calendar {
  private url: string;
  private credentials: Record<string, string>;
  private headers: Record<string, string>;
  protected integrationName = DEFAULT_CALENDAR_INTEGRATION_NAME;

  log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

  constructor(credential: Credential, integrationName: string, url?: string) {
    const {
      username,
      password,
      url: credentialURL,
    } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));

    this.url = url || credentialURL;
    this.integrationName = integrationName;
    this.credentials = { username, password };
    this.headers = getBasicAuthHeaders({ username, password });
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
              /** according to https://datatracker.ietf.org/doc/html/rfc4791#section-4.1,
               * Calendar object resources contained in calendar collections MUST NOT specify the iCalendar METHOD property. */
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
        password: DEFAULT_PASSWORD,
        url: DEFAULT_URL,
        additionalInfo: {},
      };
    } catch (reason) {
      logger.error(reason);

      throw reason;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    try {
      const events = await this.getEventsByUID(uid);

      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: UTC_TIMEZONE_TYPE,
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

        return {};
      }

      const eventsToUpdate = events.filter((event) => event.uid === uid);

      return Promise.all(
        eventsToUpdate.map((event) => {
          return updateCalendarObject({
            calendarObject: {
              url: event.url,
              data: iCalString,
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

  async deleteEvent(uid: string): Promise<any> {
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

  getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    this.log.info(`dateFrom: ${dateFrom}, dateTo: ${dateTo}, selectedCalendars: ${selectedCalendars}`);

    throw new Error("Method not implemented.");
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount();

      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      });

      return calendars.reduce<IntegrationCalendar[]>((newCalendars, calendar) => {
        if (!calendar.components?.includes(VEVENT_CALENDAR_COMPONENT)) return newCalendars;

        newCalendars.push({
          externalId: calendar.url,
          name: calendar.displayName ?? DEFAULT_CALENDAR_DISPLAY_NAME,
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

          const vevent = vcalendar.getFirstSubcomponent(VEVENT_CALENDAR_COMPONENT.toLowerCase());
          const event = new ICAL.Event(vevent);

          const calendarTimezone =
            vcalendar
              .getFirstSubcomponent(VTIMEZONE_CALENDAR_COMPONENT)
              ?.getFirstPropertyValue(TZID_CALENDAR_PROPERTY) || DEFAULT_TIMEZONE;

          const startDate = calendarTimezone
            ? dayjs(event.startDate.toJSDate()).tz(calendarTimezone)
            : new Date(event.startDate.toUnixTime() * 1000);

          const endDate = calendarTimezone
            ? dayjs(event.endDate.toJSDate()).tz(calendarTimezone)
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
    const events = [];

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
