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

const log = logger.getSubLogger({ prefix: ["ProtonCalendarService"] });

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

/**
 * The maximum number of recurrence iterations to expand per event.
 * Guards against infinite or extremely long RRULE expansions.
 */
const MAX_RECURRENCE_ITERATIONS = 365;

/**
 * Network timeout for fetching the ICS feed from Proton servers (ms).
 */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Proton Calendar integration service.
 *
 * Proton Calendar uses end-to-end encryption, which means there is no
 * traditional OAuth or CalDAV API available. The only supported external
 * integration method is via ICS feed URLs that Proton exposes through
 * Calendar → Settings → Share → "Link to calendar".
 *
 * This service is intentionally **read-only**: it fetches the ICS feed,
 * parses events (including recurring ones), and returns busy times for
 * Cal.com's availability engine.
 *
 * Key Proton-specific behaviours handled:
 * 1. **Ghost events** — Proton includes STATUS:CANCELLED events in feeds.
 *    These must be filtered out or they create phantom busy slots.
 * 2. **Cancelled recurring occurrences** — Individual occurrences of a
 *    recurring event can be cancelled via a standalone VEVENT with
 *    STATUS:CANCELLED + RECURRENCE-ID. We track these and skip them
 *    during recurrence expansion.
 * 3. **Calendar name fallback** — x-wr-calname is often missing from
 *    Proton feeds, so we default to "Proton Calendar".
 */
class ProtonCalendarService implements Calendar {
  private url: string = "";
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    if (!CALENDSO_ENCRYPTION_KEY) {
      throw new Error("Missing CALENDSO_ENCRYPTION_KEY");
    }
    const decrypted = symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY);
    const parsed = JSON.parse(decrypted);
    this.url = parsed.url;
  }

  // ---------------------------------------------------------------------------
  // Write stubs — Proton Calendar is E2E encrypted, writes are not possible
  // ---------------------------------------------------------------------------

  createEvent(_event: CalendarEvent, _credentialId: number): Promise<NewCalendarEventType> {
    log.warn("createEvent called on Proton Calendar (read-only)");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: ["Proton Calendar is read-only — events cannot be created via the ICS feed"],
      },
    });
  }

  deleteEvent(_uid: string, _event: CalendarEvent, _externalCalendarId?: string): Promise<unknown> {
    log.warn("deleteEvent called on Proton Calendar (read-only)");
    return Promise.resolve();
  }

  updateEvent(
    _uid: string,
    _event: CalendarEvent,
    _externalCalendarId?: string
  ): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    log.warn("updateEvent called on Proton Calendar (read-only)");
    return Promise.resolve({
      uid: _event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: {
        calWarnings: ["Proton Calendar is read-only — events cannot be updated via the ICS feed"],
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Core: availability — the primary value of this integration
  // ---------------------------------------------------------------------------

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo } = params;
    const rangeStart = dayjs(dateFrom);
    const rangeEnd = dayjs(dateTo);
    const startISOString = new Date(dateFrom).toISOString();

    const { events, cancelledOccurrences } = await this.fetchAndParseICS();
    const busyTimes: EventBusyDate[] = [];

    for (const event of events) {
      // ----- Proton Fix #1: Skip STATUS:CANCELLED ghost events -----
      // Proton includes cancelled events in its ICS feeds. The generic
      // ICS feed app does not filter these, causing phantom busy slots.
      const status = event.component.getFirstPropertyValue("status") as string | null;
      if (status && status.toUpperCase() === "CANCELLED") {
        log.debug("Skipping CANCELLED event: %s", event.uid);
        continue;
      }

      if (event.isRecurring()) {
        const recurrenceType = event.getRecurrenceTypes();

        // Skip sub-daily recurrence types (not meaningful for availability)
        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(recurrenceType)) {
          log.warn("Skipping unsupported recurrence type: %s", recurrenceType);
          continue;
        }

        // Begin iteration from the query window start, preserving the
        // original event's time-of-day so we don't miss edge cases.
        const startDate = ICAL.Time.fromDateTimeString(startISOString);
        startDate.hour = event.startDate.hour;
        startDate.minute = event.startDate.minute;
        startDate.second = event.startDate.second;

        const iterator = event.iterator(startDate);
        let next: ICAL.Time;
        let remaining = MAX_RECURRENCE_ITERATIONS;

        while (remaining > 0 && (next = iterator.next())) {
          remaining--;
          const occurrenceStart = dayjs(next.toJSDate());

          if (occurrenceStart.isAfter(rangeEnd)) break;

          // ----- Proton Fix #2: Skip cancelled recurring occurrences -----
          // When a single occurrence of a recurring event is cancelled in
          // Proton, it appears as a standalone VEVENT with STATUS:CANCELLED
          // and a RECURRENCE-ID matching this specific date/time.
          const occurrenceKey = `${event.uid}:${next.toISOString()}`;
          if (cancelledOccurrences.has(occurrenceKey)) {
            log.debug("Skipping cancelled recurring occurrence: %s", occurrenceKey);
            continue;
          }

          const duration = event.duration;
          const occurrenceEnd = occurrenceStart.add(duration.toSeconds(), "second");

          if (occurrenceStart.isBefore(rangeEnd) && occurrenceEnd.isAfter(rangeStart)) {
            busyTimes.push({
              start: occurrenceStart.toISOString(),
              end: occurrenceEnd.toISOString(),
            });
          }
        }

        if (remaining <= 0) {
          log.warn("Hit max iterations for recurring event %s", event.uid);
        }
      } else {
        // Non-recurring event
        const start = dayjs(event.startDate.toJSDate());
        const end = dayjs(event.endDate.toJSDate());

        if (start.isBefore(rangeEnd) && end.isAfter(rangeStart)) {
          busyTimes.push({
            start: start.toISOString(),
            end: end.toISOString(),
          });
        }
      }
    }

    return busyTimes;
  }

  // ---------------------------------------------------------------------------
  // Calendar listing — also validates the URL works during credential setup
  // ---------------------------------------------------------------------------

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const { events, vcalendar } = await this.fetchAndParseICSRaw();

    // If the ICS feed is unreachable or unparseable, this will throw and
    // the credential setup in api/add.ts will catch and return an error.
    if (!vcalendar) {
      throw new Error("Could not reach Proton Calendar ICS feed");
    }

    // Proton feeds often omit x-wr-calname, so we provide a sensible default.
    const calName: string =
      vcalendar.getFirstPropertyValue("x-wr-calname") || "Proton Calendar";

    return [
      {
        externalId: this.url,
        integration: this.integrationName,
        name: calName,
        primary: true,
        readOnly: true,
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // ICS fetcher with Proton-specific parsing
  // ---------------------------------------------------------------------------

  /**
   * Fetches the ICS feed and returns parsed events + cancelled occurrence set.
   * This is the main parsing entry point used by `getAvailability`.
   */
  private async fetchAndParseICS(): Promise<{
    events: ICAL.Event[];
    cancelledOccurrences: Set<string>;
  }> {
    const result = await this.fetchAndParseICSRaw();
    return {
      events: result.events,
      cancelledOccurrences: result.cancelledOccurrences,
    };
  }

  /**
   * Low-level ICS fetcher that also returns the raw VCALENDAR component
   * (needed by `listCalendars` for extracting calendar metadata).
   */
  private async fetchAndParseICSRaw(): Promise<{
    events: ICAL.Event[];
    cancelledOccurrences: Set<string>;
    vcalendar: ICAL.Component | null;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(this.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Cal.com/ProtonCalendar-Integration",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        // Provide Proton-specific guidance for common error codes
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `ICS fetch failed: HTTP ${response.status} — the Proton Calendar share link may have expired or been revoked. Please re-generate the link in Proton Calendar settings.`
          );
        }
        if (response.status === 404) {
          throw new Error(
            `ICS fetch failed: HTTP 404 — the Proton Calendar may have been deleted. Please check your Proton Calendar settings.`
          );
        }
        throw new Error(`ICS fetch failed: HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();

      // Sanity check — ensure we received a valid iCalendar document
      if (!text.includes("BEGIN:VCALENDAR")) {
        throw new Error("Response is not a valid iCalendar document");
      }

      const jcalData = ICAL.parse(text);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents("vevent");

      const events: ICAL.Event[] = [];
      const cancelledOccurrences = new Set<string>();

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        const eventStatus = vevent.getFirstPropertyValue("status") as string | null;
        const recurrenceId = vevent.getFirstProperty("recurrence-id");

        // Detect individually-cancelled occurrences of recurring events.
        // These are standalone VEVENT entries with STATUS:CANCELLED and a
        // RECURRENCE-ID pointing to the specific occurrence date/time.
        if (eventStatus?.toUpperCase() === "CANCELLED" && recurrenceId) {
          const rid = recurrenceId.getFirstValue() as ICAL.Time;
          const key = `${event.uid}:${rid.toISOString()}`;
          cancelledOccurrences.add(key);
          log.debug("Tracked cancelled occurrence: %s at %s", event.uid, rid.toISOString());
          continue; // Do not add to events — this is only a cancellation marker
        }

        events.push(event);
      }

      return { events, cancelledOccurrences, vcalendar };
    } catch (e) {
      clearTimeout(timeout);

      if (e instanceof Error) {
        // Redact the ICS URL from logs to avoid leaking user credentials
        const safeMessage = e.message.replaceAll(this.url, "[REDACTED_URL]");
        log.error("Proton ICS error: %s", safeMessage);
      } else {
        // Use String() explicitly — never serialize unknown objects with %o
        // which could inadvertently stringify objects that reference the URL.
        log.error("Proton ICS unexpected error: %s", String(e));
      }

      return { events: [], cancelledOccurrences: new Set(), vcalendar: null };
    }
  }
}

/**
 * Factory function that creates a Proton Calendar service instance.
 * Exported instead of the class to prevent internal types from leaking
 * into the emitted .d.ts file — follows the same pattern as the
 * ICS Feed Calendar service.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
