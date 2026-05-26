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
const MAX_RECURRENCE_ITERATIONS = 365;
const FETCH_TIMEOUT_MS = 15_000;

class ProtonCalendarService implements Calendar {
  private url: string = "";
  protected integrationName = "proton_calendar";

  constructor(credential) {
    const decrypted = symmetricDecrypt(credential.key, CALENDSO_ENCRYPTION_KEY);
    const parsed = JSON.parse(decrypted);
    this.url = parsed.url;
  }

  createEvent(_event, _credentialId) {
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

  deleteEvent(_uid, _event, _externalCalendarId) {
    log.warn("deleteEvent called on Proton Calendar (read-only)");
    return Promise.resolve();
  }

  updateEvent(_uid, _event, _externalCalendarId) {
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

  async getAvailability(params) {
    const { dateFrom, dateTo } = params;
    const rangeStart = dayjs(dateFrom);
    const rangeEnd = dayjs(dateTo);
    const startISOString = new Date(dateFrom).toISOString();

    const { events, cancelledOccurrences } = await this.fetchAndParseICS();
    const busyTimes = [];

    for (const event of events) {
      const status = event.component.getFirstPropertyValue("status");
      if (status && status.toUpperCase() === "CANCELLED") {
        log.debug("Skipping CANCELLED event: " + event.uid);
        continue;
      }

      if (event.isRecurring()) {
        const recurrenceType = event.getRecurrenceTypes();

        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(recurrenceType)) {
          log.warn("Skipping unsupported recurrence type: " + recurrenceType);
          continue;
        }

        const startDate = ICAL.Time.fromDateTimeString(startISOString);
        startDate.hour = event.startDate.hour;
        startDate.minute = event.startDate.minute;
        startDate.second = event.startDate.second;

        const iterator = event.iterator(startDate);
        let next;
        let remaining = MAX_RECURRENCE_ITERATIONS;

        while (remaining > 0 && (next = iterator.next())) {
          remaining--;
          const occurrenceStart = dayjs(next.toJSDate());

          if (occurrenceStart.isAfter(rangeEnd)) break;

          const occurrenceKey = event.uid + ":" + next.toISOString();
          if (cancelledOccurrences.has(occurrenceKey)) {
            log.debug("Skipping cancelled recurring occurrence: " + occurrenceKey);
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
          log.warn("Hit max iterations for recurring event " + event.uid);
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

  async listCalendars() {
    const { events, vcalendar } = await this.fetchAndParseICSRaw();

    if (!vcalendar) {
      throw new Error("Could not reach Proton Calendar ICS feed");
    }

    const calName = vcalendar.getFirstPropertyValue("x-wr-calname") || "Proton Calendar";

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

  private async fetchAndParseICS() {
    const result = await this.fetchAndParseICSRaw();
    return {
      events: result.events,
      cancelledOccurrences: result.cancelledOccurrences,
    };
  }

  private async fetchAndParseICSRaw() {
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
            "ICS fetch failed: HTTP " + response.status + " — the Proton Calendar share link may have expired or been revoked. Please re-generate the link in Proton Calendar settings."
          );
        }
        if (response.status === 404) {
          throw new Error(
            "ICS fetch failed: HTTP 404 — the Proton Calendar may have been deleted. Please check your Proton Calendar settings."
          );
        }
        throw new Error("ICS fetch failed: HTTP " + response.status + " " + response.statusText);
      }

      const text = await response.text();

      if (!text.includes("BEGIN:VCALENDAR")) {
        throw new Error("Response is not a valid iCalendar document");
      }

      const jcalData = ICAL.parse(text);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents("vevent");

      const events = [];
      const cancelledOccurrences = new Set();

      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        const eventStatus = vevent.getFirstPropertyValue("status");
        const recurrenceId = vevent.getFirstProperty("recurrence-id");

        if (eventStatus && eventStatus.toUpperCase() === "CANCELLED" && recurrenceId) {
          const rid = recurrenceId.getFirstValue();
          const key = event.uid + ":" + rid.toISOString();
          cancelledOccurrences.add(key);
          log.debug("Tracked cancelled occurrence: " + event.uid + " at " + rid.toISOString());
          continue;
        }

        events.push(event);
      }

      return { events, cancelledOccurrences, vcalendar };
    } catch (e) {
      clearTimeout(timeout);

      if (e instanceof Error) {
        const safeMessage = e.message.replaceAll(this.url, "[REDACTED_URL]");
        log.error("Proton ICS error: " + safeMessage);
      } else {
        log.error("Proton ICS unexpected error: " + String(e));
      }

      return { events: [], cancelledOccurrences: new Set(), vcalendar: null };
    }
  }
}

export default function BuildCalendarService(credential) {
  return new ProtonCalendarService(credential);
}
