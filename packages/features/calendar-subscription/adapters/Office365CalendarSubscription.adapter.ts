import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

import {
  CalendarSubscriptionEvent,
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
  CalendarCredential,
  CalendarSubscriptionEventItem,
} from "../lib/CalendarSubscriptionPort.interface";
import { CalendarCacheEventService } from "../lib/cache/CalendarCacheEventService";

const log = logger.getSubLogger({ prefix: ["MicrosoftCalendarSubscriptionAdapter"] });

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type GraphClient = { accessToken: string };

export type MicrosoftGraphEvent = {
  id: string;
  iCalUId?: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  isAllDay?: boolean;
  isCancelled?: boolean;
  type?: string;
  recurringEventId?: string;
  "@odata.etag"?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
};

type MicrosoftGraphEventsResponse = {
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
  value: MicrosoftGraphEvent[];
};

const BASE_URL = "https://graph.microsoft.com/v1.0";
const SUBSCRIPTION_TTL_MS = 6 * 24 * 60 * 60 * 1000; // 7 days (max allowed for MS Graph)
const BUSY_STATES = ["busy", "tentative", "oof"];

export class Office365CalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  private readonly baseUrl = BASE_URL;
  private readonly subscriptionTtlMs = SUBSCRIPTION_TTL_MS;
  private readonly webhookToken = process.env.MICROSOFT_WEBHOOK_TOKEN ?? null;

  private readonly webhookUrl = `${
    process.env.MICROSOFT_WEBHOOK_URL || process.env.NEXT_PUBLIC_WEBAPP_URL
  }/api/webhooks/calendar-subscription/office365_calendar`;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  async validate(request: Request): Promise<boolean> {
    try {
      const body = await request
        .clone()
        .json()
        .catch(() => ({}));
      const clientState =
        request.headers.get("clientState") ?? body?.value?.[0]?.clientState ?? body?.clientState;

      if (!this.webhookToken) {
        log.warn("MICROSOFT_WEBHOOK_TOKEN missing");
        return false;
      }

      if (clientState !== this.webhookToken) {
        log.warn("Invalid clientState");
        return false;
      }

      return true;
    } catch (err) {
      log.error("Error validating Microsoft webhook", err);
      return false;
    }
  }

  async extractChannelId(request: Request): Promise<string | null> {
    const body = await request
      .clone()
      .json()
      .catch(() => ({}));
    const id =
      body?.value?.[0]?.subscriptionId ?? body?.subscriptionId ?? request.headers.get("subscriptionId");

    if (!id) log.warn("subscriptionId missing in webhook");
    return id;
  }

  async subscribe(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionResult> {
    if (!this.webhookUrl || !this.webhookToken) {
      throw new Error("Webhook config missing (MICROSOFT_WEBHOOK_URL/TOKEN)");
    }

    const client = await this.getGraphClient(credential);
    const res = await this.request<{ id: string; resource: string; expirationDateTime: string }>(
      client,
      "POST",
      "/subscriptions",
      {
        resource: `me/calendars/${selectedCalendar.externalId}/events`,
        changeType: "created,updated,deleted",
        notificationUrl: this.webhookUrl,
        expirationDateTime: new Date(Date.now() + this.subscriptionTtlMs).toISOString(),
        clientState: this.webhookToken,
      }
    );

    return {
      provider: "office365_calendar",
      id: res.id,
      resourceId: res.resource,
      resourceUri: `${this.baseUrl}/${res.resource}`,
      expiration: new Date(res.expirationDateTime),
    };
  }

  async unsubscribe(selectedCalendar: SelectedCalendar, credential: CalendarCredential): Promise<void> {
    const subId = selectedCalendar.channelResourceId;
    if (!subId) return;

    const client = await this.getGraphClient(credential);
    await this.request(client, "DELETE", `/subscriptions/${subId}`);
  }

  async fetchEvents(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionEvent> {
    const client = await this.getGraphClient(credential);
    const items: MicrosoftGraphEvent[] = [];
    let deltaLink = selectedCalendar.syncToken ?? null;

    if (deltaLink) {
      log.info("Fetching with deltaLink");
      const response = await this.request<MicrosoftGraphEventsResponse>(client, "GET", deltaLink);
      items.push(...response.value);
      deltaLink = response["@odata.deltaLink"] ?? deltaLink;
    } else {
      const now = dayjs().startOf("day");
      const monthsAhead = now.add(CalendarCacheEventService.MONTHS_AHEAD, "month").endOf("day");

      const start = now.toISOString();
      const end = monthsAhead.toISOString();

      let next:
        | string
        | null = `/me/calendars/${selectedCalendar.externalId}/events?$filter=start/dateTime ge '${start}' and start/dateTime le '${end}'&$orderby=start/dateTime asc`;

      log.info("Initial fetch", { url: next });

      while (next) {
        const response: MicrosoftGraphEventsResponse = await this.request<MicrosoftGraphEventsResponse>(
          client,
          "GET",
          next
        );
        items.push(...response.value);
        next = response["@odata.nextLink"] ?? null;
      }

      deltaLink = `/me/calendars/${selectedCalendar.externalId}/events/delta`;
    }

    return {
      provider: "office365_calendar",
      syncToken: deltaLink,
      items: this.parseEvents(items),
    };
  }

  private parseEvents(events: MicrosoftGraphEvent[]): CalendarSubscriptionEventItem[] {
    return events
      .filter((e) => e.id)
      .map((e) => ({
        id: e.id,
        iCalUID: e.iCalUId ?? null,
        start: new Date(e.start?.dateTime ?? e.start?.date ?? Date.now()),
        end: new Date(e.end?.dateTime ?? e.end?.date ?? Date.now()),
        busy: e.showAs ? BUSY_STATES.includes(e.showAs) : true,
        etag: e["@odata.etag"] ?? null,
        summary: e.subject ?? null,
        description: e.bodyPreview ?? null,
        location: e.location?.displayName ?? null,
        kind: e.type ?? "microsoft.graph.event",
        status: e.isCancelled ? "cancelled" : "confirmed",
        isAllDay: !!e.isAllDay,
        timeZone: e.start?.timeZone ?? e.end?.timeZone ?? "UTC",
        recurringEventId: e.recurringEventId ?? null,
        originalStartDate: null,
        createdAt: new Date(e.createdDateTime ?? Date.now()),
        updatedAt: new Date(e.lastModifiedDateTime ?? Date.now()),
      }));
  }

  private async getGraphClient(credential: CalendarCredential): Promise<GraphClient> {
    const key = credential.key as {
      access_token?: string;
      refresh_token?: string;
      expiry_date?: number;
    };

    if (credential.delegatedTo?.serviceAccountKey?.private_key) {
      return { accessToken: credential.delegatedTo.serviceAccountKey.private_key };
    }

    const credentialId = String(credential.id);
    const cached = this.tokenCache.get(credentialId);
    if (cached && Date.now() < cached.expiresAt) {
      return { accessToken: cached.token };
    }

    const isExpired = key.expiry_date ? Date.now() >= key.expiry_date - 5 * 60 * 1000 : false;

    if (isExpired && key.refresh_token) {
      log.info("Access token expired, refreshing...", { credentialId });
      const newToken = await this.refreshAccessToken(key.refresh_token);

      this.tokenCache.set(credentialId, {
        token: newToken.access_token,
        expiresAt: Date.now() + 55 * 60 * 1000,
      });

      return { accessToken: newToken.access_token };
    }

    if (!key.access_token) throw new Error("Missing Microsoft access token");
    return { accessToken: key.access_token };
  }

  private async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token: string;
  }> {
    const clientId = process.env.MS_GRAPH_CLIENT_ID;
    const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Missing MS_GRAPH_CLIENT_ID or MS_GRAPH_CLIENT_SECRET");

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      log.error("Failed to refresh token", { status: response.status, error });
      throw new Error("Failed to refresh Microsoft access token");
    }

    return await response.json();
  }

  private async request<T = unknown>(
    client: GraphClient,
    method: HttpMethod,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (data && ["POST", "PUT", "PATCH"].includes(method)) {
      init.body = JSON.stringify(data);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.error("Graph API error", { method, url, status: res.status, text });
      throw new Error(`Graph ${res.status} ${res.statusText}: ${text}`);
    }

    return method === "DELETE" || res.status === 204 ? ({} as T) : await res.json();
  }
}
