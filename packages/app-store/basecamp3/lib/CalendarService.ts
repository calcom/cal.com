/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>
import type { Prisma } from "@prisma/client";
import ICAL from "ical.js";
import type { Attendee, DateArray, DurationObject, Person } from "ics";
import { createEvent } from "ics";
import type { DAVAccount } from "tsdav";
import { createAccount, fetchCalendarObjects, updateCalendarObject } from "tsdav";

import dayjs from "@calcom/dayjs";
import { getLocation, getRichDescription } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
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

import { userAgent } from "./constants";
import { getBasecampKeys } from "./getBasecampKeys";

const TIMEZONE_FORMAT = "YYYY-MM-DDTHH:mm:ss[Z]";
const DEFAULT_CALENDAR_TYPE = "caldav";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

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

const convertDate = (date: string): DateArray =>
  dayjs(date)
    .utc()
    .toArray()
    .slice(0, 6)
    .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray;

const getDuration = (start: string, end: string): DurationObject => ({
  minutes: dayjs(end).diff(dayjs(start), "minute"),
});

const getAttendees = (attendees: Person[]): Attendee[] =>
  attendees.map(({ email, name }) => ({ name, email, partstat: "NEEDS-ACTION" }));

export default class BasecampCalendarService implements Calendar {
  private url = "";
  private credentials: Record<string, string> = {};
  private auth: Promise<{ configureToken: () => Promise<void> }>;
  private headers: Record<string, string> = {};
  protected integrationName = "";
  private accessToken = "";
  private scheduleId = "";
  private userId = "";
  private projectId = "";
  private log: typeof logger;

  constructor(credential: CredentialPayload) {
    this.integrationName = "basecamp3";
    this.auth = this.basecampAuth(credential).then((c) => c);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
    console.log("HEEEK DONE INITIALIZING");
  }

  private basecampAuth = async (credential: CredentialPayload) => {
    const credentialKey = credential.key;
    this.scheduleId = credentialKey.scheduleId;
    this.userId = credentialKey.account.id;
    this.projectId = credentialKey.projectId;
    const isTokenValid = (credentialToken) => {
      const isValid = credentialToken.access_token && credentialToken.expires_at > Date.now();
      if (isValid) this.accessToken = credentialToken.access_token;
      return isValid;
    };
    const refreshAccessToken = async (credentialToken) => {
      try {
        const { client_id: clientId, client_secret: clientSecret } = await getBasecampKeys();
        const tokenInfo = await fetch(
          `https://launchpad.37signals.com/authorization/token?type=refresh&refresh_token=${credentialToken.refresh_token}&client_id=${clientId}&redirect_uri=${WEBAPP_URL}&client_secret=${clientSecret}`,
          { method: "POST", headers: { "User-Agent": userAgent } }
        );
        const tokenInfoJson = await tokenInfo.json();
        tokenInfoJson["expires_at"] = Date.now() + 1000 * 3600 * 24 * 14;
        this.accessToken = tokenInfoJson.access_token;
        await prisma?.credential.update({
          where: { userId: credential.userId },
          data: {
            key: { ...credentialKey, ...tokenInfoJson },
          },
        });
      } catch (err) {
        console.error(err);
      }
    };

    return {
      configureToken: () =>
        isTokenValid(credentialKey) ? Promise.resolve() : refreshAccessToken(credentialKey),
    };
  };

  private async getBasecampDescription(event: CalendarEvent): string {
    const timeZone = await this.getUserTimezoneFromDB(event.organizer.id);
    const date = new Date(event.startTime).toDateString();
    const startTime = new Date(event.startTime).toISOString();
    const endTime = new Date(event.endTime).toISOString();
    const baseString = `Event title: ${event.title}\nDate and time ${date}, ${startTime} - ${endTime} ${timeZone}\n View on Cal.com\n<a target=\"_blank\" rel=\"noreferrer\" class=\"autolinked\" data-behavior=\"truncate\" href=\"https://app.cal.com/booking/${event.uid}\">https://app.cal.com/booking/${event.uid}</a>`;
    const guestString =
      "\nGuests: " +
      event.attendees.reduce((acc, attendee) => {
        return (
          acc +
          `\n${attendee.name}:<a target=\"_blank\" rel=\"noreferrer\" class=\"autolinked\" data-behavior=\"truncate\" href=\"mailto:${attendee.email}\">${attendee.email}</a>\n`
        );
      }, "");

    const videoString = event.videoCallData ? `\nJoin on video: ${event.videoCallData.url}` : "";
    return baseString + guestString + videoString;
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const auth = await this.auth;
      await auth.configureToken();
      const description = await this.getBasecampDescription(event);
      const basecampEvent = await fetch(
        `https://3.basecampapi.com/${this.userId}/buckets/${this.projectId}/schedules/${this.scheduleId}/entries.json`,
        {
          method: "POST",
          headers: {
            "User-Agent": userAgent,
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
            summary: `Cal.com: ${event.title}`,
            starts_at: new Date(event.startTime).toISOString(),
            ends_at: new Date(event.endTime).toISOString(),
          }),
        }
      );
      const meetingJson = await basecampEvent.json();
      const id = meetingJson.id;
      this.log.debug("event:creation:ok", { json: meetingJson });
      console.log("EVENT_IDD", id);
      return Promise.resolve({
        id,
        uid: id,
        type: this.integrationName,
        password: "",
        url: "",
        additionalInfo: { meetingJson },
      });
    } catch (err) {
      this.log.debug("event:creation:notOk");
      Promise.reject({ error: "Unable to book basecamp meeting" });
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
        attendees: [
          ...getAttendees(event.attendees),
          ...(event.team?.members ? getAttendees(event.team.members) : []),
        ],
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
      console.log("UUUID", uid);
      const auth = await this.auth;
      await auth.configureToken();
      console.log(
        "URLTQ",
        `https://3.basecampapi.com/${this.userId}/buckets/${this.projectId}/recordings/${uid}/status/trashed.json`
      );
      const deletedEventResponse = await fetch(
        `https://3.basecampapi.com/${this.userId}/buckets/${this.projectId}/recordings/${uid}/status/trashed.json`,
        {
          method: "PUT",
          headers: {
            "User-Agent": userAgent,
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (deletedEventResponse.ok) {
        Promise.resolve("Deleted basecamp meeting");
      } else Promise.reject("Error cancelling basecamp event");
    } catch (reason) {
      this.log.error(reason);

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
    _dateFrom: string,
    _dateTo: string,
    _selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    return Promise.resolve([]);
  }

  async listCalendars(_event?: CalendarEvent): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
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
