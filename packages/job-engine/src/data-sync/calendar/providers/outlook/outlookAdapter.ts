import type { CalendarProviderAdapter } from "../adapter";
import { getOutlookAuthWithRefresh } from "../auth";
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

type OutlookEventLike = Record<string, unknown>;

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

const capOccurrences = <T>(items: T[], maxOccurrencesCap: number): T[] => {
  if (maxOccurrencesCap <= 0) {
    return [];
  }
  return items.slice(0, maxOccurrencesCap);
};

const inWindow = (startIso: string, windowStart: Date, windowEnd: Date): boolean => {
  const ms = Date.parse(startIso);
  if (Number.isNaN(ms)) {
    return false;
  }
  return ms >= windowStart.getTime() && ms <= windowEnd.getTime();
};

export class OutlookCalendarProviderAdapter implements CalendarProviderAdapter {
  readonly provider = CalendarProvider.OUTLOOK;

  async fetchInitialWindow(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    windowStart: Date;
    windowEnd: Date;
    maxOccurrencesCap: number;
  }): Promise<InitialSyncResultDTO> {
    const auth = await getOutlookAuthWithRefresh(params.credential);
    const rawEvents: OutlookEventLike[] = [];
    const query = new URLSearchParams({
      startDateTime: params.windowStart.toISOString(),
      endDateTime: params.windowEnd.toISOString(),
    });
    let requestUrl: string | null = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(
      params.providerCalendarId
    )}/calendarView?${query.toString()}`;
    let deltaLink: string | null = null;

    while (requestUrl) {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new ProviderTransientError({
          provider: this.provider,
          message: `Outlook calendarView failed with status ${response.status}.`,
        });
      }

      const payload = (await response.json()) as {
        value?: unknown;
        "@odata.nextLink"?: unknown;
        "@odata.deltaLink"?: unknown;
      };
      const items = Array.isArray(payload.value) ? (payload.value as OutlookEventLike[]) : [];
      if (items.length > 0 && rawEvents.length < params.maxOccurrencesCap) {
        rawEvents.push(...items.slice(0, params.maxOccurrencesCap - rawEvents.length));
      }

      const payloadDeltaLink =
        typeof payload["@odata.deltaLink"] === "string" ? payload["@odata.deltaLink"] : null;
      if (payloadDeltaLink) {
        deltaLink = payloadDeltaLink;
      }
      requestUrl = typeof payload["@odata.nextLink"] === "string" ? payload["@odata.nextLink"] : null;
    }

    if (!deltaLink) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: "Outlook calendarView did not return @odata.deltaLink.",
      });
    }

    const mapped = rawEvents
      .map((event) => this.mapOutlookEventToNormalized(event, params.providerCalendarId, "upsert"))
      .filter((event): event is NormalizedCalendarEventDTO => event !== null);
    // .filter((event) => inWindow(event.startTime, params.windowStart, params.windowEnd));

    return {
      events: capOccurrences(mapped, params.maxOccurrencesCap),
      nextCursor: {
        type: "OUTLOOK_DELTA_LINK",
        value: deltaLink,
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
    const auth = await getOutlookAuthWithRefresh(params.credential);

    if (!params.cursor.value) {
      throw new CursorExpiredError({
        provider: this.provider,
        reason: "Missing Graph deltaLink.",
      });
    }

    const rawChanges: OutlookEventLike[] = [];
    let requestUrl: string | null = params.cursor.value;
    let nextDeltaLink: string | null = null;

    while (requestUrl) {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 404 || response.status === 410) {
          throw new CursorExpiredError({
            provider: this.provider,
            reason: "Outlook delta token expired or invalid.",
            retryStrategy: "full_resync",
          });
        }

        throw new ProviderTransientError({
          provider: this.provider,
          message: `Outlook delta query failed with status ${response.status}.`,
        });
      }

      const payload = (await response.json()) as {
        value?: unknown;
        "@odata.nextLink"?: unknown;
        "@odata.deltaLink"?: unknown;
      };
      const items = Array.isArray(payload.value) ? (payload.value as OutlookEventLike[]) : [];
      if (items.length > 0 && rawChanges.length < params.maxOccurrencesCap) {
        rawChanges.push(...items.slice(0, params.maxOccurrencesCap - rawChanges.length));
      }

      const payloadDeltaLink =
        typeof payload["@odata.deltaLink"] === "string" ? payload["@odata.deltaLink"] : null;
      if (payloadDeltaLink) {
        nextDeltaLink = payloadDeltaLink;
      }
      requestUrl = typeof payload["@odata.nextLink"] === "string" ? payload["@odata.nextLink"] : null;
    }

    const mapped = rawChanges
      .map((event) => {
        const removed = event["@removed"] as Record<string, unknown> | undefined;
        if (removed && typeof removed === "object") {
          return this.mapOutlookRemovedEventToNormalized(event, params.providerCalendarId);
        }
        return this.mapOutlookEventToNormalized(event, params.providerCalendarId, "upsert");
      })
      .filter((event): event is NormalizedCalendarEventDTO => event !== null)
      .filter(
        (event) =>
          event.changeType === "delete" || inWindow(event.startTime, params.windowStart, params.windowEnd)
      );

    return {
      changes: capOccurrences(mapped, params.maxOccurrencesCap),
      nextCursor: {
        type: "OUTLOOK_DELTA_LINK",
        value: nextDeltaLink ?? params.cursor.value,
      },
    };
  }

  async createSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO> {
    const auth = await getOutlookAuthWithRefresh(params.credential);
    const clientState = `calid-outlook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const expirationDateTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl: params.webhookUrl,
        lifecycleNotificationUrl: params.webhookUrl,
        resource: `/me/calendars/${encodeURIComponent(params.providerCalendarId)}/events`,
        expirationDateTime,
        clientState,
      }),
    });

    if (!response.ok) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: `Outlook subscription creation failed with status ${response.status}.`,
      });
    }

    const payload = (await response.json()) as {
      id?: unknown;
      resourceId?: unknown;
      expirationDateTime?: unknown;
      clientState?: unknown;
    };
    const subscriptionId = typeof payload.id === "string" ? payload.id : "";
    if (!subscriptionId) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: "Outlook subscription creation did not return a valid subscription id.",
      });
    }

    return {
      subscriptionId,
      resourceId: typeof payload.resourceId === "string" ? payload.resourceId : null,
      expirationDateTime:
        typeof payload.expirationDateTime === "string" ? payload.expirationDateTime : expirationDateTime,
      clientState: typeof payload.clientState === "string" ? payload.clientState : clientState,
    };
  }

  async renewSubscription(params: {
    credential: CredentialLike;
    providerCalendarId: string;
    subscription: ProviderSubscriptionDTO;
    webhookUrl: string;
  }): Promise<ProviderSubscriptionDTO> {
    const auth = await getOutlookAuthWithRefresh(params.credential);
    void params.providerCalendarId;
    void params.webhookUrl;
    const expirationDateTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(
        params.subscription.subscriptionId
      )}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          expirationDateTime,
        }),
      }
    );

    if (!response.ok) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: `Outlook subscription renew failed with status ${response.status}.`,
      });
    }

    const payload = (await response.json()) as {
      id?: unknown;
      resourceId?: unknown;
      expirationDateTime?: unknown;
      clientState?: unknown;
    };

    return {
      subscriptionId:
        typeof payload.id === "string" && payload.id.length > 0
          ? payload.id
          : params.subscription.subscriptionId,
      resourceId:
        typeof payload.resourceId === "string" ? payload.resourceId : params.subscription.resourceId ?? null,
      expirationDateTime:
        typeof payload.expirationDateTime === "string"
          ? payload.expirationDateTime
          : params.subscription.expirationDateTime ?? expirationDateTime,
      clientState:
        typeof payload.clientState === "string"
          ? payload.clientState
          : params.subscription.clientState ?? null,
    };
  }

  async deleteSubscription(params: {
    credential: CredentialLike;
    subscription: ProviderSubscriptionDTO;
  }): Promise<void> {
    const auth = await getOutlookAuthWithRefresh(params.credential);
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(
        params.subscription.subscriptionId
      )}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new ProviderTransientError({
        provider: this.provider,
        message: `Outlook subscription delete failed with status ${response.status}.`,
      });
    }
  }

  async verifyWebhook(params: {
    headers: Record<string, string | string[] | undefined>;
    rawBody: string;
    providerHint?: unknown;
  }): Promise<{ isValid: boolean; reason?: string }> {
    const providerHint = (params.providerHint ?? {}) as Record<string, unknown>;
    const validationToken =
      typeof providerHint.validationToken === "string" ? providerHint.validationToken : null;

    // Microsoft Graph validation handshake request.
    if (validationToken) {
      return { isValid: true };
    }

    if (!params.rawBody || params.rawBody.length === 0) {
      return { isValid: false, reason: "Missing webhook body." };
    }

    const contentType = getFirstHeaderValue(params.headers, "content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { isValid: false, reason: "Unexpected content type for Outlook webhook." };
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
    const payload = this.parseOutlookWebhookPayload(params.rawBody);
    if (!payload) {
      return {
        providerCalendarId: null,
        subscriptionId: null,
        resourceId: null,
      };
    }

    return {
      providerCalendarId: payload.providerCalendarId,
      subscriptionId: payload.subscriptionId,
      resourceId: payload.resourceId,
    };
  }

  private parseOutlookWebhookPayload(rawBody: string): {
    providerCalendarId: string | null;
    subscriptionId: string | null;
    resourceId: string | null;
  } | null {
    try {
      const parsed = JSON.parse(rawBody) as { value?: Array<Record<string, unknown>> };
      const first = Array.isArray(parsed.value) ? parsed.value[0] : null;
      if (!first) {
        return null;
      }

      const subscriptionId = typeof first.subscriptionId === "string" ? first.subscriptionId : null;
      const resourceData = (first.resourceData ?? {}) as Record<string, unknown>;
      const resourceId = typeof resourceData.id === "string" ? resourceData.id : null;
      const resource = typeof first.resource === "string" ? first.resource : "";
      const providerCalendarId = this.extractCalendarIdFromGraphResource(resource);

      return {
        providerCalendarId,
        subscriptionId,
        resourceId,
      };
    } catch {
      return null;
    }
  }

  private extractCalendarIdFromGraphResource(resource: string): string | null {
    if (!resource) {
      return null;
    }

    // Example: users/{user-id}/calendars/{calendar-id}/events
    const marker = "/calendars/";
    const markerPos = resource.indexOf(marker);
    if (markerPos < 0) {
      return null;
    }

    const start = markerPos + marker.length;
    const tail = resource.slice(start);
    const nextSlash = tail.indexOf("/");
    const calendarId = nextSlash >= 0 ? tail.slice(0, nextSlash) : tail;
    return calendarId || null;
  }

  private mapOutlookEventToNormalized(
    event: OutlookEventLike,
    providerCalendarId: string,
    changeType: "upsert" | "delete"
  ): NormalizedCalendarEventDTO | null {
    const id = typeof event.id === "string" ? event.id : null;
    if (!id) {
      return null;
    }

    const start = this.extractOutlookDateTime(event.start);
    const end = this.extractOutlookDateTime(event.end);
    if (!start || !end) {
      return null;
    }

    const statusRaw = typeof event.showAs === "string" ? event.showAs : "";
    const normalizedStatus =
      statusRaw === "tentative"
        ? ExternalEventStatus.TENTATIVE
        : statusRaw === "free" && changeType === "delete"
        ? ExternalEventStatus.CANCELLED
        : ExternalEventStatus.CONFIRMED;

    // Outlook->DTO mapping:
    // - id -> externalEventId
    // - iCalUId -> iCalUID
    // - seriesMasterId -> recurringEventId
    // - originalStart -> originalStartTime
    // - start.dateTime + start.timeZone -> startTime/timeZone
    // - end.dateTime + end.timeZone -> endTime
    // - isAllDay -> isAllDay
    // - subject -> title
    // - body.content -> description
    // - location.displayName -> location
    // - onlineMeeting.joinUrl -> meetingUrl
    // - showAs -> showAsBusy + status
    // - lastModifiedDateTime -> providerUpdatedAt
    // - createdDateTime -> providerCreatedAt
    // - changeKey (non-numeric) is not persisted as sequence
    return {
      provider: CalendarProvider.OUTLOOK,
      externalEventId: id,
      iCalUID: typeof event.iCalUId === "string" ? event.iCalUId : null,
      calendarId: providerCalendarId,
      recurringEventId: typeof event.seriesMasterId === "string" ? event.seriesMasterId : null,
      originalStartTime: typeof event.originalStart === "string" ? event.originalStart : null,
      startTime: start.dateTime,
      endTime: end.dateTime,
      isAllDay: Boolean(event.isAllDay),
      timeZone: start.timeZone,
      title: typeof event.subject === "string" ? event.subject : undefined,
      description: this.extractOutlookBodyContent(event.body),
      location: this.extractOutlookLocation(event.location),
      meetingUrl: this.extractOutlookMeetingUrl(event.onlineMeeting),
      color: undefined,
      showAsBusy: statusRaw !== "free",
      status: normalizedStatus,
      providerUpdatedAt: typeof event.lastModifiedDateTime === "string" ? event.lastModifiedDateTime : null,
      providerCreatedAt: typeof event.createdDateTime === "string" ? event.createdDateTime : null,
      sequence: null,
      rawPayload: event,
      changeType,
    };
  }

  private mapOutlookRemovedEventToNormalized(
    event: OutlookEventLike,
    providerCalendarId: string
  ): NormalizedCalendarEventDTO | null {
    const id = typeof event.id === "string" ? event.id : null;
    if (!id) {
      return null;
    }

    const fallbackTime =
      typeof event.lastModifiedDateTime === "string" ? event.lastModifiedDateTime : new Date(0).toISOString();

    return {
      provider: CalendarProvider.OUTLOOK,
      externalEventId: id,
      iCalUID: typeof event.iCalUId === "string" ? event.iCalUId : null,
      calendarId: providerCalendarId,
      recurringEventId: typeof event.seriesMasterId === "string" ? event.seriesMasterId : null,
      originalStartTime: typeof event.originalStart === "string" ? event.originalStart : null,
      startTime: fallbackTime,
      endTime: fallbackTime,
      isAllDay: false,
      timeZone: null,
      showAsBusy: false,
      status: ExternalEventStatus.CANCELLED,
      providerUpdatedAt: typeof event.lastModifiedDateTime === "string" ? event.lastModifiedDateTime : null,
      providerCreatedAt: typeof event.createdDateTime === "string" ? event.createdDateTime : null,
      sequence: null,
      rawPayload: event,
      changeType: "delete",
    };
  }

  private extractOutlookDateTime(value: unknown): { dateTime: string; timeZone: string | null } | null {
    const node = value as Record<string, unknown> | null;
    if (!node || typeof node !== "object") {
      return null;
    }

    const dateTime = typeof node.dateTime === "string" ? node.dateTime : null;
    if (!dateTime) {
      return null;
    }

    return {
      dateTime,
      timeZone: typeof node.timeZone === "string" ? node.timeZone : null,
    };
  }

  private extractOutlookBodyContent(value: unknown): string | undefined {
    const body = value as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return undefined;
    }
    return typeof body.content === "string" ? body.content : undefined;
  }

  private extractOutlookLocation(value: unknown): string | undefined {
    const location = value as Record<string, unknown> | null;
    if (!location || typeof location !== "object") {
      return undefined;
    }
    return typeof location.displayName === "string" ? location.displayName : undefined;
  }

  private extractOutlookMeetingUrl(value: unknown): string | undefined {
    const meeting = value as Record<string, unknown> | null;
    if (!meeting || typeof meeting !== "object") {
      return undefined;
    }
    return typeof meeting.joinUrl === "string" ? meeting.joinUrl : undefined;
  }
}
