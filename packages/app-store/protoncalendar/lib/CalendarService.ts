/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../../../types/ical.d.ts"/>

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
import dayjs from "@calcom/dayjs";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

class ProtonCalendarService implements Calendar {
  private url: string = "";
  protected integrationName = "proton_calendar";

  constructor(credential: CredentialPayload) {
    const decrypted = symmetricDecrypt(credential.key as string, CALENDSO_ENCRYPTION_KEY);
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

    const events = await this.fetchAndParseICS(this.url);
    const busyTimes: EventBusyDate[] = [];

    events.forEach((event) => {
      const start = dayjs(event.startDate.toJSDate());
      const end = dayjs(event.endDate.toJSDate());
      const rangeStart = dayjs(dateFrom);
      const rangeEnd = dayjs(dateTo);

      if (start.isBefore(rangeEnd) && end.isAfter(rangeStart)) {
        busyTimes.push({
          start: start.toISOString(),
          end: end.toISOString(),
        });
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
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch Proton ICS: ${response.statusText}`);

      const text = await response.text();
      const jcalData = ICAL.parse(text);
      const vcalendar = new ICAL.Component(jcalData);

      const vevents = vcalendar.getAllSubcomponents("vevent");
      return vevents.map(v => new ICAL.Event(v));
    } catch (e) {
      logger.error("Proton ICS Parse Error:", e);
      return [];
    }
  }
}

export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ProtonCalendarService(credential);
}
