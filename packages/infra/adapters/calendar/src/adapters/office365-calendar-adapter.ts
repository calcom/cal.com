import type { CalendarAdapter } from "../calendar-adapter";
import type {
  BusyTimeslot,
  CalendarEvent,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  FetchBusyTimesInput,
  FetchEventsInput,
  FetchEventsResult,
  HealthCheckResult,
  Office365CalendarCredential,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "../calendar-adapter-types";
import { CalendarAdapterError } from "../lib/calendar-adapter-error";
import { fetchWithRetry } from "../lib/fetch-with-retry";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

interface GraphEventTime {
  dateTime: string;
  timeZone: string;
}

interface GraphAttendee {
  emailAddress: { address: string; name?: string };
  type: "required" | "optional";
}

interface GraphEvent {
  id: string;
  iCalUId?: string;
  webLink?: string;
  subject?: string;
  start?: GraphEventTime;
  end?: GraphEventTime;
}

interface GraphCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: { address?: string; name?: string };
}

interface GraphScheduleItem {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  subject?: string;
  status?: string;
}

interface GraphScheduleResponse {
  scheduleId: string;
  availabilityView: string;
  scheduleItems: GraphScheduleItem[];
}

/**
 * Office 365 / Outlook calendar adapter using Microsoft Graph API v1.0.
 *
 * Supports:
 * - subscribe / unsubscribe (Graph subscriptions)
 * - healthCheck
 */
export class Office365CalendarAdapter implements CalendarAdapter {
  private readonly accessToken: string;

  constructor(credential: Office365CalendarCredential) {
    this.accessToken = credential.key.access_token;
  }

  // ---------------------------------------------------------------------------
  // Core CRUD
  // ---------------------------------------------------------------------------

  async createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult> {
    const body = this.toGraphEvent(event);

    const path = externalCalendarId
      ? `/me/calendars/${encodeURIComponent(externalCalendarId)}/events`
      : "/me/events";

    const created = await this.graphFetch<GraphEvent>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return this.toCalendarEventResult(created);
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    const body = this.toGraphEvent(event);

    const updated = await this.graphFetch<GraphEvent>(`/me/events/${encodeURIComponent(uid)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return this.toCalendarEventResult(updated);
  }

  async deleteEvent(
    uid: string,
    _event?: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<void> {
    await this.graphFetch(`/me/events/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
  }

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const calendarIds = params.calendars.map((c) => c.externalId);

    const requestBody = {
      schedules: calendarIds,
      startTime: {
        dateTime: params.dateFrom,
        timeZone: "UTC",
      },
      endTime: {
        dateTime: params.dateTo,
        timeZone: "UTC",
      },
      availabilityViewInterval: 15,
    };

    const response = await this.graphFetch<{ value: GraphScheduleResponse[] }>(
      "/me/calendar/getSchedule",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    const busySlots: BusyTimeslot[] = [];

    for (const schedule of response.value) {
      for (const item of schedule.scheduleItems) {
        busySlots.push({
          start: new Date(item.start.dateTime),
          end: new Date(item.end.dateTime),
          title: item.subject,
          source: "office365_calendar",
        });
      }
    }

    return busySlots;
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  async fetchEvents(params: FetchEventsInput): Promise<FetchEventsResult> {
    try {
      if (params.syncToken) {
        return await this.fetchEventsDelta(params);
      }

      const queryParams = new URLSearchParams();
      queryParams.set("$top", String(params.maxResults ?? 50));

      if (params.dateFrom && params.dateTo) {
        queryParams.set(
          "$filter",
          `start/dateTime ge '${params.dateFrom}' and end/dateTime le '${params.dateTo}'`
        );
      }

      if (params.pageToken) {
        queryParams.set("$skiptoken", params.pageToken);
      }

      const calPath = `/me/calendars/${encodeURIComponent(params.calendarId)}/events`;
      const response = await this.graphFetch<{
        value: GraphEvent[];
        "@odata.nextLink"?: string;
        "@odata.deltaLink"?: string;
      }>(`${calPath}?${queryParams.toString()}`);

      const events = this.mapGraphEventsToCalendarEvents(response.value);

      const nextPageToken = response["@odata.nextLink"]
        ? new URL(response["@odata.nextLink"]).searchParams.get("$skiptoken") ?? undefined
        : undefined;

      return {
        events,
        nextSyncToken: response["@odata.deltaLink"] ?? "",
        fullSyncRequired: false,
        nextPageToken,
      };
    } catch (err: unknown) {
      throw new CalendarAdapterError({
        provider: "Office365",
        message: `Failed to fetch events: ${err instanceof Error ? err.message : "unknown error"}`,
        cause: err,
      });
    }
  }

  private async fetchEventsDelta(params: FetchEventsInput): Promise<FetchEventsResult> {
    try {
      // syncToken is a full deltaLink URL — strip the Graph base to avoid double prefix
      const deltaUrl = params.syncToken!;
      const path = deltaUrl.startsWith("https://") ? deltaUrl.replace(GRAPH_BASE_URL, "") : deltaUrl;

      const response = await this.graphFetch<{
        value: GraphEvent[];
        "@odata.nextLink"?: string;
        "@odata.deltaLink"?: string;
      }>(path);

      const events = this.mapGraphEventsToCalendarEvents(response.value);

      const nextPageToken = response["@odata.nextLink"]
        ? response["@odata.nextLink"]
        : undefined;

      return {
        events,
        nextSyncToken: response["@odata.deltaLink"] ?? "",
        fullSyncRequired: false,
        nextPageToken,
      };
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;

      if (status === 410 || status === 404) {
        return { events: [], nextSyncToken: "", fullSyncRequired: true };
      }

      throw new CalendarAdapterError({
        provider: "Office365",
        message: `Delta sync failed: ${err instanceof Error ? err.message : "unknown error"}`,
        status: status ?? undefined,
        cause: err,
      });
    }
  }

  private mapGraphEventsToCalendarEvents(graphEvents: GraphEvent[]): CalendarEvent[] {
    return graphEvents.map((item) => ({
      uid: item.id,
      title: item.subject ?? undefined,
      start: new Date(item.start?.dateTime ?? ""),
      end: new Date(item.end?.dateTime ?? ""),
      isAllDay: false,
      status: "confirmed" as const,
      timeZone: item.start?.timeZone ?? undefined,
      iCalUID: item.iCalUId ?? null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Calendar listing
  // ---------------------------------------------------------------------------

  async listCalendars(): Promise<CalendarInfo[]> {
    const response = await this.graphFetch<{ value: GraphCalendar[] }>("/me/calendars");

    return response.value.map((cal) => ({
      externalId: cal.id,
      name: cal.name,
      integration: "office365_calendar",
      primary: cal.isDefaultCalendar ?? false,
      readOnly: cal.canEdit === false,
      email: cal.owner?.address,
    }));
  }

  // ---------------------------------------------------------------------------
  // Subscription (Graph subscriptions)
  // ---------------------------------------------------------------------------

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const expirationDateTime = new Date(
      Date.now() + (input.ttlSeconds ?? 4230) * 1000
    ).toISOString();

    const subscription = await this.graphFetch<{
      id: string;
      resource: string;
      expirationDateTime: string;
    }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: input.webhookUrl,
        resource: `/me/calendars/${encodeURIComponent(input.calendarId)}/events`,
        expirationDateTime,
        clientState: input.webhookToken,
      }),
    });

    return {
      channelId: subscription.id,
      resourceId: null,
      resourceUri: subscription.resource,
      expiration: new Date(subscription.expirationDateTime),
    };
  }

  async unsubscribe(input: UnsubscribeInput): Promise<void> {
    await this.graphFetch(`/subscriptions/${encodeURIComponent(input.channelId)}`, {
      method: "DELETE",
    });
  }

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$top=1", {
        headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      });
      if (response.ok) return { valid: true };
      if (response.status === 401) return { valid: false, reason: "invalid_grant" };
      if (response.status === 403) return { valid: false, reason: "account_suspended" };
      return { valid: false, reason: "unknown" };
    } catch {
      return { valid: false, reason: "unknown" };
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async graphFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${GRAPH_BASE_URL}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetchWithRetry(url, { ...options, headers }, { provider: "Office365" });

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new CalendarAdapterError({
        provider: "Office365",
        message: `Graph API error: ${response.status} ${response.statusText} — ${errorBody}`,
        status: response.status,
      });
    }

    return response.json() as Promise<T>;
  }

  private toGraphEvent(
    event: CalendarEventInput
  ): Record<string, unknown> {
    const timeZone = event.timeZone ?? "UTC";

    const graphEvent: Record<string, unknown> = {
      subject: event.title,
      start: { dateTime: event.startTime.toISOString(), timeZone } satisfies GraphEventTime,
      end: { dateTime: event.endTime.toISOString(), timeZone } satisfies GraphEventTime,
    };

    if (event.description) {
      graphEvent.body = { contentType: "HTML", content: event.calendarDescription ?? event.description };
    }

    if (event.location) {
      graphEvent.location = { displayName: event.location };
    }

    if (event.attendees?.length) {
      graphEvent.attendees = event.attendees.map(
        (a): GraphAttendee => ({
          emailAddress: { address: a.email, name: a.name },
          type: "required",
        })
      );
    }

    if (event.recurringEvent) {
      graphEvent.recurrence = this.toGraphRecurrence(event.recurringEvent, timeZone);
    }

    return graphEvent;
  }

  private toGraphRecurrence(
    rule: NonNullable<CalendarEventInput["recurringEvent"]>,
    timeZone: string
  ): Record<string, unknown> {
    const freqMap: Record<string, string> = {
      DAILY: "daily",
      WEEKLY: "weekly",
      MONTHLY: "absoluteMonthly",
      YEARLY: "absoluteYearly",
    };

    const pattern: Record<string, unknown> = {
      type: freqMap[rule.freq] ?? "daily",
      interval: rule.interval ?? 1,
    };

    const range: Record<string, unknown> = {
      startDate: new Date().toISOString().split("T")[0],
      timeZone,
    };

    if (rule.count) {
      range.type = "numbered";
      range.numberOfOccurrences = rule.count;
    } else if (rule.until) {
      range.type = "endDate";
      range.endDate = rule.until.toISOString().split("T")[0];
    } else {
      range.type = "noEnd";
    }

    return { pattern, range };
  }

  private toCalendarEventResult(graphEvent: GraphEvent): CalendarEventResult {
    return {
      uid: graphEvent.id,
      id: graphEvent.id,
      type: "office365_calendar",
      url: graphEvent.webLink,
      iCalUID: graphEvent.iCalUId ?? null,
    };
  }
}
