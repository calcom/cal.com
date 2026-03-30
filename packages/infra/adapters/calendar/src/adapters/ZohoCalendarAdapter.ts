import type { CalendarAdapter } from "../CalendarAdapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  ZohoCalendarCredential,
} from "../CalendarAdapterTypes";

import { fetchWithRetry } from "../lib/fetchWithRetry";

/**
 * Zoho Calendar adapter.
 *
 * No optional methods -- Zoho has limited webhook support that is
 * not currently used by the Cal.com integration.
 */
export class ZohoCalendarAdapter implements CalendarAdapter {
  private readonly apiBase: string;
  private readonly key: ZohoCalendarCredential["key"];

  constructor(credential: ZohoCalendarCredential) {
    this.key = credential.key;
    this.apiBase = `https://calendar.zoho.${this.key.server_location}/api/v1`;
  }

  private async zohoFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.apiBase}${path}`;
    const response = await fetchWithRetry(url, {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) ?? {}),
        Authorization: `Bearer ${this.key.access_token}`,
        "Content-Type": "application/json",
      },
    }, { provider: "ZohoCalendar" });
    return response;
  }

  // ---------------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------------

  async createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    const response = await this.zohoFetch(`/calendars/${calendarId}/events`, {
      method: "POST",
      body: JSON.stringify(this.toZohoEvent(event)),
    });
    const data = (await response.json()) as { events?: Array<{ uid: string }> };
    const eventUid = data.events?.[0]?.uid ?? "";

    return {
      uid: event.uid ?? eventUid,
      id: eventUid,
      type: "zoho_calendar",
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    await this.zohoFetch(`/calendars/${calendarId}/events/${uid}`, {
      method: "PUT",
      body: JSON.stringify(this.toZohoEvent(event)),
    });

    return {
      uid,
      id: uid,
      type: "zoho_calendar",
    };
  }

  async deleteEvent(
    uid: string,
    _event?: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<void> {
    const calendarId = externalCalendarId ?? "primary";
    await this.zohoFetch(`/calendars/${calendarId}/events/${uid}`, {
      method: "DELETE",
    });
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const busySlots: BusyTimeslot[] = [];

    for (const calendar of params.calendars) {
      const searchParams = new URLSearchParams({
        range: JSON.stringify({
          start: params.dateFrom,
          end: params.dateTo,
        }),
      });
      const response = await this.zohoFetch(
        `/calendars/${calendar.externalId}/events?${searchParams.toString()}`,
        { method: "GET" }
      );
      const data = (await response.json()) as {
        events?: Array<{
          dateandtime?: { start: string; end: string };
        }>;
      };

      for (const event of data.events ?? []) {
        if (event.dateandtime) {
          busySlots.push({
            start: new Date(event.dateandtime.start),
            end: new Date(event.dateandtime.end),
          });
        }
      }
    }

    return busySlots;
  }

  // ---------------------------------------------------------------------------
  // Calendar listing
  // ---------------------------------------------------------------------------

  async listCalendars(): Promise<CalendarInfo[]> {
    const response = await this.zohoFetch("/calendars", { method: "GET" });
    const data = (await response.json()) as {
      calendars?: Array<{
        uid: string;
        name?: string;
        isdefault?: boolean;
        privilege?: string;
      }>;
    };

    return (data.calendars ?? []).map((cal) => ({
      externalId: cal.uid,
      name: cal.name,
      integration: "zoho_calendar",
      primary: cal.isdefault ?? false,
      readOnly: cal.privilege === "read",
    }));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toZohoEvent(event: CalendarEventInput): Record<string, unknown> {
    return {
      title: event.title,
      description: event.description ?? "",
      dateandtime: {
        start: event.startTime.toISOString(),
        end: event.endTime.toISOString(),
        timezone: event.timeZone ?? "UTC",
      },
      ...(event.location ? { location: event.location } : {}),
      ...(event.attendees?.length
        ? {
            attendees: event.attendees.map((a) => ({
              email: a.email,
              name: a.name ?? "",
            })),
          }
        : {}),
    };
  }
}
