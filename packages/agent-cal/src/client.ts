/**
 * AgentCal — TypeScript client for Cal.com Unified Calendar API.
 * Use with API key or access token to list, create, update, delete calendar events.
 */

import type {
  AgentCalOptions,
  BusyTimeSlot,
  CalendarConnection,
  CreateCalendarEventInput,
  GetCalendarsResponse,
  GetFreeBusyInput,
  GetFreeBusyResponse,
  GetUnifiedCalendarEventResponse,
  ListCalendarEventsInput,
  ListConnectionsResponse,
  ListUnifiedCalendarEventsResponse,
  UnifiedCalendarEvent,
  UpdateCalendarEventInput,
} from "./types.js";
import { request } from "./utils/http.js";

const DEFAULT_BASE = "https://api.cal.com";

export class AgentCal {
  private readonly bearerToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly maxRetries: number;

  /**
   * Create an AgentCal client.
   * Provide either apiKey (cal_...) or accessToken. apiKey takes precedence.
   */
  constructor(options: AgentCalOptions) {
    const token = options.apiKey ?? options.accessToken;
    if (!token) {
      throw new Error("AgentCal requires either apiKey or accessToken");
    }
    this.bearerToken = token;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE;
    this.fetchImpl = options.fetch;
    this.maxRetries = options.maxRetries ?? 2;
  }

  private async api<T>(config: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    body?: unknown;
  }): Promise<T> {
    return request<T>({
      method: config.method,
      path: config.path,
      body: config.body,
      baseUrl: this.baseUrl,
      fetchImpl: this.fetchImpl,
      maxRetries: this.maxRetries,
      bearerToken: this.bearerToken,
    });
  }

  /**
   * List connected calendars for the authenticated user (legacy full shape).
   */
  async getCalendars(): Promise<GetCalendarsResponse> {
    return this.api<GetCalendarsResponse>({ method: "GET", path: "/v2/calendars" });
  }

  /**
   * List calendar connections with connectionId for use in connection-scoped endpoints.
   */
  async getConnections(): Promise<CalendarConnection[]> {
    const res = await this.api<ListConnectionsResponse>({
      method: "GET",
      path: "/v2/calendars/connections",
    });
    if (res.status === "error") {
      throw new Error("Failed to list connections");
    }
    return res.data.connections;
  }

  /**
   * List events in a date range for a specific connection.
   */
  async listEvents(
    connectionId: string,
    input: ListCalendarEventsInput
  ): Promise<UnifiedCalendarEvent[]> {
    const params = new URLSearchParams({
      from: input.from,
      to: input.to,
    });
    if (input.timeZone) params.set("timeZone", input.timeZone);
    if (input.calendarId) params.set("calendarId", input.calendarId);
    const res = await this.api<ListUnifiedCalendarEventsResponse>({
      method: "GET",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/events?${params.toString()}`,
    });
    if (res.status === "error") {
      throw new Error("Failed to list events");
    }
    return res.data;
  }

  /**
   * Create a new event on a specific connection.
   */
  async createEvent(
    connectionId: string,
    input: CreateCalendarEventInput
  ): Promise<UnifiedCalendarEvent> {
    const res = await this.api<GetUnifiedCalendarEventResponse>({
      method: "POST",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/events`,
      body: input,
    });
    if (res.status === "error" || !res.data) {
      throw new Error("Failed to create event");
    }
    return res.data;
  }

  /**
   * Get a single event by ID for a specific connection.
   */
  async getEvent(connectionId: string, eventId: string): Promise<UnifiedCalendarEvent> {
    const res = await this.api<GetUnifiedCalendarEventResponse>({
      method: "GET",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/events/${encodeURIComponent(eventId)}`,
    });
    if (res.status === "error" || !res.data) {
      throw new Error("Failed to get event");
    }
    return res.data;
  }

  /**
   * Update an existing event. Partial updates supported.
   */
  async updateEvent(
    connectionId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ): Promise<UnifiedCalendarEvent> {
    const res = await this.api<GetUnifiedCalendarEventResponse>({
      method: "PATCH",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/events/${encodeURIComponent(eventId)}`,
      body: input,
    });
    if (res.status === "error" || !res.data) {
      throw new Error("Failed to update event");
    }
    return res.data;
  }

  /**
   * Delete/cancel an event by provider event ID for a specific connection.
   */
  async deleteEvent(connectionId: string, eventId: string): Promise<void> {
    await this.api<unknown>({
      method: "DELETE",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/events/${encodeURIComponent(eventId)}`,
    });
  }

  /**
   * Get free/busy slots for a specific connection.
   */
  async getFreeBusy(
    connectionId: string,
    input: GetFreeBusyInput
  ): Promise<BusyTimeSlot[]> {
    const params = new URLSearchParams({
      from: input.from,
      to: input.to,
    });
    if (input.timeZone) params.set("timeZone", input.timeZone);
    const res = await this.api<GetFreeBusyResponse>({
      method: "GET",
      path: `/v2/calendars/connections/${encodeURIComponent(connectionId)}/freebusy?${params.toString()}`,
    });
    if (res.status === "error") {
      throw new Error("Failed to get free/busy");
    }
    return res.data;
  }
}
