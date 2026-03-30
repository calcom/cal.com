import { DAVClient } from "tsdav";

import type { CalendarAdapter } from "../CalendarAdapter";
import type {
  BusyTimeslot,
  CalDAVCalendarCredential,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
} from "../CalendarAdapterTypes";
import { CalendarAdapterError } from "../lib/CalendarAdapterError";
import { expandVEventsFromICal } from "../lib/expandRecurringEvents";

/**
 * CalDAV calendar adapter using the tsdav library.
 *
 * Supports any standards-compliant CalDAV server (Nextcloud, Baikal,
 * Radicale, iCloud, etc.). Does not support push channels or
 * credential health checks — those are not part of the CalDAV spec.
 */
export class CalDAVCalendarAdapter implements CalendarAdapter {
  protected readonly client: DAVClient;
  private readonly key: { username: string; password: string; url: string };

  constructor(credential: CalDAVCalendarCredential) {
    this.key = credential.key;
    this.client = new DAVClient({
      serverUrl: this.key.url,
      credentials: {
        username: this.key.username,
        password: this.key.password,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
  }

  protected getBasicAuthHeaders(): Record<string, string> {
    const encoded = Buffer.from(`${this.key.username}:${this.key.password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }

  async createEvent(
    event: CalendarEventInput,
    externalCalendarId?: string
  ): Promise<CalendarEventResult> {
    await this.client.login();

    const calendars = await this.client.fetchCalendars();
    const calendar = externalCalendarId
      ? calendars.find((c) => c.url === externalCalendarId)
      : calendars[0];

    if (!calendar) {
      throw new CalendarAdapterError({
        provider: "CalDAV",
        message: "No calendar found for event creation",
        status: 404,
        transient: false,
      });
    }

    const uid = event.uid ?? crypto.randomUUID();
    const iCalData = buildICalEvent(uid, event);

    await this.client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: iCalData,
      headers: this.getBasicAuthHeaders(),
    });

    return {
      uid,
      id: uid,
      type: "caldav",
      iCalUID: uid,
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    await this.client.login();

    const calendars = await this.client.fetchCalendars();
    const calendar = externalCalendarId
      ? calendars.find((c) => c.url === externalCalendarId)
      : calendars[0];

    if (!calendar) {
      throw new CalendarAdapterError({
        provider: "CalDAV",
        message: "No calendar found for event update",
        status: 404,
        transient: false,
      });
    }

    const iCalData = buildICalEvent(uid, event);

    await this.client.updateCalendarObject({
      calendarObject: {
        url: `${calendar.url}${uid}.ics`,
        data: iCalData,
        etag: "",
      },
      headers: this.getBasicAuthHeaders(),
    });

    return {
      uid,
      id: uid,
      type: "caldav",
      iCalUID: uid,
    };
  }

  async deleteEvent(
    uid: string,
    _event?: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<void> {
    await this.client.login();

    const calendars = await this.client.fetchCalendars();
    const calendar = externalCalendarId
      ? calendars.find((c) => c.url === externalCalendarId)
      : calendars[0];

    if (!calendar) {
      throw new CalendarAdapterError({
        provider: "CalDAV",
        message: "No calendar found for event deletion",
        status: 404,
        transient: false,
      });
    }

    await this.client.deleteCalendarObject({
      calendarObject: {
        url: `${calendar.url}${uid}.ics`,
        etag: "",
      },
      headers: this.getBasicAuthHeaders(),
    });
  }

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    await this.client.login();

    const calendars = await this.client.fetchCalendars();
    const targetIds = new Set(params.calendars.map((c) => c.externalId));
    const matchedCalendars = calendars.filter((c) => targetIds.has(c.url));

    const dateFrom = new Date(params.dateFrom);
    const dateTo = new Date(params.dateTo);
    const busySlots: BusyTimeslot[] = [];

    for (const calendar of matchedCalendars) {
      const objects = await this.client.fetchCalendarObjects({
        calendar,
        timeRange: {
          start: params.dateFrom,
          end: params.dateTo,
        },
        headers: this.getBasicAuthHeaders(),
      });

      for (const obj of objects) {
        if (!obj.data) continue;

        // expandVEventsFromICal handles both single and recurring events
        const expanded = expandVEventsFromICal(obj.data, dateFrom, dateTo);
        busySlots.push(...expanded);
      }
    }

    return busySlots;
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    await this.client.login();

    const calendars = await this.client.fetchCalendars();

    return calendars.map((cal) => ({
      externalId: cal.url,
      name: cal.displayName ?? undefined,
      integration: "caldav",
      primary: false,
      readOnly: false,
    }));
  }
}

// ---------------------------------------------------------------------------
// iCal helpers
// ---------------------------------------------------------------------------

function formatDateToICal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildICalEvent(uid: string, event: CalendarEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cal.com//CalDAVAdapter//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${formatDateToICal(event.startTime)}`,
    `DTEND:${formatDateToICal(event.endTime)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }
  if (event.attendees) {
    for (const attendee of event.attendees) {
      const cn = attendee.name ? `;CN=${escapeICalText(attendee.name)}` : "";
      lines.push(`ATTENDEE${cn}:mailto:${attendee.email}`);
    }
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

