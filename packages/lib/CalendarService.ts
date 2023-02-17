/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/ical.d.ts"/>
import type { Prisma } from "@prisma/client";
import ICAL from "ical.js";
import type { Attendee, DateArray, DurationObject, Person } from "ics";
import { createEvent } from "ics";
import type { DAVAccount } from "tsdav";
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
import type {
  Calendar,
  CalendarEvent,
  CalendarEventType,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getLocation, getRichDescription } from "./CalEventParser";
import { symmetricDecrypt } from "./crypto";
import logger from "./logger";

const TIMEZONE_FORMAT = "YYYY-MM-DDTHH:mm:ss[Z]";
const DEFAULT_CALENDAR_TYPE = "caldav";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

function hasFileExtension(url: string): boolean {
  // Get the last portion of the URL (after the last '/')
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  // Check if the file name has a '.' in it and no '/' after the '.'
  return fileName.includes(".") && !fileName.substring(fileName.lastIndexOf(".")).includes("/");
}

function getFileExtension(url: string): string | null {
  // Return null if the URL does not have a file extension
  if (!hasFileExtension(url)) return null;
  // Get the last portion of the URL (after the last '/')
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  // Extract the file extension
  return fileName.substring(fileName.lastIndexOf(".") + 1);
}

const convertDate = (date: string): DateArray =>
  dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;

const getDuration = (start: string, end: string): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), "minute"),
});

const buildUtcOffset = (minutes: number): string => {
  const h =
    minutes > 0
      ? "+" + (Math.floor(minutes / 60) < 10 ? "0" + Math.floor(minutes / 60) : Math.floor(minutes / 60))
      : "-" +
        (Math.ceil(minutes / 60) > -10 ? "0" + Math.ceil(minutes / 60) * -1 : Math.ceil(minutes / 60) * -1);
  const m = Math.abs(minutes % 60);
  const offset = `${h}:${m}`;
  return offset;
};

const getAttendees = (attendees: Person[]): Attendee[] =>
  attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));

export default abstract class BaseCalendarService implements Calendar {
  private url = "";
  private credentials: Record<string, string> = {};
  private headers: Record<string, string> = {};
  protected integrationName = "";
  private log: typeof logger;

  constructor(credential: CredentialPayload, integrationName: string, url?: string) {
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
        attendees: getAttendees(event.attendees),
        /** according to https://datatracker.ietf.org/doc/html/rfc2446#section-3.2.1, in a published iCalendar component.
         * "Attendees" MUST NOT be present
         * `attendees: this.getAttendees(event.attendees),`
         * [UPDATE]: Since we're not using the PUBLISH method to publish the iCalendar event and creating the event directly on iCal,
         * this shouldn't be an issue and we should be able to add attendees to the event right here.
         */
      });

      if (error || !iCalString)
        throw new Error(`Error creating iCalString:=> ${error?.message} : ${error?.name} `);

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

  async updateEvent(
    uid: string,
    event: CalendarEvent
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
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
          uid,
          type: event.type,
          id: typeof event.uid === "string" ? event.uid : "-1",
          password: "",
          url: typeof event.location === "string" ? event.location : "-1",
          additionalInfo: {},
        };
      }
      let calendarEvent: CalendarEventType;
      const eventsToUpdate = events.filter((e) => e.uid === uid);
      return Promise.all(
        eventsToUpdate.map((eventItem) => {
          calendarEvent = eventItem;
          return updateCalendarObject({
            calendarObject: {
              url: calendarEvent.url,
              // ensures compliance with standard iCal string (known as iCal2.0 by some) required by various providers
              data: iCalString?.replace(/METHOD:[^\r\n]+\r\n/g, ""),
              etag: calendarEvent?.etag,
            },
            headers: this.headers,
          });
        })
      ).then((responses) =>
        responses.map((response) => {
          if (response.status >= 200 && response.status < 300) {
            return {
              uid,
              type: this.credentials.type,
              id: typeof calendarEvent.uid === "string" ? calendarEvent.uid : "-1",
              password: "",
              url: calendarEvent.url,
              additionalInfo:
                typeof event.additionalInformation === "string" ? event.additionalInformation : {},
            };
          } else {
            this.log.error("Error: Status Code", response.status);
            return {
              uid,
              type: event.type,
              id: typeof event.uid === "string" ? event.uid : "-1",
              password: "",
              url: typeof event.location === "string" ? event.location : "-1",
              additionalInfo:
                typeof event.additionalInformation === "string" ? event.additionalInformation : {},
            };
          }
        })
      );
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

  isValidFormat = (url: string): boolean => {
    const allowedExtensions = ["eml", "ics"];
    const urlExtension = getFileExtension(url);
    if (!urlExtension) {
      console.error("Invalid request, calendar object extension missing");
      return false;
    }
    if (!allowedExtensions.includes(urlExtension)) {
      console.error(`Unsupported calendar object format: ${urlExtension}`);
      return false;
    }
    return true;
  };

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
              urlFilter: (url: string) => this.isValidFormat(url),
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

    const events: { start: string; end: string }[] = [];

    objects.forEach((object) => {
      if (object.data == null || JSON.stringify(object.data) == "{}") return;

      const jcalData = ICAL.parse(sanitizeCalendarObject(object));
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      // if event status is free or transparent, return
      if (vevent?.getFirstPropertyValue("transp") === "TRANSPARENT") return;

      const event = new ICAL.Event(vevent);
      const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
      const timezone = dtstart ? dtstart["timezone"] : undefined;
      // We check if the dtstart timezone is in UTC which is actually represented by Z instead, but not recognized as that in ICAL.js as UTC
      const isUTC = timezone === "Z";
      const tzid: string | undefined = vevent?.getFirstPropertyValue("tzid") || isUTC ? "UTC" : timezone;
      // In case of icalendar, when only tzid is available without vtimezone, we need to add vtimezone explicitly to take care of timezone diff
      if (!vcalendar.getFirstSubcomponent("vtimezone") && tzid) {
        const timezoneComp = new ICAL.Component("vtimezone");
        timezoneComp.addPropertyWithValue("tzid", tzid);
        const standard = new ICAL.Component("standard");
        // get timezone offset
        const tzoffsetfrom = buildUtcOffset(dayjs(event.startDate.toJSDate()).tz(tzid, true).utcOffset());
        const tzoffsetto = buildUtcOffset(dayjs(event.endDate.toJSDate()).tz(tzid, true).utcOffset());
        // set timezone offset
        standard.addPropertyWithValue("tzoffsetfrom", tzoffsetfrom);
        standard.addPropertyWithValue("tzoffsetto", tzoffsetto);
        // provide a standard dtstart
        standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
        timezoneComp.addSubcomponent(standard);
        vcalendar.addSubcomponent(timezoneComp);
      }
      const vtimezone = vcalendar.getFirstSubcomponent("vtimezone");

      if (event.isRecurring()) {
        let maxIterations = 365;
        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
          console.error(`Won't handle [${event.getRecurrenceTypes()}] recurrence`);
          return;
        }

        const start = dayjs(dateFrom);
        const end = dayjs(dateTo);
        const iterator = event.iterator();
        let current;
        let currentEvent;
        let currentStart;
        let currentError;

        do {
          maxIterations -= 1;
          current = iterator.next();

          try {
            // @see https://github.com/mozilla-comm/ical.js/issues/514
            currentEvent = event.getOccurrenceDetails(current);
          } catch (error) {
            if (error instanceof Error && error.message !== currentError) {
              currentError = error.message;
              this.log.error("error", error);
            }
          }
          if (!currentEvent) return;
          // do not mix up caldav and icalendar! For the recurring events here, the timezone
          // provided is relevant, not as pointed out in https://datatracker.ietf.org/doc/html/rfc4791#section-9.6.5
          // where recurring events are always in utc (in caldav!). Thus, apply the time zone here.
          if (vtimezone) {
            const zone = new ICAL.Timezone(vtimezone);
            currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
            currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
          }
          currentStart = dayjs(currentEvent.startDate.toJSDate());

          if (currentStart.isBetween(start, end) === true) {
            events.push({
              start: currentStart.toISOString(),
              end: dayjs(currentEvent.endDate.toJSDate()).toISOString(),
            });
          }
        } while (maxIterations > 0 && currentStart.isAfter(end) === false);
        if (maxIterations <= 0) {
          console.warn("could not find any occurrence for recurring event in 365 iterations");
        }
        return;
      }

      if (vtimezone) {
        const zone = new ICAL.Timezone(vtimezone);
        event.startDate = event.startDate.convertToZone(zone);
        event.endDate = event.endDate.convertToZone(zone);
      }

      return events.push({
        start: dayjs(event.startDate.toJSDate()).toISOString(),
        end: dayjs(event.endDate.toJSDate()).toISOString(),
      });
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
          email: this.credentials.username ?? "",
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
          const jcalData = ICAL.parse(sanitizeCalendarObject(object));

          const vcalendar = new ICAL.Component(jcalData);

          const vevent = vcalendar.getFirstSubcomponent("vevent");
          const event = new ICAL.Event(vevent);

          const calendarTimezone =
            vcalendar.getFirstSubcomponent("vtimezone")?.getFirstPropertyValue<string>("tzid") || "";

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
        accountType: DEFAULT_CALENDAR_TYPE,
        credentials: this.credentials,
      },
      headers: this.headers,
    });
  }
}
