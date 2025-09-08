import type { calendar_v3 } from "@googleapis/calendar";
import { v4 as uuid } from "uuid";

import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

import type {
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
  CalendarSubscriptionEvent,
  CalendarSubscriptionEventItem,
  CalendarCredential,
  WebhookContext,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSubscriptionAdapter"] });

export class GoogleCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  private GOOGLE_WEBHOOK_TOKEN = process.env.GOOGLE_WEBHOOK_TOKEN;
  private GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

  async validate(context: WebhookContext): Promise<boolean> {
    const token = context?.headers?.get("X-Goog-Channel-Token");
    if (token !== this.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("Invalid webhook token", { token });
      return false;
    }
    return true;
  }

  async extractChannelId(context: WebhookContext): Promise<string | null> {
    const channelId = context?.headers?.get("X-Goog-Channel-ID");
    if (!channelId) {
      log.warn("Missing channel ID in webhook");
      return null;
    }
    return channelId;
  }

  async subscribe(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionResult> {
    log.debug("Attempt to subscribe to Google Calendar", { externalId: selectedCalendar.externalId });
    selectedCalendar;

    const MONTH_IN_SECONDS = 60 * 60 * 24 * 30;

    const client = await this.getClient(credential);
    const result = await client.events.watch({
      calendarId: selectedCalendar.externalId,
      requestBody: {
        id: uuid(),
        type: "web_hook",
        address: this.GOOGLE_WEBHOOK_URL,
        token: this.GOOGLE_WEBHOOK_TOKEN,
        params: {
          ttl: MONTH_IN_SECONDS.toFixed(0),
        },
      },
    });

    const e = result.data?.expiration;
    const expiration = e ? new Date(/^\d+$/.test(e) ? +e : e) : null;

    return {
      provider: "google",
      id: result.data.id,
      resourceId: result.data.resourceId,
      resourceUri: result.data.resourceUri,
      expiration,
    };
  }
  async unsubscribe(selectedCalendar: SelectedCalendar, credential: CalendarCredential): Promise<void> {
    log.debug("Attempt to unsubscribe from Google Calendar", { externalId: selectedCalendar.externalId });

    const client = await this.getClient(credential);
    await client.channels
      .stop({
        requestBody: {
          resourceId: selectedCalendar.channelResourceId,
        },
      })
      .catch((err) => {
        log.error("Error unsubscribing from Google Calendar", err);
        throw err;
      });
  }

  async fetchEvents(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionEvent> {
    const client = await this.getClient(credential);

    let syncToken = selectedCalendar.lastSyncToken || undefined;
    let pageToken;

    const events: calendar_v3.Schema$Event[] = [];
    do {
      const { data }: { data: calendar_v3.Schema$Events } = await client.events.list({
        calendarId: selectedCalendar.externalId,
        syncToken,
        pageToken,
        singleEvents: true,
      });

      syncToken = data.nextSyncToken || syncToken;
      pageToken = data.nextPageToken ?? null;

      events.push(...(data.items || []));
    } while (pageToken);

    return {
      provider: "google",
      syncToken: syncToken || null,
      items: this.sanitizeEvents(events),
    };
  }

  private sanitizeEvents(events: calendar_v3.Schema$Event[]): CalendarSubscriptionEventItem[] {
    return events.map((event) => {
      const start = event.start?.dateTime ?? event.start?.date ?? null;
      const end = event.end?.dateTime ?? event.end?.date ?? null;
      const transparency = event.transparency === "transparent" ? "transparent" : "opaque"; // default busy

      return {
        id: event.id,
        kind: event.kind,
        iCalUID: event.iCalUID,
        status: event.status,
        start,
        end,
        summary: event.summary,
        description: event.description,
        // used to update cache only
        transparency,
      };
    });
  }

  private async getClient(credential: CalendarCredential) {
    const auth = new CalendarAuth(credential);
    return await auth.getClient();
  }
}
