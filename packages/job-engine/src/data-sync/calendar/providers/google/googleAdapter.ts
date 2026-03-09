import type { CalendarProviderAdapter } from "../adapter";
import { getGoogleAuthWithRefresh } from "../auth";
import {
  CalendarProvider,
  CursorExpiredError,
  ExternalEventStatus,
  ProviderTransientError,
  type CredentialLike,
  type DeltaSyncResultDTO,
  type InitialSyncResultDTO,
  type NormalizedCalendarEventDTO,
  type ProviderCursorDTO,
  type ProviderSubscriptionDTO,
} from "../types";

type GoogleCalendarEventLike = Record<string, unknown>;
const GOOGLE_CHANNEL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getFirstHeaderValue = (
  headers: Record<string, string | string[] | undefined>,
  key: string
): string | undefined => {
  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const isWithinWindow = (isoValue: string, windowStart: Date, windowEnd: Date): boolean => {
  const epoch = Date.parse(isoValue);
  if (Number.isNaN(epoch)) {
    return false;
  }
  return epoch >= windowStart.getTime() && epoch <= windowEnd.getTime();
};

const capOccurrences = <T>(items: T[], maxOccurrencesCap: number): T[] => {
  if (maxOccurrencesCap <= 0) {
    return [];
  }
  return items.slice(0, maxOccurrencesCap);
};

const getGoogleChannelExpirationMs = (): number => Date.now() + GOOGLE_CHANNEL_TTL_MS;

export class GoogleCalendarProviderAdapter implements CalendarProviderAdapter {
  readonly provider = CalendarProvider.GOOGLE;

  async fetchInitialWindow(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    windowStart: Date;
    windowEnd: Date;
    maxOccurrencesCap: number;
  }): Promise<InitialSyncResultDTO> {
    const auth = await getGoogleAuthWithRefresh(params.credential);
    const rawEvents: GoogleCalendarEventLike[] = [];
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      params.providerCalendarId
    )}/events`;

    let pageToken: string | null = null;
    let nextSyncToken: string | null = null;

    do {
      const query = new URLSearchParams({
        singleEvents: "true",
        timeMin: params.windowStart.toISOString(),
        timeMax: params.windowEnd.toISOString(),
      });
      if (pageToken) {
        query.set("pageToken", pageToken);
      }

      const response = await fetch(`${baseUrl}?${query.toString()}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new ProviderTransientError({
          provider: this.provider,
          message: `Google events list failed with status ${response.status}.`,
        });
      }

      const payload = (await response.json()) as {
        items?: unknown;
        nextPageToken?: unknown;
        nextSyncToken?: unknown;
      };
      const items = Array.isArray(payload.items) ? (payload.items as GoogleCalendarEventLike[]) : [];
      if (items.length > 0 && rawEvents.length < params.maxOccurrencesCap) {
        rawEvents.push(...items.slice(0, params.maxOccurrencesCap - rawEvents.length));
      }
      pageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : null;
      nextSyncToken = typeof payload.nextSyncToken === "string" ? payload.nextSyncToken : nextSyncToken;
    } while (pageToken);

    if (!nextSyncToken) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: "Google events list did not return nextSyncToken.",
      });
    }

    const mapped = rawEvents
      .map((event) => this.mapGoogleEventToNormalized(event, params.providerCalendarId, "upsert"))
      .filter((event): event is NormalizedCalendarEventDTO => event !== null);

    return {
      events: capOccurrences(mapped, params.maxOccurrencesCap),
      nextCursor: {
        type: "GOOGLE_SYNC_TOKEN",
        value: nextSyncToken,
      },
      subscription: null,
    };
  }

  async fetchDelta(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    cursor: ProviderCursorDTO;
    windowStart: Date;
    windowEnd: Date;
    maxOccurrencesCap: number;
  }): Promise<DeltaSyncResultDTO> {
    const auth = await getGoogleAuthWithRefresh(params.credential);

    if (!params.cursor.value) {
      throw new CursorExpiredError({
        provider: this.provider,
        reason: "Missing Google sync token.",
      });
    }

    const rawChanges: GoogleCalendarEventLike[] = [];
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      params.providerCalendarId
    )}/events`;
    let pageToken: string | null = null;
    let nextSyncToken: string | null = null;

    do {
      const query = new URLSearchParams({
        syncToken: params.cursor.value,
        showDeleted: "true",
        singleEvents: "true",
      });
      if (pageToken) {
        query.set("pageToken", pageToken);
      }

      const response = await fetch(`${baseUrl}?${query.toString()}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 410) {
          throw new CursorExpiredError({
            provider: this.provider,
            reason: "Google sync token expired.",
          });
        }

        throw new ProviderTransientError({
          provider: this.provider,
          message: `Google delta events list failed with status ${response.status}.`,
        });
      }

      const payload = (await response.json()) as {
        items?: unknown;
        nextPageToken?: unknown;
        nextSyncToken?: unknown;
      };
      const items = Array.isArray(payload.items) ? (payload.items as GoogleCalendarEventLike[]) : [];
      if (items.length > 0 && rawChanges.length < params.maxOccurrencesCap) {
        rawChanges.push(...items.slice(0, params.maxOccurrencesCap - rawChanges.length));
      }
      pageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : null;
      nextSyncToken = typeof payload.nextSyncToken === "string" ? payload.nextSyncToken : nextSyncToken;
    } while (pageToken);

    const mapped = rawChanges
      .map((event) => {
        const status = typeof event.status === "string" ? event.status : "";
        const changeType = status === "cancelled" ? "delete" : "upsert";
        return this.mapGoogleEventToNormalized(event, params.providerCalendarId, changeType);
      })
      .filter((event): event is NormalizedCalendarEventDTO => event !== null)
      .filter((event) => isWithinWindow(event.startTime, params.windowStart, params.windowEnd));

    return {
      changes: capOccurrences(mapped, params.maxOccurrencesCap),
      nextCursor: {
        type: "GOOGLE_SYNC_TOKEN",
        value: nextSyncToken ?? params.cursor.value,
      },
    };
  }

  async createSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO> {
    const auth = await getGoogleAuthWithRefresh(params.credential);
    const channelId = `calid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const channelToken = `calid-token-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    // Google Calendar push channels are constrained to a maximum 7-day expiration.
    const expirationMs = getGoogleChannelExpirationMs();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      params.providerCalendarId
    )}/events/watch`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: params.webhookUrl,
        token: channelToken,
        expiration: expirationMs,
      }),
    });

    if (!response.ok) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: `Google channel watch failed with status ${response.status}.`,
      });
    }

    const payload = (await response.json()) as {
      id?: unknown;
      resourceId?: unknown;
      expiration?: unknown;
    };
    const subscriptionId = typeof payload.id === "string" ? payload.id : "";
    if (!subscriptionId) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: "Google channel watch did not return a valid channel id.",
      });
    }

    const expirationRaw =
      typeof payload.expiration === "string" || typeof payload.expiration === "number"
        ? payload.expiration
        : null;
    const expirationEpochMs = expirationRaw !== null ? Number(expirationRaw) : expirationMs;
    const expirationDateTime =
      Number.isFinite(expirationEpochMs) && expirationEpochMs > 0
        ? new Date(expirationEpochMs).toISOString()
        : null;

    return {
      subscriptionId,
      resourceId: typeof payload.resourceId === "string" ? payload.resourceId : null,
      expirationDateTime,
      clientState: channelToken,
    };
  }

  async renewSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    subscription: ProviderSubscriptionDTO;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO> {
    const created = await this.createSubscription({
      credential: params.credential,
      providerCalendarId: params.providerCalendarId,
      webhookUrl: params.webhookUrl,
    });

    try {
      await this.deleteSubscription({
        credential: params.credential,
        subscription: params.subscription,
      });
    } catch {
      // Best effort old-channel cleanup; keep renewed subscription active.
    }

    return created;
  }

  async deleteSubscription(params: {
    credential: CredentialLike;
    subscription: ProviderSubscriptionDTO;
  }): Promise<void> {
    const auth = await getGoogleAuthWithRefresh(params.credential);
    const subscriptionId = params.subscription.subscriptionId;
    const resourceId = params.subscription.resourceId;

    if (!subscriptionId || !resourceId) {
      return;
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: subscriptionId,
        resourceId,
      }),
    });

    if (!response.ok) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: `Google channel stop failed with status ${response.status}.`,
      });
    }
  }

  async verifyWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    providerHint?: unknown;
  }): Promise<{ isValid: boolean; reason?: string }> {
    void params.rawBody;
    const resourceState = getFirstHeaderValue(params.headers, "x-goog-resource-state");
    const channelId = getFirstHeaderValue(params.headers, "x-goog-channel-id");

    if (!resourceState || !channelId) {
      return { isValid: false, reason: "Missing required Google webhook headers." };
    }

    const hint = (params.providerHint ?? {}) as Record<string, unknown>;
    const expectedToken =
      typeof hint.expectedChannelToken === "string" ? hint.expectedChannelToken : undefined;
    const gotToken = getFirstHeaderValue(params.headers, "x-goog-channel-token");
    if (expectedToken && gotToken !== expectedToken) {
      return { isValid: false, reason: "Google channel token mismatch." };
    }

    return { isValid: true };
  }

  async extractWebhookRouting(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
  }): Promise<{
    providerCalendarId?: string | null;
    subscriptionId?: string | null;
    resourceId?: string | null;
  }> {
    void params.rawBody;
    const subscriptionId = getFirstHeaderValue(params.headers, "x-goog-channel-id") ?? null;
    const resourceId = getFirstHeaderValue(params.headers, "x-goog-resource-id") ?? null;
    const resourceUri = getFirstHeaderValue(params.headers, "x-goog-resource-uri") ?? "";
    const providerCalendarId = this.extractCalendarIdFromGoogleResourceUri(resourceUri);

    return {
      providerCalendarId,
      subscriptionId,
      resourceId,
    };
  }

  private extractCalendarIdFromGoogleResourceUri(resourceUri: string): string | null {
    if (!resourceUri) {
      return null;
    }

    // Example resource URI path segment: /calendars/{calendarId}/events
    const marker = "/calendars/";
    const markerPos = resourceUri.indexOf(marker);
    if (markerPos < 0) {
      return null;
    }

    const start = markerPos + marker.length;
    const end = resourceUri.indexOf("/events", start);
    if (end <= start) {
      return null;
    }

    return decodeURIComponent(resourceUri.slice(start, end));
  }

  private mapGoogleEventToNormalized(
    event: GoogleCalendarEventLike,
    providerCalendarId: string,
    changeType: "upsert" | "delete"
  ): NormalizedCalendarEventDTO | null {
    const id = typeof event.id === "string" ? event.id : null;
    if (!id) {
      return null;
    }

    const statusRaw = typeof event.status === "string" ? event.status : "";
    const status =
      statusRaw === "cancelled"
        ? ExternalEventStatus.CANCELLED
        : statusRaw === "tentative"
        ? ExternalEventStatus.TENTATIVE
        : ExternalEventStatus.CONFIRMED;

    const start = this.extractGoogleStart(event.start);
    const end = this.extractGoogleEnd(event.end);
    if (!start || !end) {
      return null;
    }

    // Google->DTO mapping:
    // - id -> externalEventId
    // - iCalUID -> iCalUID
    // - recurringEventId -> recurringEventId
    // - originalStartTime.dateTime/date -> originalStartTime
    // - start.dateTime/date -> startTime
    // - end.dateTime/date -> endTime
    // - start.timeZone -> timeZone
    // - summary -> title
    // - description -> description
    // - location -> location
    // - hangoutLink/conferenceData.entryPoints -> meetingUrl
    // - colorId -> color
    // - transparency -> showAsBusy
    // - status -> status
    // - updated -> providerUpdatedAt
    // - created -> providerCreatedAt
    // - sequence -> sequence
    return {
      provider: CalendarProvider.GOOGLE,
      externalEventId: id,
      iCalUID: typeof event.iCalUID === "string" ? event.iCalUID : null,
      calendarId: providerCalendarId,
      recurringEventId: typeof event.recurringEventId === "string" ? event.recurringEventId : null,
      originalStartTime: this.extractGoogleOriginalStart(event.originalStartTime),
      startTime: start.value,
      endTime: end.value,
      isAllDay: start.isAllDay,
      timeZone: start.timeZone,
      title: typeof event.summary === "string" ? event.summary : undefined,
      description: typeof event.description === "string" ? event.description : undefined,
      location: typeof event.location === "string" ? event.location : undefined,
      meetingUrl: typeof event.hangoutLink === "string" ? event.hangoutLink : undefined,
      color: typeof event.colorId === "string" ? event.colorId : undefined,
      showAsBusy: event.transparency !== "transparent",
      status,
      providerUpdatedAt: typeof event.updated === "string" ? event.updated : null,
      providerCreatedAt: typeof event.created === "string" ? event.created : null,
      sequence: typeof event.sequence === "number" ? event.sequence : null,
      rawPayload: event,
      changeType,
    };
  }

  private extractGoogleStart(
    value: unknown
  ): { value: string; isAllDay: boolean; timeZone: string | null } | null {
    const start = value as Record<string, unknown> | null;
    if (!start || typeof start !== "object") {
      return null;
    }

    if (typeof start.dateTime === "string") {
      return {
        value: start.dateTime,
        isAllDay: false,
        timeZone: typeof start.timeZone === "string" ? start.timeZone : null,
      };
    }

    if (typeof start.date === "string") {
      const iso = `${start.date}T00:00:00.000Z`;
      return {
        value: iso,
        isAllDay: true,
        timeZone: typeof start.timeZone === "string" ? start.timeZone : null,
      };
    }

    return null;
  }

  private extractGoogleEnd(value: unknown): { value: string } | null {
    const end = value as Record<string, unknown> | null;
    if (!end || typeof end !== "object") {
      return null;
    }

    if (typeof end.dateTime === "string") {
      return { value: end.dateTime };
    }

    if (typeof end.date === "string") {
      return { value: `${end.date}T00:00:00.000Z` };
    }

    return null;
  }

  private extractGoogleOriginalStart(value: unknown): string | null {
    const original = value as Record<string, unknown> | null;
    if (!original || typeof original !== "object") {
      return null;
    }
    if (typeof original.dateTime === "string") {
      return original.dateTime;
    }
    if (typeof original.date === "string") {
      return `${original.date}T00:00:00.000Z`;
    }
    return null;
  }
}
