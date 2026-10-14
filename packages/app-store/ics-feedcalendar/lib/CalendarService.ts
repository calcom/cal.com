/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import process from "node:process";
import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import ICAL from "ical.js";

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
  } catch {
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  // move event start date back by the specified travel time
  event.startDate.second -= seconds;
  return event;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Returns a seed for event.iterator() that is a whole number of periods after DTSTART and ends at least one period
 * before windowStartMs, or undefined to iterate from DTSTART. ical.js takes the seed as DTSTART, so it may only move
 * by whole periods (this keeps the weekday and the INTERVAL phase), and it is always emitted as the first occurrence
 * even when BYDAY would exclude it, so it must lie before the window. Rules with COUNT depend on the occurrences
 * before the window and MONTHLY/YEARLY rules have no fixed period, so they are never seeded.
 */
const getSkipAheadSeed = (
  vevent: ICAL.Component,
  event: ICAL.Event,
  windowStartMs: number
): ICAL.Time | undefined => {
  const rrules = vevent.getAllProperties("rrule");
  if (rrules.length !== 1 || vevent.hasProperty("rdate")) return undefined;

  const rrule = rrules[0].getFirstValue<ICAL.Recur>();
  if (rrule.count || !["DAILY", "WEEKLY"].includes(rrule.freq)) return undefined;

  const daysPerInterval = rrule.freq === "WEEKLY" ? 7 : 1;
  const periodDays = (rrule.toJSON().interval ?? 1) * daysPerInterval;
  const occurrenceEndMs = event.startDate.toUnixTime() * 1000 + event.duration.toSeconds() * 1000;
  // floating times are read as UTC here, off by at most a day, which the extra period absorbs
  const periods = Math.floor((windowStartMs - occurrenceEndMs) / (periodDays * DAY_IN_MS)) - 1;
  if (periods <= 0) return undefined;

  const seed = event.startDate.clone();
  seed.adjust(periods * periodDays, 0, 0, 0);
  return seed;
};

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

class ICSFeedCalendarService implements Calendar {
  private urls: string[] = [];
  protected integrationName = "ics-feed_calendar";

  constructor(credential: CredentialPayload) {
    const { urls } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
    this.urls = urls;
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    console.warn("createEvent called on ICS (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["ICS feed is read-only"] },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    console.warn("deleteEvent called on ICS (read-only) feed");
    return Promise.resolve();
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    console.warn("updateEvent called on ICS (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["ICS feed is read-only"] },
    });
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

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;

    const calendars = await this.fetchCalendars();

    const userId = this.getUserId(selectedCalendars);
    // we use the userId from selectedCalendars to fetch the user's timeZone from the database primarily for all-day events without any timezone information
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

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
        const title = String(vevent.getFirstPropertyValue("summary"));
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1].tzid : undefined;

        const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
        const timezone = dtstart ? dtstart["timezone"] : undefined;
        // We check if the dtstart timezone is in UTC which is actually represented by Z instead, but not recognized as that in ICAL.js as UTC
        const isUTC = timezone === "Z";

        // Fix precedence: prioritize TZID from DTSTART property, then standalone TZID, then UTC, then fallback
        const tzid: string | undefined =
          tzidFromDtstart || vevent?.getFirstPropertyValue("tzid") || (isUTC ? "UTC" : timezone);
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

        let vtimezone = null;
        if (tzid) {
          const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
          vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }

        if (!vtimezone) {
          vtimezone = vcalendar.getFirstSubcomponent("vtimezone");
        }

        // mutate event to consider travel time
        applyTravelDuration(event, getTravelDurationInSeconds(vevent));

        if (event.isRecurring()) {
          let maxIterations = 5000;
          // getRecurrenceTypes() returns an object keyed by FREQ, e.g. { HOURLY: true }
          const recurrenceTypes = Object.keys(event.getRecurrenceTypes());
          if (recurrenceTypes.some((type) => ["HOURLY", "SECONDLY", "MINUTELY"].includes(type))) {
            console.error(`Won't handle [${recurrenceTypes}] recurrence`);
            return;
          }

          const start = dayjs(dateFrom);
          const end = dayjs(dateTo);
          const iterator = event.iterator(getSkipAheadSeed(vevent, event, start.valueOf()));
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
                title,
              });
            }
          }
          if (maxIterations <= 0) {
            console.warn("could not find any occurrence for recurring event in 5000 iterations");
          }
          return;
        }

        if (vtimezone) {
          const zone = new ICAL.Timezone(vtimezone);
          event.startDate = event.startDate.convertToZone(zone);
          event.endDate = event.endDate.convertToZone(zone);
        }

        const finalStartISO = dayjs(event.startDate.toJSDate()).toISOString();
        const finalEndISO = dayjs(event.endDate.toJSDate()).toISOString();
        return events.push({
          start: finalStartISO,
          end: finalEndISO,
          title,
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
        integration: this.integrationName,
      };
    });
  }
}

/**
 * Factory function that creates an ICS Feed Calendar service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ICSFeedCalendarService(credential);
}
