import type { CalendarAdapter } from "../CalendarAdapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FeishuCalendarCredential,
  FetchBusyTimesInput,
  LarkCalendarCredential,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "../CalendarAdapterTypes";

import { fetchWithRetry } from "../lib/fetchWithRetry";

export type ByteDanceCredential = FeishuCalendarCredential | LarkCalendarCredential;

/**
 * Shared base for Feishu and Lark calendar adapters.
 *
 * Both platforms share identical API shapes — only the host differs:
 * - Feishu: open.feishu.cn
 * - Lark:   open.larksuite.com
 */
export abstract class BaseByteDanceCalendarAdapter implements CalendarAdapter {
  protected abstract readonly apiHost: string;
  protected abstract readonly providerName: string;
  private readonly key: ByteDanceCredential["key"];

  constructor(credential: ByteDanceCredential) {
    this.key = credential.key;
  }

  protected async apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const key = this.key;
    const url = `https://${this.apiHost}/open-apis${path}`;
    const response = await fetchWithRetry(url, {
      ...options,
      headers: {
        ...((options.headers as Record<string, string>) ?? {}),
        Authorization: `Bearer ${key.access_token}`,
        "Content-Type": "application/json",
      },
    }, { provider: this.providerName });
    return response;
  }

  // ---------------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------------

  async createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    const response = await this.apiFetch(`/calendar/v4/calendars/${calendarId}/events`, {
      method: "POST",
      body: JSON.stringify(this.toFeishuEvent(event)),
    });
    const data = (await response.json()) as { data: { event: { event_id: string } } };
    const eventId = data.data.event.event_id;

    return {
      uid: event.uid ?? eventId,
      id: eventId,
      type: "feishu_calendar",
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    await this.apiFetch(`/calendar/v4/calendars/${calendarId}/events/${uid}`, {
      method: "PATCH",
      body: JSON.stringify(this.toFeishuEvent(event)),
    });

    return {
      uid,
      id: uid,
      type: "feishu_calendar",
    };
  }

  async deleteEvent(
    uid: string,
    _event?: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<void> {
    const calendarId = externalCalendarId ?? "primary";
    await this.apiFetch(`/calendar/v4/calendars/${calendarId}/events/${uid}`, {
      method: "DELETE",
    });
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const response = await this.apiFetch("/calendar/v4/freebusy/list", {
      method: "POST",
      body: JSON.stringify({
        time_min: params.dateFrom,
        time_max: params.dateTo,
      }),
    });
    const data = (await response.json()) as {
      data: {
        freebusy_list?: Array<{
          start_time: string;
          end_time: string;
        }>;
      };
    };

    return (data.data.freebusy_list ?? []).map((slot) => ({
      start: new Date(slot.start_time),
      end: new Date(slot.end_time),
    }));
  }

  // ---------------------------------------------------------------------------
  // Calendar listing
  // ---------------------------------------------------------------------------

  async listCalendars(): Promise<CalendarInfo[]> {
    const response = await this.apiFetch("/calendar/v4/calendars", { method: "GET" });
    const data = (await response.json()) as {
      data: {
        calendar_list?: Array<{
          calendar_id: string;
          summary?: string;
          type?: string;
        }>;
      };
    };

    return (data.data.calendar_list ?? []).map((cal) => ({
      externalId: cal.calendar_id,
      name: cal.summary,
      integration: "feishu_calendar",
      primary: cal.type === "primary",
      readOnly: false,
    }));
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const response = await this.apiFetch(
      `/calendar/v4/calendars/${input.calendarId}/events/subscription`,
      { method: "POST" }
    );
    const data = (await response.json()) as {
      data: { subscription_id?: string };
    };

    return {
      channelId: data.data.subscription_id ?? "",
      resourceId: null,
      resourceUri: null,
      expiration: null,
    };
  }

  async unsubscribe(input: UnsubscribeInput): Promise<void> {
    await this.apiFetch(`/calendar/v4/calendars/events/subscription/${input.channelId}`, {
      method: "DELETE",
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toFeishuEvent(event: CalendarEventInput): Record<string, unknown> {
    return {
      summary: event.title,
      description: event.description ?? "",
      start_time: {
        timestamp: String(Math.floor(event.startTime.getTime() / 1000)),
        timezone: event.timeZone ?? "UTC",
      },
      end_time: {
        timestamp: String(Math.floor(event.endTime.getTime() / 1000)),
        timezone: event.timeZone ?? "UTC",
      },
      ...(event.location ? { location: { name: event.location } } : {}),
      ...(event.attendees?.length
        ? {
            attendees: event.attendees.map((a) => ({
              type: "user",
              user_id: a.email,
            })),
          }
        : {}),
    };
  }
}
