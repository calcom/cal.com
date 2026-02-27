/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import ICAL from "ical.js";
import dayjs from "@calcom/dayjs";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";


class ProtonCalendarService implements Calendar {
  private url: string = "";
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    const key = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!key) throw new Error("Missing CALENDSO_ENCRYPTION_KEY");

    const decrypted = symmetricDecrypt(credential.key as string, key);
    const { url } = JSON.parse(decrypted);
    this.url = url;
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    return Promise.resolve({
      uid: event.uid || "",
      type: this.integrationName,
      id: "",
      password: "",
      url: "",
      additionalInfo: { calWarnings: ["Proton Calendar integration is read-only"] },
    });
  }

  async updateEvent(uid: string, event: CalendarEvent): Promise<NewCalendarEventType> {
    return this.createEvent(event);
  }

  async deleteEvent(uid: string): Promise<void> {
    return Promise.resolve();
  }

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo } = params;
    const rangeStart = dayjs(dateFrom);
    const rangeEnd = dayjs(dateTo);

    const events = await this.fetchAndParseICS(this.url);
    const busyTimes: EventBusyDate[] = [];

    events.forEach((event) => {
      if (event.isRecurring()) {
        // skip sub-daily recurrence types
        const recurrenceType = event.getRecurrenceTypes();
        if (["HOURLY", "SECONDLY", "MINUTELY"].includes(recurrenceType)) {
          logger.warn(`Skipping unsupported recurrence type: ${recurrenceType}`);
          return;
        }

        // begin iteration from the query window
        const startDate = ICAL.Time.fromDateTimeString(new Date(dateFrom).toISOString());
        startDate.hour = event.startDate.hour;
        startDate.minute = event.startDate.minute;
        startDate.second = event.startDate.second;

        const iterator = event.iterator(startDate);
        let next: ICAL.Time;
        let maxIterations = 365;

        while (maxIterations > 0 && (next = iterator.next())) {
          maxIterations--;
          const start = dayjs(next.toJSDate());

          if (start.isAfter(rangeEnd)) break;

          const duration = event.duration;
          const end = start.add(duration.toSeconds(), "second");

          if (start.isBefore(rangeEnd) && end.isAfter(rangeStart)) {
            busyTimes.push({
              start: start.toISOString(),
              end: end.toISOString(),
            });
          }
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
    });

    return busyTimes;
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return [{
      externalId: this.url,
      integration: this.integrationName,
      name: "Proton Calendar",
      primary: true,
      readOnly: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      isReadOnly: true
    }];
  }

  private async fetchAndParseICS(url: string): Promise<ICAL.Event[]> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Failed to fetch Proton ICS: ${response.statusText}`);

      const text = await response.text();
      const jcalData = ICAL.parse(text);
      const vcalendar = new ICAL.Component(jcalData);

      const vevents = vcalendar.getAllSubcomponents("vevent");
      return vevents.map(v => new ICAL.Event(v));
    } catch (e) {
      if (e instanceof Error) {
        const safeMessage = e.message.replaceAll(this.url, "[REDACTED_URL]");
        logger.error("Proton ICS Parse Error:", safeMessage);
      } else {
        logger.error("Proton ICS Parse Error:", e);
      }
      return [];
    }
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
