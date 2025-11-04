/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/ical.d.ts"/>
import { buildRRFromRE } from "@calid/features/modules/teams/lib/recurrenceUtil";
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
  RecurringEvent,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import { getLocation, getRichDescription } from "./CalEventParser";
import { symmetricDecrypt } from "./crypto";
import logger from "./logger";

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
  // Get the last portion of the URL (after the last '/')
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  // Check if the file name has a '.' in it and no '/' after the '.'
  return fileName.includes(".") && !fileName.substring(fileName.lastIndexOf(".")).includes("/");
}

function getFileExtension(url: string): string {
  // Return null if the URL does not have a file extension
  if (!hasFileExtension(url)) return "ics";
  // Get the last portion of the URL (after the last '/')
  const fileName = url.substring(url.lastIndexOf("/") + 1);
  // Extract the file extension
  return fileName.substring(fileName.lastIndexOf(".") + 1);
}

// for Apple's Travel Time feature only (for now)
const getTravelDurationInSeconds = (vevent: ICAL.Component, log: typeof logger) => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;

  // we can't rely on this being a valid duration and it's painful to check, so just try and catch if anything throws
  try {
    const travelSeconds = travelDuration.toSeconds();
    // integer validation as we can never be sure with ical.js
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch (e) {
    log.error("invalid travelDuration?", e);
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  // move event start date back by the specified travel time
  event.startDate.second -= seconds;
  return event;
};

const convertDate = (date: string): DateArray =>
  dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;

const getDuration = (start: string, end: string): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), "minute"),
});

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

      this.log.debug("Creating event", {
        uid,
        hasRecurringEvent: !!event.recurringEvent,
        hasExistingRecurringEvent: !!event.existingRecurringEvent,
      });

      // Handle existing recurring event (booking into an existing series)
      if (event.existingRecurringEvent) {
        this.log.info("Booking into existing recurring event series", {
          recurringEventId: event.existingRecurringEvent.recurringEventId,
          startTime: event.startTime,
        });

        return await this.createRecurringInstanceEvent(
          event,
          credentialId,
          calendars,
          event.existingRecurringEvent.recurringEventId
        );
      }

      // Create base ICS string
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

      if (error || !iCalString) {
        throw new Error(`Error creating iCalString:=> ${error?.message} : ${error?.name}`);
      }

      // Add recurrence rules if this is a recurring event
      let finalICalString = iCalString;
      let thirdPartyRecurringEventId: string | null = null;

      if (event.recurringEvent) {
        this.log.info("Creating new recurring event series", {
          uid,
          freq: event.recurringEvent.freq,
          interval: event.recurringEvent.interval,
          count: event.recurringEvent.count,
        });

        const rruleStrings = this.mapRecurrenceToRRULE(event.recurringEvent);
        finalICalString = this.addRecurrenceToICS(iCalString, rruleStrings);
        thirdPartyRecurringEventId = uid; // The UID serves as the recurring event ID
      }

      const mainHostDestinationCalendar = event.destinationCalendar
        ? event.destinationCalendar.find((cal) => cal.credentialId === credentialId) ??
          event.destinationCalendar[0]
        : undefined;

      // Create the event on CalDAV server
      const responses = await Promise.all(
        calendars
          .filter((c) =>
            mainHostDestinationCalendar?.externalId
              ? c.externalId === mainHostDestinationCalendar.externalId
              : true
          )
          .map((calendar) =>
            createCalendarObject({
              calendar: {
                url: calendar.externalId,
              },
              filename: `${uid}.ics`,
              // Remove METHOD property as per RFC4791
              iCalString: finalICalString.replace(/METHOD:[^\r\n]+\r\n/g, ""),
              headers: this.headers,
            })
          )
      );

      if (responses.some((r) => !r.ok)) {
        throw new Error(
          `Error creating event: ${(await Promise.all(responses.map((r) => r.text()))).join(", ")}`
        );
      }

      this.log.info("Event created successfully", {
        uid,
        isRecurring: !!event.recurringEvent,
        thirdPartyRecurringEventId,
      });

      return {
        uid,
        id: uid,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {},
        ...(thirdPartyRecurringEventId && { thirdPartyRecurringEventId }),
      };
    } catch (reason) {
      this.log.error("Error creating event", { error: reason, event });
      throw reason;
    }
  }

  async updateEvent(
    uid: string,
    event: CalendarServiceEvent,
    externalCalendarId?: string | null,
    isRecurringInstanceReschedule?: boolean
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    try {
      this.log.debug("Updating event", {
        uid,
        isRecurringInstanceReschedule,
        hasRescheduleInstance: !!event.rescheduleInstance,
      });

      // Handle recurring instance reschedule
      if (isRecurringInstanceReschedule && event.rescheduleInstance) {
        this.log.info("Detected recurring instance reschedule request", {
          uid,
          formerTime: event.rescheduleInstance.formerTime,
          newTime: event.rescheduleInstance.newTime,
        });

        return await this.updateSpecificRecurringInstance(uid, event);
      }

      // Normal event update logic
      const events = await this.getEventsByUID(uid);

      // Generate the ICS files
      const { error, value: iCalString } = createEvent({
        uid,
        startInputType: "utc",
        start: convertDate(event.startTime),
        duration: getDuration(event.startTime, event.endTime),
        title: event.title,
        description: getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event),
      });

      if (error) {
        this.log.debug("Error creating iCalString for update");

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
              // ensures compliance with standard iCal string
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
      this.log.error("Error updating event", { error: reason, uid });
      throw reason;
    }
  }

  async deleteEvent(
    uid: string,
    event?: CalendarEvent,
    externalCalendarId?: string | null,
    isRecurringInstanceCancellation?: boolean
  ): Promise<void> {
    try {
      this.log.info("deleteEvent called", {
        uid,
        isRecurringInstanceCancellation,
        cancelledDatesCount: event?.cancelledDates?.length || 0,
      });

      // Handle instance-level cancellation
      if (isRecurringInstanceCancellation && event?.cancelledDates && event.cancelledDates.length > 0) {
        this.log.info("Processing instance cancellation", {
          uid,
          cancelledDatesCount: event.cancelledDates.length,
        });

        await this.cancelSpecificInstances(uid, event.cancelledDates);
        return;
      }

      // Handle full event deletion (default behavior)
      this.log.info("Deleting entire event", { uid });

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

      this.log.info("Event deleted successfully", { uid });
    } catch (reason) {
      this.log.error("Error deleting event", { error: reason, uid });
      throw reason;
    }
  }

  /**
   * getUserTimezoneFromDB() retrieves the timezone of a user from the database.
   *
   * @param {number} id - The user's unique identifier.
   * @returns {Promise<string | undefined>} - A Promise that resolves to the user's timezone or "Europe/London" as a default value if the timezone is not found.
   */
  getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
    const prisma = await import("@calcom/prisma").then((mod) => mod.default);
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        timeZone: true,
      },
    });
    return user?.timeZone;
  };

  /**
   * getUserId() extracts the user ID from the first calendar in an array of IntegrationCalendars.
   *
   * @param {IntegrationCalendar[]} selectedCalendars - An array of IntegrationCalendars.
   * @returns {number | null} - The user ID associated with the first calendar in the array, or null if the array is empty or the user ID is not found.
   */
  getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
    if (selectedCalendars.length === 0) {
      return null;
    }
    return selectedCalendars[0].userId || null;
  };

  isValidFormat = (url: string): boolean => {
    const allowedExtensions = ["eml", "ics"];
    const urlExtension = getFileExtension(url);
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
    const startISOString = new Date(dateFrom).toISOString();

    const objects = await this.fetchObjectsWithOptionalExpand({
      selectedCalendars,
      startISOString,
      dateTo,
      headers: this.headers,
    });

    const userId = this.getUserId(selectedCalendars);
    // we use the userId from selectedCalendars to fetch the user's timeZone from the database primarily for all-day events without any timezone information
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string }[] = [];
    objects.forEach((object) => {
      if (!object || object.data == null || JSON.stringify(object.data) == "{}") return;
      let vcalendar: ICAL.Component;
      try {
        const jcalData = ICAL.parse(sanitizeCalendarObject(object));
        vcalendar = new ICAL.Component(jcalData);
      } catch (e) {
        console.error("Error parsing calendar object: ", e);
        return;
      }
      const vevents = vcalendar.getAllSubcomponents("vevent");
      vevents.forEach((vevent) => {
        // if event status is free or transparent, return
        if (vevent?.getFirstPropertyValue("transp") === "TRANSPARENT") return;

        const event = new ICAL.Event(vevent);
        const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
        const timezone = dtstart ? dtstart["timezone"] : undefined;
        // We check if the dtstart timezone is in UTC which is actually represented by Z instead, but not recognized as that in ICAL.js as UTC
        const isUTC = timezone === "Z";
        const tzid: string | undefined = vevent?.getFirstPropertyValue("tzid") || isUTC ? "UTC" : timezone;
        // In case of icalendar, when only tzid is available without vtimezone, we need to add vtimezone explicitly to take care of timezone diff
        if (!vcalendar.getFirstSubcomponent("vtimezone")) {
          const timezoneToUse = tzid || userTimeZone;
          if (timezoneToUse) {
            try {
              const timezoneComp = new ICAL.Component("vtimezone");
              timezoneComp.addPropertyWithValue("tzid", timezoneToUse);
              const standard = new ICAL.Component("standard");

              // get timezone offset
              const tzoffsetfrom = dayjs(event.startDate.toJSDate()).tz(timezoneToUse).format("Z");
              const tzoffsetto = dayjs(event.endDate.toJSDate()).tz(timezoneToUse).format("Z");

              // set timezone offset
              standard.addPropertyWithValue("tzoffsetfrom", tzoffsetfrom);
              standard.addPropertyWithValue("tzoffsetto", tzoffsetto);
              // provide a standard dtstart
              standard.addPropertyWithValue("dtstart", "1601-01-01T00:00:00");
              timezoneComp.addSubcomponent(standard);
              vcalendar.addSubcomponent(timezoneComp);
            } catch (e) {
              // Adds try-catch to ensure the code proceeds when Apple Calendar provides non-standard TZIDs
              console.log("error in adding vtimezone", e);
            }
          } else {
            console.error("No timezone found");
          }
        }
        const vtimezone = vcalendar.getFirstSubcomponent("vtimezone");

        // mutate event to consider travel time
        applyTravelDuration(event, getTravelDurationInSeconds(vevent, this.log));

        if (event.isRecurring()) {
          let maxIterations = 365;
          if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
            console.error(`Won't handle [${event.getRecurrenceTypes()}] recurrence`);
            return;
          }

          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const startDate = ICAL.Time.fromDateTimeString(startISOString);
          startDate.hour = event.startDate.hour;
          startDate.minute = event.startDate.minute;
          startDate.second = event.startDate.second;
          const iterator = event.iterator(startDate);
          let current: ICAL.Time;
          let currentEvent;
          let currentStart = null;
          let currentError;

          while (
            maxIterations > 0 &&
            (currentStart === null || currentStart.isAfter(end) === false) &&
            // this iterator was poorly implemented, normally done is expected to be
            // returned
            (current = iterator.next())
          ) {
            maxIterations -= 1;

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
          }
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
    });

    return Promise.resolve(events);
  }

  async listCalendars(event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    try {
      const account = await this.getAccount();

      const calendars = (await fetchCalendars({
        account,
        headers: this.headers,
      })) /** @url https://github.com/natelindev/tsdav/pull/139 */ as (Omit<DAVCalendar, "displayName"> & {
        displayName?: string | Record<string, unknown>;
      })[];

      return calendars.reduce<IntegrationCalendar[]>((newCalendars, calendar) => {
        if (!calendar.components?.includes("VEVENT")) return newCalendars;
        const [mainHostDestinationCalendar] = event?.destinationCalendar ?? [];
        newCalendars.push({
          externalId: calendar.url,
          /** @url https://github.com/calcom/cal.com/issues/7186 */
          name: typeof calendar.displayName === "string" ? calendar.displayName : "",
          primary: mainHostDestinationCalendar?.externalId
            ? mainHostDestinationCalendar.externalId === calendar.url
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

  /**
   * The fetchObjectsWithOptionalExpand function is responsible for fetching calendar objects
   * from an array of selectedCalendars. It attempts to fetch objects with the expand option
   * alone such that it works if a calendar supports it. If any calendar object has an undefined 'data' property
   * and etag isn't undefined, the function makes a new request without the expand option to retrieve the data.
   * The result is a flattened array of calendar objects with the structure { url: ..., etag: ..., data: ...}.
   *
   * @param {Object} options - The options object containing the following properties:
   *   @param {IntegrationCalendar[]} options.selectedCalendars - An array of IntegrationCalendar objects to fetch data from.
   *   @param {string} options.startISOString - The start date of the date range to fetch events from, in ISO 8601 format.
   *   @param {string} options.dateTo - The end date of the date range to fetch events from.
   *   @param {Object} options.headers - Headers to be included in the API requests.
   * @returns {Promise<Array>} - A promise that resolves to a flattened array of calendar objects with the structure { url: ..., etag: ..., data: ...}.
   */

  async fetchObjectsWithOptionalExpand({
    selectedCalendars,
    startISOString,
    dateTo,
    headers,
  }: FetchObjectsWithOptionalExpandOptionsType): Promise<DAVObject[]> {
    const filteredCalendars = selectedCalendars.filter((sc) => sc.externalId);
    const fetchPromises = filteredCalendars.map(async (sc) => {
      const response = await fetchCalendarObjects({
        urlFilter: (url) => this.isValidFormat(url),
        calendar: {
          url: sc.externalId,
        },
        headers,
        expand: true,
        timeRange: {
          start: startISOString,
          end: new Date(dateTo).toISOString(),
        },
      });

      const processedResponse = await Promise.all(
        response.map(async (calendarObject) => {
          const calendarObjectHasEtag = calendarObject.etag !== undefined;
          const calendarObjectDataUndefined = calendarObject.data === undefined;
          if (calendarObjectDataUndefined && calendarObjectHasEtag) {
            const responseWithoutExpand = await fetchCalendarObjects({
              urlFilter: (url) => this.isValidFormat(url),
              calendar: {
                url: sc.externalId,
              },
              headers,
              expand: false,
              timeRange: {
                start: startISOString,
                end: new Date(dateTo).toISOString(),
              },
            });

            return responseWithoutExpand.find(
              (obj) => obj.url === calendarObject.url && obj.etag === calendarObject.etag
            );
          }
          return calendarObject;
        })
      );
      return processedResponse;
    });
    const resolvedPromises = await Promise.allSettled(fetchPromises);
    const fulfilledPromises = resolvedPromises.filter(
      (promise): promise is PromiseFulfilledResult<(DAVObject | undefined)[]> =>
        promise.status === "fulfilled"
    );
    const flatResult = fulfilledPromises
      .map((promise) => promise.value)
      .flat()
      .filter((obj) => obj !== null);
    return flatResult as DAVObject[];
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

  /**
   * Maps RecurringEvent to RRULE array format for iCalendar
   */
  private mapRecurrenceToRRULE(recurringEvent: RecurringEvent): string[] {
    this.log.debug("Mapping recurring event to RRULE", { recurringEvent });

    try {
      // Use the same buildRRFromRE utility used by Google Calendar
      const rruleStrings = buildRRFromRE(recurringEvent);
      this.log.debug("Generated RRULE strings", { rruleStrings });
      return rruleStrings;
    } catch (error) {
      this.log.error("Error building RRULE from recurring event", { error, recurringEvent });
      throw error;
    }
  }

  /**
   * Adds recurrence rules to an ICS string
   */
  private addRecurrenceToICS(iCalString: string, rruleStrings: string[]): string {
    try {
      // Parse the ICS string
      const jcalData = ICAL.parse(iCalString);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) {
        throw new Error("No VEVENT found in ICS string");
      }

      // Add each RRULE/EXDATE line as a property
      rruleStrings.forEach((rruleLine) => {
        if (rruleLine.startsWith("RRULE:")) {
          const rruleValue = rruleLine.substring(6); // Remove "RRULE:" prefix
          vevent.addPropertyWithValue("rrule", ICAL.Recur.fromString(rruleValue));
          this.log.debug("Added RRULE to VEVENT", { rruleValue });
        } else if (rruleLine.startsWith("EXDATE:")) {
          const exdateValue = rruleLine.substring(7); // Remove "EXDATE:" prefix
          // EXDATE can contain multiple dates separated by commas
          const exdates = exdateValue.split(",");
          exdates.forEach((exdate) => {
            const time = ICAL.Time.fromString(exdate.trim());
            vevent.addPropertyWithValue("exdate", time);
          });
          this.log.debug("Added EXDATE to VEVENT", { exdateValue });
        }
      });

      return vcalendar.toString();
    } catch (error) {
      this.log.error("Error adding recurrence to ICS", { error, rruleStrings });
      throw error;
    }
  }

  /**
   * Formats a date for RECURRENCE-ID in iCalendar format (YYYYMMDDTHHmmssZ)
   */
  private formatRecurrenceId(date: Date): string {
    return `${dayjs(date).utc().format("YYYYMMDDTHHmmss")}Z`;
  }

  /**
   * Creates an instance event for an existing recurring series
   * This modifies a specific occurrence of the recurring event
   */
  private async createRecurringInstanceEvent(
    event: CalendarServiceEvent,
    credentialId: number,
    calendars: IntegrationCalendar[],
    recurringEventId: string
  ): Promise<NewCalendarEventType> {
    try {
      const instanceUid = `${recurringEventId}_${Date.now()}`;

      this.log.debug("Creating recurring instance event", {
        instanceUid,
        recurringEventId,
        startTime: event.startTime,
      });

      // Create an instance event with RECURRENCE-ID
      const recurrenceId = this.formatRecurrenceId(new Date(event.startTime));

      const { error, value: iCalString } = createEvent({
        uid: recurringEventId, // Use the same UID as the master event
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

      if (error || !iCalString) {
        throw new Error(`Error creating instance iCalString:=> ${error?.message} : ${error?.name}`);
      }

      // Add RECURRENCE-ID to the ICS to mark this as an exception/instance
      const jcalData = ICAL.parse(iCalString);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) {
        throw new Error("No VEVENT found in instance ICS string");
      }

      const recurrenceTime = ICAL.Time.fromString(recurrenceId);
      vevent.addPropertyWithValue("recurrence-id", recurrenceTime);

      const finalICalString = vcalendar.toString();

      const mainHostDestinationCalendar = event.destinationCalendar
        ? event.destinationCalendar.find((cal) => cal.credentialId === credentialId) ??
          event.destinationCalendar[0]
        : undefined;

      // Create the instance event
      const responses = await Promise.all(
        calendars
          .filter((c) =>
            mainHostDestinationCalendar?.externalId
              ? c.externalId === mainHostDestinationCalendar.externalId
              : true
          )
          .map((calendar) =>
            createCalendarObject({
              calendar: {
                url: calendar.externalId,
              },
              filename: `${instanceUid}.ics`,
              iCalString: finalICalString.replace(/METHOD:[^\r\n]+\r\n/g, ""),
              headers: this.headers,
            })
          )
      );

      if (responses.some((r) => !r.ok)) {
        throw new Error(
          `Error creating instance event: ${(await Promise.all(responses.map((r) => r.text()))).join(", ")}`
        );
      }

      this.log.info("Recurring instance event created successfully", {
        instanceUid,
        recurringEventId,
      });

      return {
        uid: instanceUid,
        id: instanceUid,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {},
        thirdPartyRecurringEventId: recurringEventId,
      };
    } catch (error) {
      this.log.error("Error creating recurring instance event", {
        error,
        recurringEventId,
      });
      throw error;
    }
  }

  /**
   * Updates a specific recurring instance by creating an exception event with RECURRENCE-ID
   */
  private async updateSpecificRecurringInstance(
    uid: string,
    event: CalendarServiceEvent
  ): Promise<NewCalendarEventType> {
    try {
      this.log.info("Updating specific recurring instance", {
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });

      // Parse the instance UID to extract the master event ID
      // Format could be: {masterEventId}_{timestamp} or just the master ID
      const masterEventId = uid.includes("_") ? uid.split("_")[0] : uid;

      this.log.debug("Parsed recurring instance UID", {
        originalUid: uid,
        masterEventId,
      });

      // Calculate event duration to maintain it after reschedule
      const eventDurationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
      const newStartTime = new Date(event.rescheduleInstance!.newTime);
      const newEndTime = new Date(newStartTime.getTime() + eventDurationMs);

      // The RECURRENCE-ID should reference the ORIGINAL start time
      const originalRecurrenceId = this.formatRecurrenceId(new Date(event.rescheduleInstance!.formerTime));

      // Create an exception event with the new time but original RECURRENCE-ID
      const { error, value: iCalString } = createEvent({
        uid: masterEventId, // Use the master event UID
        startInputType: "utc",
        start: convertDate(newStartTime.toISOString()),
        duration: getDuration(newStartTime.toISOString(), newEndTime.toISOString()),
        title: event.title,
        description: event.calendarDescription || getRichDescription(event),
        location: getLocation(event),
        organizer: { email: event.organizer.email, name: event.organizer.name },
        attendees: this.getAttendees(event),
        ...(event.hideCalendarEventDetails ? { classification: "PRIVATE" } : {}),
      });

      if (error || !iCalString) {
        throw new Error(`Error creating exception iCalString:=> ${error?.message} : ${error?.name}`);
      }

      // Add RECURRENCE-ID to mark this as an exception
      const jcalData = ICAL.parse(iCalString);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) {
        throw new Error("No VEVENT found in exception ICS string");
      }

      const recurrenceTime = ICAL.Time.fromString(originalRecurrenceId);
      vevent.addPropertyWithValue("recurrence-id", recurrenceTime);

      const finalICalString = vcalendar.toString();

      // Get the calendars to update
      const calendars = await this.listCalendars(event);
      const exceptionUid = `${masterEventId}_${Date.now()}`;

      // Create/update the exception event
      const responses = await Promise.all(
        calendars.map((calendar) =>
          createCalendarObject({
            calendar: {
              url: calendar.externalId,
            },
            filename: `${exceptionUid}.ics`,
            iCalString: finalICalString.replace(/METHOD:[^\r\n]+\r\n/g, ""),
            headers: this.headers,
          })
        )
      );

      if (responses.some((r) => !r.ok)) {
        throw new Error(
          `Error creating exception event: ${(await Promise.all(responses.map((r) => r.text()))).join(", ")}`
        );
      }

      this.log.info("Successfully updated recurring instance", {
        exceptionUid,
        masterEventId,
        newStart: newStartTime.toISOString(),
        newEnd: newEndTime.toISOString(),
      });

      return {
        uid: exceptionUid,
        id: exceptionUid,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: {},
      };
    } catch (error) {
      this.log.error("Error updating specific recurring instance", {
        error,
        uid,
        formerTime: event.rescheduleInstance?.formerTime,
        newTime: event.rescheduleInstance?.newTime,
      });
      throw error;
    }
  }

  /**
   * Cancels specific instances of a recurring event by adding EXDATE entries
   */
  private async cancelSpecificInstances(uid: string, cancelledDates: string[]): Promise<void> {
    try {
      this.log.debug("Cancelling specific instances", {
        uid,
        cancelledDatesCount: cancelledDates.length,
      });

      // Fetch the master event
      const events = await this.getEventsByUID(uid);
      const masterEvent = events.find((e) => e.uid === uid && !e.recurrenceId);

      if (!masterEvent) {
        this.log.warn("Master event not found, attempting to delete all instances", { uid });
        await this.deleteEvent(uid);
        return;
      }

      // Fetch the event's ICS data
      const calendars = await this.listCalendars();
      let eventData: string | null = null;
      let eventUrl: string | null = null;
      let eventEtag: string | undefined;

      for (const calendar of calendars) {
        const objects = await fetchCalendarObjects({
          calendar: { url: calendar.externalId },
          objectUrls: [`${calendar.externalId}${uid}.ics`],
          headers: this.headers,
        });

        if (objects.length > 0 && objects[0].data) {
          eventData = objects[0].data;
          eventUrl = objects[0].url;
          eventEtag = objects[0].etag;
          break;
        }
      }

      if (!eventData || !eventUrl) {
        throw new Error("Could not fetch master event data");
      }

      // Parse the ICS data
      const jcalData = ICAL.parse(sanitizeCalendarObject({ data: eventData }));
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) {
        throw new Error("No VEVENT found in master event");
      }

      // Check if it's a recurring event
      const existingRRule = vevent.getFirstProperty("rrule");
      if (!existingRRule) {
        this.log.warn("Event is not recurring, deleting entire event instead", { uid });
        await this.deleteEvent(uid);
        return;
      }

      // Get existing EXDATEs
      const existingExdates: ICAL.Time[] = [];
      const exdateProperties = vevent.getAllProperties("exdate");
      exdateProperties.forEach((prop) => {
        const exdateValue = prop.getFirstValue();
        if (exdateValue) {
          existingExdates.push(exdateValue);
        }
      });

      this.log.debug("Fetched existing event with recurrence", {
        uid,
        hasRRule: !!existingRRule,
        existingExdatesCount: existingExdates.length,
      });

      // Convert cancelledDates to ICAL.Time and add them as EXDATEs
      const newExdates = cancelledDates
        .map((dateStr) => {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            this.log.warn("Invalid date string, skipping", { dateStr });
            return null;
          }
          const formattedDate = this.formatRecurrenceId(date);
          return ICAL.Time.fromString(formattedDate);
        })
        .filter(Boolean) as ICAL.Time[];

      // Remove old EXDATE properties and add merged ones
      exdateProperties.forEach((prop) => vevent.removeProperty(prop));

      const allExdates = [...existingExdates, ...newExdates];
      allExdates.forEach((exdate) => {
        vevent.addPropertyWithValue("exdate", exdate);
      });

      this.log.info("Updating recurring event with new EXDATEs", {
        uid,
        addedCount: newExdates.length,
        totalExdates: allExdates.length,
      });

      // Update the event on the CalDAV server
      const updatedICalString = vcalendar.toString();
      const response = await updateCalendarObject({
        calendarObject: {
          url: eventUrl,
          data: updatedICalString.replace(/METHOD:[^\r\n]+\r\n/g, ""),
          etag: eventEtag,
        },
        headers: this.headers,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Failed to update event with EXDATEs: ${response.status}`);
      }

      this.log.info("Successfully updated recurring event with cancelled instances", {
        uid,
        totalCancelled: cancelledDates.length,
      });
    } catch (error) {
      this.log.error("Error updating recurring event with EXDATEs", {
        error,
        uid,
        cancelledDatesCount: cancelledDates.length,
      });
      throw error;
    }
  }
}
