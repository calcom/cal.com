/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>
import ICAL from "ical.js";

import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import type {
  Calendar,
  IntegrationCalendar,
  EventBusyDate,
  CalendarEvent,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

// for Apple's Travel Time feature only (for now)
const getTravelDurationInSeconds = (vevent: ICAL.Component) => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;

  // we can't rely on this being a valid duration and it's painful to check, so just try and catch if anything throws
  try {
    const travelSeconds = travelDuration.toSeconds();
    // integer validation as we can never be sure with ical.js
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch (e) {
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  // move event start date back by the specified travel time
  event.startDate.second -= seconds;
  return event;
};

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

export default class ICSFeedCalendarService implements Calendar {
  private urls: string[] = [];
  protected integrationName = "ics-feed_calendar";

  constructor(credential: CredentialPayload) {
    const { urls } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
    this.urls = urls;
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    throw new Error("createEvent called on read-only ICS feed");
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    throw new Error("deleteEvent called on read-only ICS feed");
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    throw new Error("updateEvent called on read-only ICS feed");
  }

  fetchCalendars = async (): Promise<{ url: string; vcalendar: ICAL.Component }[]> => {
    const reqPromises = await Promise.allSettled(this.urls.map((x) => fetch(x).then((y) => [x, y])));
    const reqs = reqPromises
      .filter((x) => x.status === "fulfilled")
      .map((x) => (x as PromiseFulfilledResult<[string, Response]>).value);
    const res = await Promise.all(reqs.map((x) => x[1].text().then((y) => [x[0], y])));
    return res
      .map((x) => {
        try {
          const jcalData = ICAL.parse(x[1]);
          return {
            url: x[0],
            vcalendar: new ICAL.Component(jcalData),
          };
        } catch (e) {
          console.error("Error parsing calendar object: ", e);
          return null;
        }
      })
      .filter((x) => x !== null) as { url: string; vcalendar: ICAL.Component }[];
  };

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

  async getAvailability(
    dateFrom: string,
    dateTo: string,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<EventBusyDate[]> {
    const startISOString = new Date(dateFrom).toISOString();

    const calendars = await this.fetchCalendars();

    const userId = this.getUserId(selectedCalendars);
    // we use the userId from selectedCalendars to fetch the user's timeZone from the database primarily for all-day events without any timezone information
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string }[] = [];

    calendars.forEach(({ vcalendar }) => {
      const vevents = vcalendar.getAllSubcomponents("vevent");
      vevents.forEach((vevent) => {
        // if event status is free or transparent, DON'T return (unlike usual getAvailability)
        //
        // commented out because a lot of public ICS feeds that describe stuff like
        // public holidays have them marked as transparent. if that is explicitly
        // added to cal.com as an ICS feed, it should probably not be ignored.
        // if (vevent?.getFirstPropertyValue("transp") === "TRANSPARENT") return;

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
        applyTravelDuration(event, getTravelDurationInSeconds(vevent));

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

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const vcals = await this.fetchCalendars();

    return vcals.map(({ url, vcalendar }) => {
      const name: string = vcalendar.getFirstPropertyValue("x-wr-calname");
      return {
        name,
        readOnly: true,
        externalId: url,
        integrationName: this.integrationName,
      };
    });
  }
}
