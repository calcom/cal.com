import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

import type {
  CalendarSubscriptionEvent,
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
  CalendarCredential,
  CalendarSubscriptionWebhookContext,
  CalendarSubscriptionEventItem,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["MicrosoftCalendarSubscriptionAdapter"] });

interface MicrosoftGraphEvent {
  id: string;
  iCalUId?: string;
  subject?: string;
  bodyPreview?: string;
  location?: {
    displayName?: string;
  };
  start?: {
    dateTime: string;
    timeZone: string;
  };
  end?: {
    dateTime: string;
    timeZone: string;
  };
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  isAllDay?: boolean;
  isCancelled?: boolean;
  type?: string;
}

interface MicrosoftGraphSubscription {
  id?: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState?: string;
}

interface MicrosoftGraphEventsResponse {
  "@odata.context"?: string;
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
  value: MicrosoftGraphEvent[];
}

export class MicrosoftCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  private MICROSOFT_WEBHOOK_TOKEN = process.env.MICROSOFT_WEBHOOK_TOKEN;
  private MICROSOFT_WEBHOOK_URL = process.env.MICROSOFT_WEBHOOK_URL;
  private GRAPH_API_BASE_URL = "https://graph.microsoft.com/v1.0";

  async validate(context: CalendarSubscriptionWebhookContext): Promise<boolean> {
    // Microsoft Graph sends a validation token in the query parameters for webhook validation
    const validationToken = context?.query?.get("validationToken");
    if (validationToken) {
      return true;
    }

    // For regular webhook notifications, check the client state
    const clientState = context?.headers?.get("clientState") || context?.body?.clientState;
    if (clientState !== this.MICROSOFT_WEBHOOK_TOKEN) {
      log.warn("Invalid webhook client state", { clientState });
      return false;
    }
    return true;
  }

  async extractChannelId(context: CalendarSubscriptionWebhookContext): Promise<string | null> {
    // Microsoft Graph uses subscription ID instead of channel ID
    const subscriptionId = context?.body?.subscriptionId || context?.headers?.get("subscriptionId");
    if (!subscriptionId) {
      log.warn("Missing subscription ID in webhook");
      return null;
    }
    return subscriptionId;
  }

  async subscribe(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionResult> {
    log.debug("Attempt to subscribe to Microsoft Calendar", { externalId: selectedCalendar.externalId });

    // Microsoft Graph subscriptions for calendar events expire after 4,230 minutes (about 3 days)
    const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
    const expirationDateTime = new Date(Date.now() + THREE_DAYS_IN_MS).toISOString();

    const subscriptionData: MicrosoftGraphSubscription = {
      resource: `me/calendars/${selectedCalendar.externalId}/events`,
      changeType: "created,updated,deleted",
      notificationUrl: this.MICROSOFT_WEBHOOK_URL,
      expirationDateTime,
      clientState: this.MICROSOFT_WEBHOOK_TOKEN,
    };

    try {
      const client = await this.getGraphClient(credential);
      const response = await this.makeGraphRequest(client, "POST", "/subscriptions", subscriptionData);

      return {
        provider: "microsoft",
        id: response.id,
        resourceId: response.resource,
        resourceUri: `${this.GRAPH_API_BASE_URL}/${response.resource}`,
        expiration: new Date(response.expirationDateTime),
      };
    } catch (error) {
      log.error("Error creating Microsoft Calendar subscription", error);
      throw error;
    }
  }

  async unsubscribe(selectedCalendar: SelectedCalendar, credential: CalendarCredential): Promise<void> {
    log.debug("Attempt to unsubscribe from Microsoft Calendar", { externalId: selectedCalendar.externalId });

    try {
      const client = await this.getGraphClient(credential);

      // Microsoft Graph uses subscription ID stored in channelResourceId
      if (selectedCalendar.channelResourceId) {
        await this.makeGraphRequest(client, "DELETE", `/subscriptions/${selectedCalendar.channelResourceId}`);
      }
    } catch (error) {
      log.error("Error unsubscribing from Microsoft Calendar", error);
      throw error;
    }
  }

  async fetchEvents(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionEvent> {
    log.debug("Attempt to fetch events from Microsoft Calendar", { externalId: selectedCalendar.externalId });

    try {
      const client = await this.getGraphClient(credential);
      let deltaLink = selectedCalendar.lastSyncToken;
      let allEvents: MicrosoftGraphEvent[] = [];

      // If we have a delta link, use it for incremental sync
      if (deltaLink) {
        const response = await this.makeGraphRequest<MicrosoftGraphEventsResponse>(
          client,
          "GET",
          deltaLink.replace(this.GRAPH_API_BASE_URL, "")
        );
        allEvents = response.value;
        deltaLink = response["@odata.deltaLink"] || null;
      } else {
        // Initial sync - fetch all events with delta query
        let nextLink = `/me/calendars/${selectedCalendar.externalId}/events/delta`;

        do {
          const response = await this.makeGraphRequest<MicrosoftGraphEventsResponse>(client, "GET", nextLink);

          allEvents.push(...response.value);
          nextLink = response["@odata.nextLink"]?.replace(this.GRAPH_API_BASE_URL, "") || null;

          // If we get a delta link, we're done with initial sync
          if (response["@odata.deltaLink"]) {
            deltaLink = response["@odata.deltaLink"];
            break;
          }
        } while (nextLink);
      }

      return {
        provider: "microsoft",
        syncToken: deltaLink,
        items: this.sanitizeEvents(allEvents),
      };
    } catch (error) {
      log.error("Error fetching Microsoft Calendar events", error);
      throw error;
    }
  }

  private sanitizeEvents(events: MicrosoftGraphEvent[]): CalendarSubscriptionEventItem[] {
    const now = new Date();
    return events
      .map((event) => {
        const busy = event.showAs === "busy" || event.showAs === "tentative" || event.showAs === "oof";
        const start = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date();

        return {
          id: event.id,
          iCalUID: event.iCalUId || event.id,
          start,
          end,
          busy,
          summary: event.subject,
          description: event.bodyPreview,
          location: event.location?.displayName,
          kind: event.type || "microsoftgraph#event",
          status: event.isCancelled ? "cancelled" : "confirmed",
        };
      })
      .filter((e) => !!e.id) // Remove events with no ID
      .filter((e) => e.start < now); // Remove old events
  }

  private async getGraphClient(credential: CalendarCredential): Promise<any> {
    return {
      accessToken: credential.delegatedTo?.serviceAccountKey.private_key,
    };
  }

  private async makeGraphRequest<T = any>(
    client: any,
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.GRAPH_API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${client.accessToken}`,
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // DELETE requests might not return JSON
      if (method === "DELETE") {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      log.error("Microsoft Graph API request failed", { method, endpoint, error });
      throw error;
    }
  }
}
