/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import crypto from "node:crypto";
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
import { getUserTimezoneFromDB, getUserId } from "../../_utils/calendars/icsCalendarUtils";

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
      // Use redirect:'manual' to intercept any HTTP redirect before it is followed.
      // This lets us validate the destination URL against the allowlist BEFORE
      // sending a request there, preventing redirect-based SSRF attacks.
      response = await fetch(this.url, { redirect: "manual" });
    } catch (e) {
      throw new Error(`Failed to fetch Proton Calendar ICS feed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Handle HTTP redirects securely: validate the Location before following.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Received redirect without Location header from Proton Calendar feed");
      }
      // Resolve relative redirects and validate the destination is a Proton domain.
      const resolvedUrl = new URL(location, this.url).toString();
      validateProtonUrl(resolvedUrl);
      try {
        // Follow at most one hop; reject further redirects.
        response = await fetch(resolvedUrl, { redirect: "error" });
      } catch (e) {
        throw new Error(
          `Failed to fetch Proton Calendar ICS feed after redirect: ${e instanceof Error ? e.message : String(e)}`
        );
      }
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

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    const startISOString = new Date(dateFrom).toISOString();

    const calendarData = await this.fetchCalendar();
    if (!calendarData) return [];

    const { vcalendar } = calendarData;
    const userId = getUserId(selectedCalendars);
    const userTimeZone = userId ? await getUserTimezoneFromDB(userId) : "Europe/London";
    const events: { start: string; end: string; title: string }[] = [];

    const vevents = vcalendar.getAllSubcomponents("vevent");

    // First pass: collect RECURRENCE-IDs of cancelled exception VEVENTs.
    // Recurring series exception VEVENTs with STATUS:CANCELLED indicate that a
    // specific occurrence is cancelled. We must record these BEFORE processing
    // the master VEVENT so cancelled occurrences can be skipped during expansion.
    // Map of "uid:recurrenceIdISO" for cancelled exception VEVENTs.
    // Including the UID prevents a cancellation in one series from incorrectly
    // suppressing an occurrence in a different series at the same timestamp.
    const cancelledRecurrenceIds = new Set<string>();
    vevents.forEach((vevent) => {
      const status = vevent.getFirstPropertyValue("status") as string | null;
      if (status && String(status).toUpperCase() === "CANCELLED") {
        const recurrenceId = vevent.getFirstPropertyValue("recurrence-id") as ICAL.Time | null;
        if (recurrenceId) {
          const uid = (vevent.getFirstPropertyValue("uid") as string | null) ?? "";
          cancelledRecurrenceIds.add(`${uid}:${recurrenceId.toISOString()}`);
        }
      }
    });

    // Build a map of non-cancelled exception VEVENTs (those with RECURRENCE-ID) by UID.
    // These represent modified occurrences in a recurring series. We must relate them to
    // the master event so the iterator substitutes modified times/details during expansion,
    // rather than treating them as independent events (which causes duplicates).
    const exceptionsByUID = new Map<string, ICAL.Component[]>();
    const masterUIDs = new Set<string>();
    vevents.forEach((vevent) => {
      const status = vevent.getFirstPropertyValue("status") as string | null;
      if (status && String(status).toUpperCase() === "CANCELLED") return;
      const recurrenceId = vevent.getFirstPropertyValue("recurrence-id") as ICAL.Time | null;
      const uid = (vevent.getFirstPropertyValue("uid") as string | null) ?? "";
      if (recurrenceId) {
        if (!exceptionsByUID.has(uid)) exceptionsByUID.set(uid, []);
        exceptionsByUID.get(uid)!.push(vevent);
      } else {
        masterUIDs.add(uid);
      }
    });

    vevents.forEach((vevent) => {
      // Skip cancelled events (Proton marks cancelled recurring instances with STATUS:CANCELLED)
      const status = vevent.getFirstPropertyValue("status") as string | null;
      if (status && String(status).toUpperCase() === "CANCELLED") return;

      // Skip exception VEVENTs (those with RECURRENCE-ID) when the master VEVENT is present.
      // They are related to the master event below and handled by the iterator automatically.
      const recurrenceId = vevent.getFirstPropertyValue("recurrence-id") as ICAL.Time | null;
      if (recurrenceId) {
        const uid = (vevent.getFirstPropertyValue("uid") as string | null) ?? "";
        if (masterUIDs.has(uid)) return;
      }

      const event = new ICAL.Event(vevent);

      // Relate non-cancelled exception VEVENTs (modified occurrences) to this master event
      // so the recurrence iterator correctly substitutes their modified times/details.
      const uid = (vevent.getFirstPropertyValue("uid") as string | null) ?? "";
      for (const exVevent of exceptionsByUID.get(uid) ?? []) {
        try { event.relateException(new ICAL.Event(exVevent)); } catch { /* ignore malformed */ }
      }

      const title = String(vevent.getFirstPropertyValue("summary") ?? "");
      const dtstartProperty = vevent.getFirstProperty("dtstart");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tzidFromDtstart = dtstartProperty ? (dtstartProperty as any).jCal[1].tzid : undefined;

      const dtstart: { [key: string]: string } | undefined = vevent?.getFirstPropertyValue("dtstart");
      const timezone = dtstart ? dtstart["timezone"] : undefined;
      const isUTC = timezone === "Z";

      const tzid: string | undefined =
        tzidFromDtstart || vevent?.getFirstPropertyValue("tzid") || (isUTC ? "UTC" : timezone);

      if (!vcalendar.getFirstSubcomponent("vtimezone") && !tzid && !userTimeZone) {
        console.error("No timezone found for Proton Calendar event");
        // When no VTIMEZONE component exists and tzid is known, DST-correct
        // conversion uses dayjs.tz() directly in the event-push sections below,
        // avoiding mis-conversion from a synthetic STANDARD-only vtimezone.
      }

      let vtimezone = null;
      if (tzid) {
        // Per RFC 5545 §3.6.5, TZID must match a VTIMEZONE with the same TZID property.
        // Do NOT fall back to the first VTIMEZONE when no matching component exists.
        const allVtimezones = vcalendar.getAllSubcomponents("vtimezone");
        vtimezone = allVtimezones.find((vtz) => vtz.getFirstPropertyValue("tzid") === tzid) ?? null;
      }
      // Floating events (no TZID) have vtimezone=null; the else-branch below
      // interprets them in userTimeZone as required by RFC 5545 §3.3.5.

      applyTravelDuration(event, getTravelDurationInSeconds(vevent));

      if (event.isRecurring()) {
        // SECONDLY events are impractical to iterate (86 400/day) — skip them.
        // HOURLY and MINUTELY are valid busy-time contributors; increase the
        // iteration cap so the window is fully covered without blowing the guard.
        if (event.getRecurrenceTypes() === "SECONDLY") {
          console.error("Won't handle SECONDLY recurrence in Proton Calendar");
          return;
        }
        // Calculate dynamic iteration cap based on the actual query window so
        // long windows (e.g. 6-month availability scans) are never truncated,
        // while a fixed 365-occurrence guard still protects non-HOURLY/MINUTELY
        // recurrences (DAILY/WEEKLY/MONTHLY/YEARLY are bounded by day count).
        let maxIterations = 365;

        // Seed the iterator back by the event's duration so occurrences that
        // start before dateFrom but still overlap the window are not missed.
        // For example, a 2-day event beginning one day before dateFrom would
        // be skipped if we seeded at dateFrom.
        const seedDate = ICAL.Time.fromDateTimeString(startISOString);
        if (event.duration && event.duration.toSeconds() > 0) {
          const lookback = event.duration.clone();
          lookback.isNegative = true;
          seedDate.addDuration(lookback);
        }
        // Don't seed before the series DTSTART — that wastes iterations on a
        // period where no occurrences can exist.
        const iterStart = seedDate.compare(event.startDate) < 0 ? event.startDate.clone() : seedDate;

        // Calculate the iteration cap AFTER iterStart is known so the full span
        // from iterStart → dateTo is covered. For HOURLY/MINUTELY events the
        // iterator must traverse every occurrence from iterStart (which may be
        // well before dateFrom when looking back for overlapping occurrences)
        // all the way to dateTo. Using dateFrom→dateTo would under-count and
        // exhaust the budget before the iterator reaches the query window.
        if (event.getRecurrenceTypes() === "HOURLY") {
          // Hours from iterStart to dateTo + 48 h buffer for DST shifts.
          maxIterations = Math.ceil(dayjs(dateTo).diff(dayjs(iterStart.toJSDate()), "hours") + 48);
        } else if (event.getRecurrenceTypes() === "MINUTELY") {
          // Minutes from iterStart to dateTo + 48 h (2 880 min) buffer.
          maxIterations = Math.ceil(dayjs(dateTo).diff(dayjs(iterStart.toJSDate()), "minutes") + 2880);
        }

        const iterator = event.iterator(iterStart);
        let current: ICAL.Time;
        let currentEvent: ReturnType<typeof event.getOccurrenceDetails> | undefined;
        let currentStart = null;
        let currentError: string | undefined;

        while (
          maxIterations > 0 &&
          (currentStart === null || currentStart.isAfter(end) === false) &&
          (current = iterator.next())
        ) {
          maxIterations -= 1;
          currentEvent = undefined; // reset to prevent reusing stale data when getOccurrenceDetails throws
          try {
            currentEvent = event.getOccurrenceDetails(current);
          } catch (error) {
            if (error instanceof Error && error.message !== currentError) {
              currentError = error.message;
            }
            continue;
          }
          if (!currentEvent) continue;

          // Skip occurrences cancelled via a STATUS:CANCELLED exception VEVENT.
          // Key includes the series UID to avoid cross-series timestamp collisions.
          if (cancelledRecurrenceIds.has(`${event.uid}:${currentEvent.startDate.toISOString()}`)) {
            continue;
          }

          if (vtimezone) {
            const zone = new ICAL.Timezone(vtimezone);
            currentEvent.startDate = currentEvent.startDate.convertToZone(zone);
            currentEvent.endDate = currentEvent.endDate.convertToZone(zone);
            currentStart = dayjs(currentEvent.startDate.toJSDate());
            const currentEnd = dayjs(currentEvent.endDate.toJSDate());
            // Use overlap detection: include occurrences that start before the window
            // end AND end after the window start (matches non-recurring event logic).
            if (currentStart.isBefore(end) && currentEnd.isAfter(start)) {
              events.push({
                start: currentStart.toISOString(),
                end: currentEnd.toISOString(),
                title,
              });
            }
          } else {
            // DST-aware conversion: use dayjs.tz() when no VTIMEZONE component exists,
            // avoiding the mis-conversion of a synthetic STANDARD-only component.
            // For floating events (no TZID), interpret in the calendar owner's timezone
            // rather than the server's runtime-local timezone.
            const effectiveTzid = tzid ?? userTimeZone;
            const startISO = dayjs.tz(currentEvent.startDate.toString().slice(0, 19), effectiveTzid).toISOString();
            const endISO = dayjs.tz(currentEvent.endDate.toString().slice(0, 19), effectiveTzid).toISOString();
            currentStart = dayjs(startISO);
            // Use overlap detection (same as vtimezone branch and non-recurring path).
            if (currentStart.isBefore(end) && dayjs(endISO).isAfter(start)) {
              events.push({ start: startISO, end: endISO, title });
            }
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

      // Compute UTC-correct ISO times: use DST-aware dayjs.tz() when no VTIMEZONE
      // component is available. For floating events (no TZID), interpret in the
      // calendar owner's timezone (userTimeZone) rather than the runtime-local timezone.
      const effectiveTzid = tzid ?? userTimeZone;
      const startISO = vtimezone
        ? dayjs(event.startDate.toJSDate()).toISOString()
        : dayjs.tz(event.startDate.toString().slice(0, 19), effectiveTzid).toISOString();
      const endISO = vtimezone
        ? dayjs(event.endDate.toJSDate()).toISOString()
        : dayjs.tz(event.endDate.toString().slice(0, 19), effectiveTzid).toISOString();

      // Only include events that strictly overlap [dateFrom, dateTo].
      // Use exclusive boundaries: end > dateFrom AND start < dateTo.
      // Events that end exactly at dateFrom or start exactly at dateTo are NOT busy.
      if (!dayjs(endISO).isAfter(dayjs(dateFrom)) || !dayjs(startISO).isBefore(dayjs(dateTo))) {
        return;
      }

      events.push({ start: startISO, end: endISO, title });
    });

    return Promise.resolve(events);
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const calendarData = await this.fetchCalendar();
    if (!calendarData) return [];

    const { url, vcalendar } = calendarData;
    const name: string = vcalendar.getFirstPropertyValue("x-wr-calname") ?? "Proton Calendar";
    // Hash the ICS URL to derive a stable, opaque external ID.
    // The raw URL is a Proton sharing secret that must not be stored or
    // displayed in plain text via API/UI flows that expose externalId.
    const feedId = crypto.createHash("sha256").update(url).digest("hex").slice(0, 32);
    return [
      {
        name,
        readOnly: true,
        externalId: `proton-${feedId}`,
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
