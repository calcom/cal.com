import { Credential } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import ICAL from "ical.js";
import { Attendee, createEvent, DateArray, DurationObject } from "ics";
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

import { getLocation, getRichDescription } from "@lib/CalEventParser";
import { symmetricDecrypt } from "@lib/crypto";
import logger from "@lib/logger";

import { CalendarEvent, IntegrationCalendar } from "./calendarClient";

dayjs.extend(utc);

export type Person = { name: string; email: string; timeZone: string };

export class BaseCalendarApiAdapter {
  private url: string;
  private credentials: Record<string, string>;
  private headers: Record<string, string>;
  private integrationName = "";

  constructor(credential: Credential, integrationName: string, url?: string) {
    const decryptedCredential = JSON.parse(
      symmetricDecrypt(credential.key as string, process.env.CALENDSO_ENCRYPTION_KEY!)
    );
    const username = decryptedCredential.username;
    const password = decryptedCredential.password;
    this.url = url || decryptedCredential.url;
    this.integrationName = integrationName;
    this.credentials = { username, password };
    this.headers = getBasicAuthHeaders({ username, password });
  }

  log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });

  convertDate(date: string): DateArray {
    return dayjs(date)
      .utc()
      .toArray()
      .slice(0, 6)
      .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;
  }

  getDuration(start: string, end: string): DurationObject {
    return {
      minutes: dayjs(end).diff(dayjs(start), "minute"),
    };
  }

  getAttendees(attendees: Person[]): Attendee[] {
    return attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));
  }

  async createEvent(event: CalendarEvent) {
    try {
      const calendars = await this.listCalendars(event);
      const uid = uuidv4();
      /** We create local ICS files */
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: this.getDuration(event.startTime, event.endTime),
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        // according to https://datatracker.ietf.org/doc/html/rfc2446#section-3.2.1, in a published iCalendar component. "Attendees" MUST NOT be present
        // attendees: this.getAttendees(event.attendees),
      });

      if (error) throw new Error("Error creating iCalString");

      if (!iCalString) throw new Error("Error creating iCalString");

      /** We create the event directly on iCal */
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
      };
    } catch (reason) {
      console.error(reason);
      throw reason;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent) {
    try {
      const calendars = await this.listCalendars();
      const events = [];

      for (const cal of calendars) {
        const calEvents = await this.getEvents(cal.externalId, null, null, [`${cal.externalId}${uid}.ics`]);

        for (const ev of calEvents) {
          events.push(ev);
        }
      }

      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: this.convertDate(event.startTime),
        duration: this.getDuration(event.startTime, event.endTime),
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event.attendees),
      });

      if (error) {
        this.log.debug("Error creating iCalString");
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
        const calEvents = await this.getEvents(cal.externalId, null, null, [`${cal.externalId}${uid}.ics`]);

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

  async getAvailability(dateFrom: string, dateTo: string, selectedCalendars: IntegrationCalendar[]) {
    try {
      const selectedCalendarIds = selectedCalendars
        .filter((e) => e.integration === this.integrationName)
        .map((e) => e.externalId);
      if (selectedCalendarIds.length == 0 && selectedCalendars.length > 0) {
        // Only calendars of other integrations selected
        return Promise.resolve([]);
      }

      return (
        selectedCalendarIds.length === 0
          ? this.listCalendars().then((calendars) => calendars.map((calendar) => calendar.externalId))
          : Promise.resolve(selectedCalendarIds)
      ).then(async (ids: string[]) => {
        if (ids.length === 0) {
          return Promise.resolve([]);
        }

        return (
          await Promise.all(
            ids.map(async (calId) => {
              return (await this.getEvents(calId, dateFrom, dateTo)).map((event) => {
                return {
                  start: event.startDate.toISOString(),
                  end: event.endDate.toISOString(),
                };
              });
            })
          )
        ).flatMap((event) => event);
      });
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
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
      console.error(reason);
      throw reason;
    }
  }

  async getEvents(
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
                start: dayjs(dateFrom).utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                end: dayjs(dateTo).utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
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

  private async getAccount() {
    const account = await createAccount({
      account: {
        serverUrl: this.url,
        accountType: "caldav",
        credentials: this.credentials,
      },
      headers: this.headers,
    });

    return account;
  }
}
