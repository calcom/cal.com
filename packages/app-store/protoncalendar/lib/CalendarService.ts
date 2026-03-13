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

  try {
    const travelSeconds = travelDuration.toSeconds();
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch {
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number) => {
  if (seconds <= 0) return event;
  event.startDate.second -= seconds;
  return event;
};

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

const ALLOWED_DOMAINS = ["proton.me", "protonmail.com", "calendar.proton.me"];

function validateProtonUrl(urlString: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format in Proton Calendar credential");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Proton Calendar ICS feed URL must use HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    throw new Error(
      `Proton Calendar ICS feed URL must be from a Proton domain (${ALLOWED_DOMAINS.join(", ")})`
    );
  }
}

class ProtonCalendarService implements Calendar {
  private url: string = "";
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    const { url } = JSON.parse(symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY));
    validateProtonUrl(url);
    this.url = url;
  }

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    console.warn("createEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar feed is read-only"] },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    console.warn("deleteEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve();
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    console.warn("updateEvent called on Proton Calendar (read-only) feed");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar feed is read-only"] },
    });
  }

  fetchCalendar = async (): Promise<{ url: string; vcalendar: ICAL.Component } | null> => {
    let response: Response;
    try {
      response = await fetch(this.url);
    } catch (e) {
      throw new Error(`Failed to fetch Proton Calendar ICS feed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Re-validate the final URL after any HTTP redirects to prevent SSRF bypass.
    // fetch() follows redirects by default; the resolved response.url may differ
    // from this.url if the server issued a redirect to an off-allowlist domain.
    if (response.url && response.url !== this.url) {
      validateProtonUrl(response.url);
    }

    if (response.status === 401) {
      throw new Error(
        "401 Unauthorized: The ICS feed requires authentication. Use a public sharing link from Proton Calendar."
      );
    }
    if (response.status === 403) {
      throw new Error(
        "403 Forbidden: Access to the ICS feed is denied. Set sharing to 'Anyone with the link' in Proton Calendar."
      );
    }
    if (response.status === 404) {
      throw new Error("404 Not Found: The ICS feed URL is invalid or the calendar no longer exists.");
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch Proton Calendar ICS feed`);
    }

    const text = await response.text();
    // Propagate parse errors instead of returning null (fail-open).
    // A broken ICS feed must not silently appear as an empty calendar.
    let jcalData;
    try {
      jcalData = ICAL.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse Proton Calendar ICS data: ${e instanceof Error ? e.message : String(e)}`);
    }
    return {
      url: this.url,
      vcalendar: new ICAL.Component(jcalData),
    };
  };

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

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();

    const calendarData = await this.fetchCalendar();
    if (!calendarData) return [];

    const { vcalendar } = calendarData;
    const userId = this.getUserId(selectedCalendars);
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

    const vevents = vcalendar.getAllSubcomponents("vevent");

    // First pass: collect RECURRENCE-IDs of cancelled exception VEVENTs.
    // Recurring series exception VEVENTs with STATUS:CANCELLED indicate that a
    // specific occurrence is cancelled. We must record these BEFORE processing
    // the master VEVENT so cancelled occurrences can be skipped during expansion.
    const cancelledRecurrenceIds = new Set<string>();
    vevents.forEach((vevent) => {
      const status = vevent.getFirstPropertyValue("status") as string | null;
      if (status && String(status).toUpperCase() === "CANCELLED") {
        const recurrenceId = vevent.getFirstPropertyValue("recurrence-id") as ICAL.Time | null;
        if (recurrenceId) {
          cancelledRecurrenceIds.add(recurrenceId.toISOString());
        }
      }
    });

    vevents.forEach((vevent) => {
      // Skip cancelled events (Proton marks cancelled recurring instances with STATUS:CANCELLED)
      const status = vevent.getFirstPropertyValue("status") as string | null;
      if (status && String(status).toUpperCase() === "CANCELLED") return;

      const event = new ICAL.Event(vevent);
      const title = String(vevent.getFirstPropertyValue("summary") ?? "");
      const dtstartProperty = vevent.getFirstProperty("dtstart");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          } catch (e) {
            console.log("error in adding vtimezone", e);
          }
        } else {
          console.error("No timezone found for Proton Calendar event");
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

      applyTravelDuration(event, getTravelDurationInSeconds(vevent));

      if (event.isRecurring()) {
        let maxIterations = 365;
        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
          console.error(`Won't handle [${event.getRecurrenceTypes()}] recurrence in Proton Calendar`);
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
          (current = iterator.next())
        ) {
          maxIterations -= 1;
          try {
            currentEvent = event.getOccurrenceDetails(current);
          } catch (error) {
            if (error instanceof Error && error.message !== currentError) {
              currentError = error.message;
            }
          }
          if (!currentEvent) return;

          // Skip occurrences cancelled via a STATUS:CANCELLED exception VEVENT.
          if (cancelledRecurrenceIds.has(currentEvent.startDate.toISOString())) {
            continue;
          }

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
          console.warn("Proton Calendar: could not find any occurrence in 365 iterations");
        }
        return;
      }

      if (vtimezone) {
        const zone = new ICAL.Timezone(vtimezone);
        event.startDate = event.startDate.convertToZone(zone);
        event.endDate = event.endDate.convertToZone(zone);
      }

      events.push({
        start: dayjs(event.startDate.toJSDate()).toISOString(),
        end: dayjs(event.endDate.toJSDate()).toISOString(),
        title,
      });
    });

    return Promise.resolve(events);
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const calendarData = await this.fetchCalendar();
    if (!calendarData) return [];

    const { url, vcalendar } = calendarData;
    const name: string = vcalendar.getFirstPropertyValue("x-wr-calname") ?? "Proton Calendar";
    return [
      {
        name,
        readOnly: true,
        externalId: url,
        integration: this.integrationName,
      },
    ];
  }
}

/**
 * Factory function that creates a Proton Calendar service instance.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
