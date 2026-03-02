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

/** Guards against infinite or extremely long RRULE expansions. */
const MAX_RECURRENCE_ITERATIONS = 365;

/** Network timeout for fetching the ICS feed (ms). */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Proton Calendar integration — read-only ICS feed.
 *
 * Proton Calendar uses end-to-end encryption; no OAuth or CalDAV API is
 * available. Integration is via the ICS share link in Proton Calendar settings.
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

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo } = params;
    const rangeStart = dayjs(dateFrom);
    const rangeEnd = dayjs(dateTo);
    const startISOString = new Date(dateFrom).toISOString();

    const { events, cancelledOccurrences } = await this.fetchAndParseICS();
    const busyTimes: EventBusyDate[] = [];

    for (const event of events) {
      const status = event.component.getFirstPropertyValue("status") as string | null;
      if (status && status.toUpperCase() === "CANCELLED") {
        log.debug("Skipping CANCELLED event: %s", event.uid);
        continue;
      }

      if (event.isRecurring()) {
        const recurrenceType = event.getRecurrenceTypes();

        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(recurrenceType)) {
          log.warn("Skipping unsupported recurrence type: %s", recurrenceType);
          continue;
        }

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

  async listCalendars(): Promise<IntegrationCalendar[]> {
    const { events, vcalendar } = await this.fetchAndParseICSRaw();

    if (!vcalendar) {
      throw new Error("Could not reach Proton Calendar ICS feed");
    }

    // Proton feeds often omit x-wr-calname; fall back to a sensible default.
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

        if (eventStatus?.toUpperCase() === "CANCELLED" && recurrenceId) {
          const rid = recurrenceId.getFirstValue() as ICAL.Time;
          const key = `${event.uid}:${rid.toISOString()}`;
          cancelledOccurrences.add(key);
          log.debug("Tracked cancelled occurrence: %s at %s", event.uid, rid.toISOString());
          continue;
        }

        events.push(event);
      }

      return { events, cancelledOccurrences, vcalendar };
    } catch (e) {
      clearTimeout(timeout);

      if (e instanceof Error) {
        const safeMessage = e.message.replaceAll(this.url, "[REDACTED_URL]");
        log.error("Proton ICS error: %s", safeMessage);
      } else {
        log.error("Proton ICS unexpected error: %s", String(e));
      }

      return { events: [], cancelledOccurrences: new Set(), vcalendar: null };
    }
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
