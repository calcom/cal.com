/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import process from "node:process";

import dayjs from "@calcom/dayjs";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
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

const log = logger.getSubLogger({ prefix: ["[proton-calendar]"] });

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

// ---------------------------------------------------------------------------
// 5-minute in-memory ICS cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: string;
  fetchedAt: number;
}

const ICS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url: string): Promise<string> {
  const cached = ICS_CACHE.get(url);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: { Accept: "text/calendar, application/ics" },
    // 10-second timeout via AbortController
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Do NOT include the URL in the error message — it is a secret access token
    throw new Error(
      `Proton Calendar ICS fetch failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  // Validate it looks like an ICS file
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error(
      `Proton Calendar ICS URL did not return a valid ICS file (missing BEGIN:VCALENDAR). ` +
        `Please check that the URL is a valid Proton Calendar share link.`
    );
  }

  ICS_CACHE.set(url, { data: text, fetchedAt: Date.now() });
  return text;
}

// ---------------------------------------------------------------------------
// Apple Travel Time helper (carried over from ics-feedcalendar for parity)
// ---------------------------------------------------------------------------
const getTravelDurationInSeconds = (vevent: ICAL.Component): number => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;
  try {
    const seconds = travelDuration.toSeconds();
    return Number.isInteger(seconds) ? seconds : 0;
  } catch {
    return 0;
  }
};

const applyTravelDuration = (event: ICAL.Event, seconds: number): ICAL.Event => {
  if (seconds <= 0) return event;
  event.startDate.second -= seconds;
  return event;
};

// ---------------------------------------------------------------------------
// ProtonCalendarService
// ---------------------------------------------------------------------------
class ProtonCalendarService implements Calendar {
  /** ICS URLs stored in the encrypted credential */
  private urls: string[] = [];
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    try {
      const decrypted = symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY);
      const parsed = JSON.parse(decrypted) as { url?: string; urls?: string[] };

      // Support both single-URL and multi-URL credential formats
      if (parsed.urls && Array.isArray(parsed.urls)) {
        this.urls = parsed.urls.filter(Boolean);
      } else if (parsed.url) {
        this.urls = [parsed.url];
      }
    } catch (e) {
      log.error("Failed to decrypt/parse Proton Calendar credential", e);
    }
  }

  // -------------------------------------------------------------------------
  // Read-only stubs — Proton Calendar ICS feeds are read-only
  // -------------------------------------------------------------------------
  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    log.warn("createEvent is not supported for Proton Calendar (read-only ICS feed)");
    return Promise.resolve({
      uid: _event.uid ?? "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: [
          "Proton Calendar is connected as a read-only ICS feed. Events cannot be created in Proton Calendar via Cal.com.",
        ],
      },
    });
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    log.warn("updateEvent is not supported for Proton Calendar (read-only ICS feed)");
    return Promise.resolve({
      uid: _event.uid ?? "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: [
          "Proton Calendar is connected as a read-only ICS feed. Events cannot be updated in Proton Calendar via Cal.com.",
        ],
      },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    log.warn("deleteEvent is not supported for Proton Calendar (read-only ICS feed)");
    return Promise.resolve();
  }

  // -------------------------------------------------------------------------
  // Fetch + parse all configured ICS URLs
  // -------------------------------------------------------------------------
  private fetchCalendars = async (): Promise<{ url: string; vcalendar: ICAL.Component }[]> => {
    if (this.urls.length === 0) {
      log.warn("No Proton Calendar ICS URLs configured");
      return [];
    }

    const results = await Promise.allSettled(
      this.urls.map(async (url) => {
        const icsText = await fetchWithCache(url);
        const jcalData = ICAL.parse(icsText);
        return { url, vcalendar: new ICAL.Component(jcalData) };
      })
    );

    const calendars: { url: string; vcalendar: ICAL.Component }[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        calendars.push(result.value);
      } else {
        log.error("Failed to fetch/parse Proton Calendar ICS feed", result.reason);
      }
    }
    return calendars;
  };

  // -------------------------------------------------------------------------
  // Retrieve the user's timezone from the database (for all-day event handling)
  // -------------------------------------------------------------------------
  private getUserTimezoneFromDB = async (userId: number): Promise<string | undefined> => {
    try {
      const prisma = await import("@calcom/prisma").then((mod) => mod.default);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { timeZone: true },
      });
      return user?.timeZone;
    } catch (e) {
      log.warn("Could not fetch user timezone from DB", e);
      return undefined;
    }
  };

  private getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
    if (selectedCalendars.length === 0) return null;
    return selectedCalendars[0].userId ?? null;
  };

  // -------------------------------------------------------------------------
  // getAvailability — main method called by Cal.com to find busy times
  // -------------------------------------------------------------------------
  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();

    const calendars = await this.fetchCalendars();
    if (calendars.length === 0) return [];

    const userId = this.getUserId(selectedCalendars);
    const userTimeZone = userId ? await this.getUserTimezoneFromDB(userId) : undefined;
    const fallbackTz = userTimeZone ?? "Europe/London";

    const events: EventBusyDate[] = [];

    for (const { vcalendar } of calendars) {
      const vevents = vcalendar.getAllSubcomponents("vevent");

      for (const vevent of vevents) {
        try {
          const event = new ICAL.Event(vevent);
          const title = String(vevent.getFirstPropertyValue("summary") ?? "");

          // Resolve timezone for this event
          const dtstartProperty = vevent.getFirstProperty("dtstart");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1]?.tzid : undefined;
          const dtstart: { timezone?: string } | undefined = vevent.getFirstPropertyValue("dtstart");
          const timezone = dtstart?.timezone;
          const isUTC = timezone === "Z";
          const tzid: string | undefined =
            tzidFromDtstart ?? vevent.getFirstPropertyValue("tzid") ?? (isUTC ? "UTC" : timezone);

          // Inject a vtimezone component if the calendar doesn't have one
          if (!vcalendar.getFirstSubcomponent("vtimezone")) {
            const timezoneToUse = tzid ?? fallbackTz;
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
              log.warn("Could not inject vtimezone component", e);
            }
          }

          // Resolve vtimezone for conversion
          let vtimezone: ICAL.Component | null = null;
          if (tzid) {
            const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
            vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid) ?? null;
          }
          if (!vtimezone) {
            vtimezone = vcalendar.getFirstSubcomponent("vtimezone");
          }

          // Apply Apple Travel Time extension if present
          applyTravelDuration(event, getTravelDurationInSeconds(vevent));

          if (event.isRecurring()) {
            // Skip sub-hourly recurrences — they'd cause runaway iteration
            if (["HOURLY", "SECONDLY", "MINUTELY"].includes(event.getRecurrenceTypes())) {
              log.warn(`Skipping ${event.getRecurrenceTypes()} recurring event — too granular`);
              continue;
            }

            const rangeStart = dayjs(dateFrom);
            const rangeEnd = dayjs(dateTo);
            const startDate = ICAL.Time.fromDateTimeString(startISOString);
            startDate.hour = event.startDate.hour;
            startDate.minute = event.startDate.minute;
            startDate.second = event.startDate.second;

            const iterator = event.iterator(startDate);
            let maxIterations = 365;
            let currentStart: dayjs.Dayjs | null = null;
            let currentError: string | undefined;
            let current: ICAL.Time;

            while (
              maxIterations-- > 0 &&
              (currentStart === null || !currentStart.isAfter(rangeEnd)) &&
              (current = iterator.next())
            ) {
              let currentEvent: ICAL.OccurrenceDetails | undefined;
              try {
                currentEvent = event.getOccurrenceDetails(current);
              } catch (error) {
                if (error instanceof Error && error.message !== currentError) {
                  currentError = error.message;
                  log.warn("Error expanding recurring event occurrence", error.message);
                }
                continue;
              }
              if (!currentEvent) continue;

              if (vtimezone) {
                const zone = new ICAL.Timezone(vtimezone);
                currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
                currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
              }

              currentStart = dayjs(currentEvent.startDate.toJSDate());
              if (currentStart.isBetween(rangeStart, rangeEnd, null, "[)")) {
                events.push({
                  start: currentStart.toISOString(),
                  end: dayjs(currentEvent.endDate.toJSDate()).toISOString(),
                  title,
                });
              }
            }

            if (maxIterations <= 0) {
              log.warn("Hit 365-iteration limit expanding recurring Proton Calendar event");
            }
            continue;
          }

          // Non-recurring event
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
        } catch (e) {
          log.warn("Failed to process a VEVENT from Proton Calendar feed", e);
        }
      }
    }

    return events;
  }

  // -------------------------------------------------------------------------
  // listCalendars — returns the list of configured Proton Calendar feeds
  // -------------------------------------------------------------------------
  async listCalendars(): Promise<IntegrationCalendar[]> {
    const calendars = await this.fetchCalendars();

    return calendars.map(({ url, vcalendar }) => {
      const name: string = vcalendar.getFirstPropertyValue("x-wr-calname") ?? "Proton Calendar";
      return {
        externalId: url,
        integration: this.integrationName,
        name,
        readOnly: true,
        primary: false,
      };
    });
  }
}

/**
 * Factory function that creates a Proton Calendar service instance.
 * Exported as a function to avoid leaking internal types into emitted .d.ts.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
