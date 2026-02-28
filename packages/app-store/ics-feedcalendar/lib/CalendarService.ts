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
import { LRUCache } from "lru-cache";

const jcalCache = new LRUCache<string, ICAL.Component>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});

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
    const urlsToFetch = this.urls.filter((url) => !jcalCache.has(url));
    if (urlsToFetch.length > 0) {
      const reqPromises = await Promise.allSettled(urlsToFetch.map((x) => fetch(x).then((y) => [x, y] as [string, Response])));
      const reqs = reqPromises
        .filter((x) => x.status === "fulfilled")
        .map((x) => (x as PromiseFulfilledResult<[string, Response]>).value);
      const res = await Promise.all(reqs.map((x) => x[1].text().then((y) => [x[0], y])));

      res.forEach((x) => {
        try {
          const jcalData = ICAL.parse(x[1]);
          jcalCache.set(x[0], new ICAL.Component(jcalData));
        } catch (e) {
          console.error(`Error parsing calendar object from ${x[0]}: `, e);
        }
      });
    }

    return this.urls
      .map((url) => {
        const vcalendar = jcalCache.get(url);
        return vcalendar ? { url, vcalendar } : null;
      })
      .filter((x): x is { url: string; vcalendar: ICAL.Component } => x !== null);
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
    const startISOString = new Date(dateFrom).toISOString();

    const calendars = await this.fetchCalendars();

    const userId = this.getUserId(selectedCalendars);
    // we use the userId from selectedCalendars to fetch the user's timeZone from the database primarily for all-day events without any timezone information
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

    calendars.forEach(({ vcalendar }) => {
      const vevents = vcalendar.getAllSubcomponents("vevent");
      const vtimezones = vcalendar.getAllSubcomponents("vtimezone");
      const timezoneCache = new Map<string, ICAL.Timezone>();

      vevents.forEach((vevent) => {
        const event = new ICAL.Event(vevent);
        // Quick check: if the event is definitely outside our range and not recurring, skip it
        if (!event.isRecurring()) {
          const eventStart = event.startDate.toJSDate().getTime();
          const eventEnd = event.endDate.toJSDate().getTime();
          if (eventEnd < dateFrom || eventStart > dateTo) return;
        }

        const title = String(vevent.getFirstPropertyValue("summary"));
        const dtstartProperty = vevent.getFirstProperty("dtstart");
        const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1].tzid : undefined;

        const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
        const timezone = dtstart ? dtstart["timezone"] : undefined;
        const isUTC = timezone === "Z";

        const tzid: string | undefined =
          tzidFromDtstart || vevent?.getFirstPropertyValue("tzid") || (isUTC ? "UTC" : timezone);

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
              vtimezones.push(timezoneComp);
            } catch (e) {
              console.log("error in adding vtimezone", e);
            }
          }
        }

        let vtimezoneComp = null;
        if (tzid) {
          vtimezoneComp = vtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid);
        }

        if (!vtimezoneComp) {
          vtimezoneComp = vcalendar.getFirstSubcomponent("vtimezone");
        }

        const zone = vtimezoneComp ? (timezoneCache.get(vtimezoneComp.toString()) || (() => {
          const z = new ICAL.Timezone(vtimezoneComp);
          timezoneCache.set(vtimezoneComp.toString(), z);
          return z;
        })()) : null;

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

          while (maxIterations > 0 && (current = iterator.next())) {
            maxIterations -= 1;
            let currentEvent;
            try {
              currentEvent = event.getOccurrenceDetails(current);
            } catch (error) {
              continue;
            }
            if (!currentEvent) break;

            if (zone) {
              currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
              currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            }

            const currentStartMillis = currentEvent.startDate.toJSDate().getTime();
            const currentEndMillis = currentEvent.endDate.toJSDate().getTime();

            if (currentStartMillis <= dateTo && currentEndMillis >= dateFrom) {
              events.push({
                start: currentEvent.startDate.toJSDate().toISOString(),
                end: currentEvent.endDate.toJSDate().toISOString(),
                title,
              });
            }

            if (currentStartMillis > dateTo) break;
          }
          return;
        }

        if (zone) {
          event.startDate = event.startDate.convertToZone(zone);
          event.endDate = event.endDate.convertToZone(zone);
        }

        events.push({
          start: event.startDate.toJSDate().toISOString(),
          end: event.endDate.toJSDate().toISOString(),
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
