import { calendar_v3, calendar } from "@googleapis/calendar";
import { OAuth2Client } from "googleapis-common";

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
  GoogleCalendarCredential,
  HealthCheckResult,
  SubscribeInput,
  SubscribeResult,
  UnsubscribeInput,
} from "../calendar-adapter-types";
import { CalendarAdapterError } from "../lib/calendar-adapter-error";

const GOOGLE_CALENDAR_TYPE = "google_calendar";

export class GoogleCalendarAdapter implements CalendarAdapter {
  private readonly auth: OAuth2Client;
  private readonly cal: calendar_v3.Calendar;

  constructor(credential: GoogleCalendarCredential) {
    const { key } = credential;
    this.auth = new OAuth2Client();
    this.auth.setCredentials({
      access_token: key.access_token,
      refresh_token: key.refresh_token,
      token_type: key.token_type,
      scope: key.scope,
      expiry_date: key.expiry_date,
    });
    this.cal = calendar({ version: "v3", auth: this.auth });
  }

  async createEvent(event: CalendarEventInput, externalCalendarId?: string): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    const googleEvent = toGoogleEvent(event);

    const response = await this.cal.events.insert({
      calendarId,
      requestBody: googleEvent,
      conferenceDataVersion: event.conferenceData ? 1 : 0,
      sendUpdates: "all",
    });

    return toCalendarEventResult(response.data);
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    const calendarId = externalCalendarId ?? "primary";
    const googleEvent = toGoogleEvent(event);

    const response = await this.cal.events.patch({
      calendarId,
      eventId: uid,
      requestBody: googleEvent,
      conferenceDataVersion: event.conferenceData ? 1 : 0,
      sendUpdates: "all",
    });

    return toCalendarEventResult(response.data);
  }

  async deleteEvent(uid: string, _event?: CalendarEventInput, externalCalendarId?: string | null): Promise<void> {
    const calendarId = externalCalendarId ?? "primary";

    await this.cal.events.delete({
      calendarId,
      eventId: uid,
      sendUpdates: "all",
    });
  }

  /** Google freebusy.query accepts max 50 calendars per request */
  private static readonly FREEBUSY_BATCH_SIZE = 50;

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const calendarIds = params.calendars.map((c) => c.externalId);

    if (calendarIds.length === 0) {
      return [];
    }

    // Batch into groups of 50 (Google API limit)
    const batches: string[][] = [];
    for (let i = 0; i < calendarIds.length; i += GoogleCalendarAdapter.FREEBUSY_BATCH_SIZE) {
      batches.push(calendarIds.slice(i, i + GoogleCalendarAdapter.FREEBUSY_BATCH_SIZE));
    }

    const busySlots: BusyTimeslot[] = [];
    const timezoneCache = new Map<string, string | null>();

    for (const batch of batches) {
      const response = await this.cal.freebusy.query({
        requestBody: {
          timeMin: params.dateFrom,
          timeMax: params.dateTo,
          items: batch.map((id) => ({ id })),
        },
      });

      const calendars = response.data.calendars ?? {};

      for (const [calendarId, calendarData] of Object.entries(calendars)) {
        if (!timezoneCache.has(calendarId)) {
          timezoneCache.set(calendarId, await this.getCalendarTimeZone(calendarId));
        }
        const timeZone = timezoneCache.get(calendarId);

        for (const busy of calendarData.busy ?? []) {
          if (!busy.start || !busy.end) continue;

          busySlots.push({
            start: new Date(busy.start),
            end: new Date(busy.end),
            source: calendarId,
            timeZone: timeZone ?? undefined,
          });
        }
      }
    }

    return busySlots;
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const response = await this.cal.calendarList.list();
    const items = response.data.items ?? [];

    return items.map((item) => ({
      externalId: item.id ?? "",
      name: item.summary ?? undefined,
      integration: GOOGLE_CALENDAR_TYPE,
      primary: item.primary ?? false,
      readOnly: item.accessRole === "reader" || item.accessRole === "freeBusyReader",
      email: item.id ?? undefined,
    }));
  }

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const channelId = crypto.randomUUID();
    const expirationMs = input.ttlSeconds ? Date.now() + input.ttlSeconds * 1000 : undefined;

    const response = await this.cal.events.watch({
      calendarId: input.calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: input.webhookUrl,
        token: input.webhookToken,
        expiration: expirationMs?.toString(),
      },
    });

    return {
      channelId: response.data.id ?? channelId,
      resourceId: response.data.resourceId ?? null,
      resourceUri: response.data.resourceUri ?? null,
      expiration: response.data.expiration ? new Date(Number(response.data.expiration)) : null,
    };
  }

  async unsubscribe(input: UnsubscribeInput): Promise<void> {
    await this.cal.channels.stop({
      requestBody: {
        id: input.channelId,
        resourceId: input.resourceId ?? undefined,
      },
    });
  }

  async fetchEvents(params: FetchEventsInput): Promise<FetchEventsResult> {
    try {
      const requestParams: calendar_v3.Params$Resource$Events$List = {
        calendarId: params.calendarId,
        singleEvents: true,
        maxResults: params.maxResults ?? 250,
      };

      if (params.pageToken) {
        requestParams.pageToken = params.pageToken;
      }

      if (params.syncToken) {
        requestParams.syncToken = params.syncToken;
      } else {
        if (params.dateFrom) requestParams.timeMin = params.dateFrom;
        if (params.dateTo) requestParams.timeMax = params.dateTo;
      }

      const response = await this.cal.events.list(requestParams);
      const items = response.data.items ?? [];

      const events: CalendarEvent[] = items.map((item) => ({
        uid: item.id ?? "",
        title: item.summary ?? undefined,
        description: item.description ?? undefined,
        location: item.location ?? undefined,
        start: new Date(item.start?.dateTime ?? item.start?.date ?? ""),
        end: new Date(item.end?.dateTime ?? item.end?.date ?? ""),
        isAllDay: Boolean(item.start?.date),
        status: (item.status as CalendarEvent["status"]) ?? "confirmed",
        timeZone: item.start?.timeZone ?? undefined,
        iCalUID: item.iCalUID ?? null,
        etag: item.etag ?? undefined,
        recurringEventId: item.recurringEventId ?? null,
        originalStartTime: item.originalStartTime?.dateTime
          ? new Date(item.originalStartTime.dateTime)
          : null,
      }));

      return {
        events,
        nextSyncToken: response.data.nextSyncToken ?? "",
        fullSyncRequired: false,
        nextPageToken: response.data.nextPageToken ?? undefined,
      };
    } catch (err: unknown) {
      const status = (err as { code?: number }).code;

      if (status === 410) {
        return { events: [], nextSyncToken: "", fullSyncRequired: true };
      }

      throw new CalendarAdapterError({
        provider: "Google",
        message: `Failed to fetch events: ${err instanceof Error ? err.message : "unknown error"}`,
        status: status ?? undefined,
        cause: err,
      });
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.cal.calendarList.list({ maxResults: 1 });
      return { valid: true };
    } catch (err: unknown) {
      const status = (err as { code?: number }).code;

      if (status === 401) {
        return { valid: false, reason: "invalid_grant" };
      }
      if (status === 403) {
        return { valid: false, reason: "account_suspended" };
      }

      return { valid: false, reason: "unknown" };
    }
  }

  private async getCalendarTimeZone(calendarId: string): Promise<string | null> {
    try {
      const response = await this.cal.calendars.get({ calendarId });
      return response.data.timeZone ?? null;
    } catch {
      return null;
    }
  }
}

function toGoogleEvent(event: CalendarEventInput): calendar_v3.Schema$Event {
  const googleEvent: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.calendarDescription ?? event.description,
    location: event.location,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: event.timeZone,
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: event.timeZone,
    },
    iCalUID: event.uid,
    visibility: event.visibility,
    status: event.status,
    guestsCanSeeOtherGuests: event.guestsCanSeeOtherGuests,
    guestsCanModify: event.guestsCanModify,
  };

  if (event.reminders?.length) {
    googleEvent.reminders = {
      useDefault: false,
      overrides: event.reminders.map((r) => ({ method: r.method, minutes: r.minutes })),
    };
  }

  if (event.attendees?.length) {
    googleEvent.attendees = event.attendees.map((a) => ({
      email: a.email,
      displayName: a.name,
      responseStatus: a.responseStatus ?? "needsAction",
      optional: a.optional,
    }));
  }

  if (event.organizer) {
    googleEvent.organizer = {
      email: event.organizer.email,
      displayName: event.organizer.name,
    };
  }

  if (event.recurringEvent) {
    googleEvent.recurrence = [toRRuleString(event.recurringEvent)];
  }

  if (event.conferenceData) {
    googleEvent.conferenceData = {
      createRequest: event.conferenceData.createRequest
        ? {
            requestId: event.conferenceData.createRequest.requestId,
            conferenceSolutionKey: {
              type: event.conferenceData.createRequest.conferenceSolutionKey.type,
            },
          }
        : undefined,
      entryPoints: event.conferenceData.entryPoints?.map((ep) => ({
        entryPointType: ep.entryPointType,
        uri: ep.uri,
        label: ep.label,
      })),
    };
  }

  return googleEvent;
}

function toRRuleString(rule: CalendarEventInput["recurringEvent"]): string {
  if (!rule) return "";

  const parts = [`FREQ=${rule.freq}`];

  if (rule.interval && rule.interval > 1) {
    parts.push(`INTERVAL=${rule.interval}`);
  }
  if (rule.count) {
    parts.push(`COUNT=${rule.count}`);
  }
  if (rule.until) {
    const d = rule.until;
    const yyyymmdd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    parts.push(`UNTIL=${yyyymmdd}T235959Z`);
  }
  if (rule.tzid) {
    parts.push(`TZID=${rule.tzid}`);
  }

  return `RRULE:${parts.join(";")}`;
}

function toCalendarEventResult(data: calendar_v3.Schema$Event): CalendarEventResult {
  return {
    uid: data.id ?? "",
    id: data.id ?? "",
    type: GOOGLE_CALENDAR_TYPE,
    url: data.htmlLink ?? undefined,
    iCalUID: data.iCalUID ?? null,
    thirdPartyRecurringEventId: data.recurringEventId ?? null,
    additionalInfo: {
      hangoutLink: data.hangoutLink,
      conferenceData: data.conferenceData,
    },
  };
}
