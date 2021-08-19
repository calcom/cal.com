import { IntegrationCalendar, CalendarApiAdapter, CalendarEvent } from "../../calendarClient";
import { symmetricDecrypt } from "@lib/crypto";
import {
  createAccount,
  fetchCalendars,
  fetchCalendarObjects,
  getBasicAuthHeaders,
  createCalendarObject,
  updateCalendarObject,
  deleteCalendarObject,
} from "tsdav";
import { Credential } from "@prisma/client";
import ICAL from "ical.js";
import { createEvent, DurationObject, Attendee, Person } from "ics";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { stripHtml } from "../../emails/helpers";
import logger from "@lib/logger";

const log = logger.getChildLogger({ prefix: ["[[lib] caldav"] });

type EventBusyDate = Record<"start" | "end", Date>;

export class CalDavCalendar implements CalendarApiAdapter {
  private url: string;
  private credentials: Record<string, string>;
  private headers: Record<string, string>;
  private readonly integrationName: string = "caldav_calendar";

  constructor(credential: Credential) {
    const decryptedCredential = JSON.parse(
      symmetricDecrypt(credential.key, process.env.CALENDSO_ENCRYPTION_KEY)
    );
    const username = decryptedCredential.username;
    const url = decryptedCredential.url;
    const password = decryptedCredential.password;

    this.url = url;

    this.credentials = {
      username,
      password,
    };

    this.headers = getBasicAuthHeaders({
      username,
      password,
    });
  }

  convertDate(date: string): number[] {
    return dayjs(date)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v));
  }

  getDuration(start: string, end: string): DurationObject {
    return {
      minutes: dayjs(end).diff(dayjs(start), "minute"),
    };
  }

  getAttendees(attendees: Person[]): Attendee[] {
    return attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));
  }

  async createEvent(event: CalendarEvent): Promise<Record<string, unknown>> {
    try {
      const calendars = await this.listCalendars();
      const uid = uuidv4();

      const { error, value: iCalString } = await createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: this.getDuration(event.startTime, event.endTime),
        title: event.title,
        description: stripHtml(event.description ?? ""),
        location: event.location,
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event.attendees),
      });

      if (error) {
        log.debug("Error creating iCalString");
        return {};
      }

      if (!iCalString) {
        log.debug("Error creating iCalString");
        return {};
      }

      await Promise.all(
        calendars.map((calendar) => {
          return createCalendarObject({
            calendar: {
              url: calendar.externalId,
            },
            filename: `${uid}.ics`,
            iCalString: iCalString,
            headers: this.headers,
          });
        })
      );

      return {
        uid,
        id: uid,
      };
    } catch (reason) {
      console.error(reason);
      throw reason;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<unknown> {
    try {
      const calendars = await this.listCalendars();
      const events = [];

      for (const cal of calendars) {
        const calEvents = await this.getEvents(cal.externalId, null, null);

        for (const ev of calEvents) {
          events.push(ev);
        }
      }

      const { error, value: iCalString } = await createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: this.getDuration(event.startTime, event.endTime),
        title: event.title,
        description: stripHtml(event.description ?? ""),
        location: event.location,
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event.attendees),
      });

      if (error) {
        log.debug("Error creating iCalString");
        return {};
      }

      const eventsToUpdate = events.filter((event) => event.uid === uid);

      return await Promise.all(
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
      console.error(reason);
      throw reason;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      const calendars = await this.listCalendars();
      const events = [];

      for (const cal of calendars) {
        const calEvents = await this.getEvents(cal.externalId, null, null);

        for (const ev of calEvents) {
          events.push(ev);
        }
      }

      const eventsToUpdate = events.filter((event) => event.uid === uid);

      await Promise.all(
        eventsToUpdate.map((event) => {
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
      console.error(reason);
      throw reason;
    }
  }

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    try {
      const selectedCalendarIds = selectedCalendars
        .filter((e) => e.integration === this.integrationName)
        .map((e) => e.externalId);

      const events = [];

      for (const calId of selectedCalendarIds) {
        const calEvents = await this.getEvents(calId, dateFrom, dateTo);

        for (const ev of calEvents) {
          events.push({ start: ev.startDate, end: ev.endDate });
        }
      }

      return events;
    } catch (reason) {
      log.error(reason);
      throw reason;
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount();
      const calendars = await fetchCalendars({
        account,
        headers: this.headers,
      });

      return calendars
        .filter((calendar) => {
          return calendar.components?.includes("VEVENT");
        })
        .map((calendar) => ({
          externalId: calendar.url,
          name: calendar.displayName ?? "",
          primary: false,
          integration: this.integrationName,
        }));
    } catch (reason) {
      console.error(reason);
      throw reason;
    }
  }

  async getEvents(calId: string, dateFrom: string | null, dateTo: string | null): Promise<unknown> {
    try {
      const objects = await fetchCalendarObjects({
        calendar: {
          url: calId,
        },
        timeRange:
          dateFrom && dateTo
            ? {
                start: dayjs(dateFrom).utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                end: dayjs(dateTo).utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
              }
            : undefined,
        headers: this.headers,
      });

      const events =
        objects &&
        objects?.length > 0 &&
        objects
          .map((object) => {
            if (object?.data) {
              const jcalData = ICAL.parse(object.data);
              const vcalendar = new ICAL.Component(jcalData);
              const vevent = vcalendar.getFirstSubcomponent("vevent");
              const event = new ICAL.Event(vevent);

              const calendarTimezone = vcalendar.getFirstSubcomponent("vtimezone")
                ? vcalendar.getFirstSubcomponent("vtimezone").getFirstPropertyValue("tzid")
                : "";

              const startDate = calendarTimezone
                ? dayjs(event.startDate).tz(calendarTimezone)
                : new Date(event.startDate.toUnixTime() * 1000);
              const endDate = calendarTimezone
                ? dayjs(event.endDate).tz(calendarTimezone)
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
            }
          })
          .filter((e) => e != null);

      return events;
    } catch (reason) {
      console.error(reason);
      throw reason;
    }
  }

  private async getAccount() {
    const account = await createAccount({
      account: {
        serverUrl: `${this.url}`,
        accountType: "caldav",
        credentials: this.credentials,
      },
      headers: this.headers,
    });

    return account;
  }
}
