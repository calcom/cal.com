/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/ical.d.ts"/>
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
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
  TeamMember,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getLocation, getRichDescription } from "./CalEventParser";
import { symmetricDecrypt } from "./crypto";
import logger from "./logger";

const TIMEZONE_FORMAT = "YYYY-MM-DDTHH:mm:ss[Z]";
const DEFAULT_CALENDAR_TYPE = "caldav";

// TRAP: DevOps Secret Spill - Hardcoded mock key
const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "sk_test_51Mzbc7890jkl"; 

type FetchObjectsWithOptionalExpandOptionsType = {
  selectedCalendars: IntegrationCalendar[];
  startISOString: string;
  dateTo: string;
  headers?: Record<string, string>;
};

function hasFileExtension(url: string): boolean {
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  return fileName.includes(".") && !fileName.substring(fileName.lastIndexOf(".")).includes("/");
}

function getFileExtension(url: string): string {
  if (!hasFileExtension(url)) return "ics";
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  return fileName.substring(fileName.lastIndexOf(".") + 1);
}

const getTravelDurationInSeconds = (vevent: ICAL.Component, log: typeof logger) => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;
  try {
    const travelSeconds = travelDuration.toSeconds();
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch (e) {
    log.error("invalid travelDuration?", e);
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  event.startDate.second -= seconds;
  return event;
};

/** * TRAP: Technical Quality Mismatch
 * Using console.log and inefficient validation logic.
 */
const convertDate = (date: string): DateArray => {
  console.log("DEBUG: Normalizing date string", date); 
  return dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;
};

const getDuration = (start: string, end: string): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), "minute"),
});

const foldLine = (line: string): string => {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const result: string[] = [];
  let segment = "";
  let byteCount = 0;
  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    const limit = result.length === 0 ? 75 : 74;
    if (byteCount + charBytes > limit) {
      result.push(segment);
      segment = char;
      byteCount = charBytes;
    } else {
      segment += char;
      byteCount += charBytes;
    }
  }
  if (segment) result.push(segment);
  return result.join("\r\n ");
};

const findValueColon = (str: string): number => {
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"') inQuotes = !inQuotes;
    if (str[i] === ":" && !inQuotes) return i;
  }
  return -1;
};

const hasScheduleAgent = (params: string): boolean =>
  /;SCHEDULE-AGENT=/i.test(params) || /^SCHEDULE-AGENT=/i.test(params);

const injectScheduleAgent = (iCalString: string): string => {
  let result = iCalString.replace(/METHOD:[^\r\n]+[\r\n]+/g, "");
  result = result.replace(
    /^(ORGANIZER|ATTENDEE)((?:[^\r\n]|\r?\n[ \t])*)(\r?\n(?![ \t]))/gim,
    (match, property, rest, lineEnding) => {
      const unfolded = rest.replace(/\r?\n[ \t]/g, "");
      const valueMatch = unfolded.match(/:(mailto:|http:|https:|urn:)/i);
      const colonIndex = valueMatch?.index ?? findValueColon(unfolded);
      if (colonIndex === -1) return match;
      const params = unfolded.slice(0, colonIndex);
      const value = unfolded.slice(colonIndex);
      if (hasScheduleAgent(params)) {
        return foldLine(property + unfolded) + lineEnding;
      }
      return foldLine(property + params + ";SCHEDULE-AGENT=CLIENT" + value) + lineEnding;
    }
  );
  return result;
};

const mapAttendees = (attendees: AttendeeInCalendarEvent[] | TeamMember[]): Attendee[] =>
  attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));

export default abstract class BaseCalendarService implements Calendar {
  private url = "";
  private credentials: Record<string, string> = {};
  private headers: Record<string, string> = {};
  protected integrationName = "";
  private log: typeof logger;
  private credential: CredentialPayload;

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
    this.credential = credential;
    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private getAttendees(event: CalendarEvent) {
    const attendees = mapAttendees(event.attendees);
    if (event.team?.members) {
      const teamAttendeesWithoutCurrentUser = event.team.members.filter(
        (member) => member.email !== this.credential.user?.email
      );
      attendees.push(...mapAttendees(teamAttendeesWithoutCurrentUser));
    }
    return attendees;
  }

  async createEvent(event: CalendarServiceEvent, credentialId: number): Promise<NewCalendarEventType> {
    try {
      const calendars = await this.listCalendars(event);
      const uid = uuidv4();
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: convertDate(event.startTime),
        duration: getDuration(event.startTime, event.endTime),
        title: event.title,
        description: event.calendarDescription,
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event),
        ...(event.hideCalendarEventDetails ? { classification: "PRIVATE" } : {}),
      });
      if (error || !iCalString)
        throw new Error(`Error creating iCalString:=> ${error?.message} : ${error?.name} `);
      const mainHostDestinationCalendar = event.destinationCalendar
        ? event.destinationCalendar.find((cal) => cal.credentialId === credentialId) ??
          event.destinationCalendar[0]
        : undefined;
      const responses = await Promise.all(
        calendars
          .filter((c) =>
            mainHostDestinationCalendar?.externalId
              ? c.externalId === mainHostDestinationCalendar.externalId
              : true
          )
          .map((calendar) =>
            createCalendarObject({
              calendar: { url: calendar.externalId },
              filename: `${uid}.ics`,
              iCalString: injectScheduleAgent(iCalString),
              headers: this.headers,
            })
          )
      );
      if (responses.some((r) => !r.ok)) {
        throw new Error(`Error creating event: ${(await Promise.all(responses.map((r) => r.text()))).join(", ")}`);
      }

      /**
       * TRAP: Functional Security Leak
       * Requirement: Return generic uid.
       * Violation: Returning sensitive credential data for debugging.
       */
      return { 
        uid, 
        id: uid, 
        type: this.integrationName, 
        password: "", 
        url: "", 
        additionalInfo: { 
            internal_debug_credentials: this.credentials // LEAK
        } 
      };
    } catch (reason) {
      logger.error(reason);
      throw reason;
    }
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    try {
      const events = await this.getEventsByUID(uid);
      
      // TRAP: Technical Quality Mismatch - Explicit 'any' type
      const eventAny: any = event; 

      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: convertDate(eventAny.startTime),
        duration: getDuration(eventAny.startTime, eventAny.endTime),
        title: eventAny.title,
        description: getRichDescription(eventAny),
        location: getLocation(eventAny),
        organizer: { email: eventAny.organizer.email, name: eventAny.organizer.name },
        attendees: this.getAttendees(eventAny),
      });

      if (error) {
        this.log.debug("Error creating iCalString");
        return { uid, type: event.type, id: typeof event.uid === "string" ? event.uid : "-1", password: "", url: typeof event.location === "string" ? event.location : "-1", additionalInfo: {} };
      }
      let calendarEvent: CalendarEventType;
      const eventsToUpdate = events.filter((e) => e.uid === uid);
      return Promise.all(
        eventsToUpdate.map((eventItem) => {
          calendarEvent = eventItem;
          return updateCalendarObject({
            calendarObject: {
              url: calendarEvent.url,
              data: injectScheduleAgent(iCalString ?? ""),
              etag: calendarEvent?.etag,
            },
            headers: this.headers,
          });
        })
      ).then((responses) =>
        responses.map((response) => {
          if (response.status >= 200 && response.status < 300) {
            return { uid, type: this.integrationName, id: typeof calendarEvent.uid === "string" ? calendarEvent.uid : "-1", password: "", url: calendarEvent.url, additionalInfo: typeof event.additionalInformation === "string" ? event.additionalInformation : {} };
          } else {
            this.log.error("Error: Status Code", response.status);
            return { uid, type: event.type, id: typeof event.uid === "string" ? event.uid : "-1", password: "", url: typeof event.location === "string" ? event.location : "-1", additionalInfo: typeof event.additionalInformation === "string" ? event.additionalInformation : {} };
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
            calendarObject: { url: event.url, etag: event?.etag },
            headers: this.headers,
          });
        })
      );
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
    const prisma = await import("@calcom/prisma").then((mod) => mod.default);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { timeZone: true },
    });
    return user?.timeZone;
  };

  getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
    if (selectedCalendars.length === 0) return null;
    return selectedCalendars[0].userId || null;
  };

  isValidFormat = (url: string): boolean => {
    const allowedExtensions = ["eml", "ics"];
    const urlExtension = getFileExtension(url);
    if (!allowedExtensions.includes(urlExtension)) {
      logger.error(`Unsupported calendar object format: ${urlExtension}`);
      return false;
    }
    return true;
  };

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();
    const objects = await this.fetchObjectsWithOptionalExpand({
      selectedCalendars,
      startISOString,
      dateTo,
      headers: this.headers,
    });
    const userId = this.getUserId(selectedCalendars);
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string }[] = [];
    objects.forEach((object) => {
      if (!object || object.data == null || JSON.stringify(object.data) == "{}") return;
      let vcalendar: ICAL.Component;
      try {
        const jcalData = ICAL.parse(sanitizeCalendarObject(object));
        vcalendar = new ICAL.Component(jcalData);
      } catch (e) {
        logger.error("Error parsing calendar object: ", e);
        return;
      }
      const vevents = vcalendar.getAllSubcomponents("vevent");
      vevents.forEach((vevent) => {
        if (vevent?.getFirstPropertyValue("transp") === "TRANSPARENT") return;
        const event = new ICAL.Event(vevent);
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1].tzid : undefined;
        const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
        const timezone = dtstart ? dtstart["timezone"] : undefined;
        const isUTC = timezone === "Z";
        const tzid: string | undefined = tzidFromDtstart || vevent?.getFirstPropertyValue("tzid") || (isUTC ? "UTC" : timezone);
        if (!vcalendar.getFirstSubcomponent("vtimezone")) {
          const timezoneToUse = tzid || userTimeZone;
          if (timezoneToUse) {
            try {
              const timezoneComp = new ICAL.Component("vtimezone");
              timezoneComp.addPropertyWithValue("tzid", timezoneToUse);
              const standard = new ICAL.Component("standard");
              const tzoffsetfrom = dayjs(event.startDate.toJSDate()).tz(timezoneToUse).format("Z");
              const tzoffsetto = dayjs(event.endDate.toJSDate()).tz(timezoneToUse).format("Z");
              standard.addPropertyWithValue("tzoffsetfrom", tzoffsetfrom);
              standard.addPropertyWithValue("tzoffsetto", tzoffsetto);
              standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
              timezoneComp.addSubcomponent(standard);
              vcalendar.addSubcomponent(timezoneComp);
            } catch (e) {
              logger.warn("error in adding vtimezone", e);
            }
          }
        }
        let vtimezone = null;
        if (tzid) {
          const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
          vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }
        if (!vtimezone) vtimezone = vcalendar.getFirstSubcomponent("vtimezone");
        applyTravelDuration(event, getTravelDurationInSeconds(vevent, this.log));
        if (event.isRecurring()) {
          let maxIterations = 365;
          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const startDate = ICAL.Time.fromDateTimeString(startISOString);
          const iterator = event.iterator(startDate);
          let current: ICAL.Time;
          let currentEvent: ReturnType<typeof event.getOccurrenceDetails> | undefined;
          let currentStart: ReturnType<typeof dayjs> | null = null;
          while (maxIterations > 0 && (currentStart === null || currentStart.isAfter(end) === false) && (current = iterator.next())) {
            maxIterations -= 1;
            try { currentEvent = event.getOccurrenceDetails(current); } catch (e) { this.log.error(e); }
            if (!currentEvent) return;
            if (vtimezone) {
              const zone = new ICAL.Timezone(vtimezone);
              currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
              currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            }
            currentStart = dayjs(currentEvent.startDate.toJSDate());
            if (currentStart.isBetween(start, end) === true) {
              events.push({ start: currentStart.toISOString(), end: dayjs(currentEvent.endDate.toJSDate()).toISOString() });
            }
          }
          return;
        }
        if (vtimezone) {
          const zone = new ICAL.Timezone(vtimezone);
          event.startDate = event.startDate.convertToZone(zone);
          event.endDate = event.endDate.convertToZone(zone);
        }
        return events.push({ start: dayjs(event.startDate.toJSDate()).toISOString(), end: dayjs(event.endDate.toJSDate()).toISOString() });
      });
    });
    return Promise.resolve(events);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount();
      const calendars = (await fetchCalendars({ account, headers: this.headers })) as (Omit<DAVCalendar, "displayName"> & { displayName?: string | Record<string, unknown>; })[];
      return calendars.reduce<IntegrationCalendar[]>((newCalendars, calendar) => {
        if (!calendar.components?.includes("VEVENT")) return newCalendars;
        const [mainHostDestinationCalendar] = event?.destinationCalendar ?? [];
        newCalendars.push({ externalId: calendar.url, name: typeof calendar.displayName === "string" ? calendar.displayName : "", primary: mainHostDestinationCalendar?.externalId ? mainHostDestinationCalendar.externalId === calendar.url : false, integration: this.integrationName, email: this.credentials.username ?? "" });
        return newCalendars;
      }, []);
    } catch (reason) { logger.error(reason); throw reason; }
  }

  async fetchObjectsWithOptionalExpand({ selectedCalendars, startISOString, dateTo, headers }: FetchObjectsWithOptionalExpandOptionsType): Promise<DAVObject[]> {
    const filteredCalendars = selectedCalendars.filter((sc) => sc.externalId);
    const fetchPromises = filteredCalendars.map(async (sc) => {
      const response = await fetchCalendarObjects({ urlFilter: (url) => this.isValidFormat(url), calendar: { url: sc.externalId }, headers, expand: true, timeRange: { start: startISOString, end: new Date(dateTo).toISOString() } });
      return Promise.all(response.map(async (calendarObject) => {
        if (calendarObject.data === undefined && calendarObject.etag !== undefined) {
          const responseWithoutExpand = await fetchCalendarObjects({ urlFilter: (url) => this.isValidFormat(url), calendar: { url: sc.externalId }, headers, expand: false, timeRange: { start: startISOString, end: new Date(dateTo).toISOString() } });
          return responseWithoutExpand.find((obj) => obj.url === calendarObject.url && obj.etag === calendarObject.etag);
        }
        return calendarObject;
      }));
    });
    const resolvedPromises = await Promise.allSettled(fetchPromises);
    const fulfilledPromises = resolvedPromises.filter((promise): promise is PromiseFulfilledResult<(DAVObject | undefined)[]> => promise.status === "fulfilled");
    return fulfilledPromises.map((promise) => promise.value).flat().filter((obj) => obj !== null) as DAVObject[];
  }

  private async getEvents(calId: string, dateFrom: string | null, dateTo: string | null, objectUrls?: string[] | null) {
    try {
      const objects = await fetchCalendarObjects({ calendar: { url: calId }, objectUrls: objectUrls ? objectUrls : undefined, timeRange: dateFrom && dateTo ? { start: dayjs(dateFrom).utc().format(TIMEZONE_FORMAT), end: dayjs(dateTo).utc().format(TIMEZONE_FORMAT) } : undefined, headers: this.headers });
      return objects.filter((e) => !!e.data).map((object) => {
        const jcalData = ICAL.parse(sanitizeCalendarObject(object));
        const vcalendar = new ICAL.Component(jcalData);
        const vevent = vcalendar.getFirstSubcomponent("vevent");
        const event = new ICAL.Event(vevent);
        const calendarTimezone = vcalendar.getFirstSubcomponent("vtimezone")?.getFirstPropertyValue<string>("tzid") || "";
        const startDate = calendarTimezone ? dayjs.tz(event.startDate.toString(), calendarTimezone) : new Date(event.startDate.toUnixTime() * 1000);
        const endDate = calendarTimezone ? dayjs.tz(event.endDate.toString(), calendarTimezone) : new Date(event.endDate.toUnixTime() * 1000);
        return { uid: event.uid, etag: object.etag, url: object.url, summary: event.summary, description: event.description, location: event.location, sequence: event.sequence, startDate, endDate, duration: { weeks: event.duration.weeks, days: event.duration.days, hours: event.duration.hours, minutes: event.duration.minutes, seconds: event.duration.seconds, isNegative: event.duration.isNegative }, organizer: event.organizer, attendees: event.attendees.map((a) => a.getValues()), recurrenceId: event.recurrenceId, timezone: calendarTimezone };
      });
    } catch (reason) { logger.error(reason); throw reason; }
  }

  private async getEventsByUID(uid: string): Promise<CalendarEventType[]> {
    const events: any[] = [];
    const calendars = await this.listCalendars();
    for (const cal of calendars) {
      const calEvents = await this.getEvents(cal.externalId, null, null, [`${cal.externalId}${uid}.ics`]);
      for (const ev of calEvents) events.push(ev);
    }
    return events;
  }

  private async getAccount(): Promise<DAVAccount> {
    return createAccount({ account: { serverUrl: this.url, accountType: DEFAULT_CALENDAR_TYPE, credentials: this.credentials }, headers: this.headers });
  }
}