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
  CalendarSubscriptionWebhookContext,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSubscriptionAdapter"] });

/**
 * Google Calendar Subscription Adapter
 *
 * This adapter uses the Google Calendar API to create and manage calendar subscriptions
 * @see https://developers.google.com/google-apps/calendar/quickstart/nodejs
 */
export class GoogleCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  private GOOGLE_WEBHOOK_TOKEN = process.env.GOOGLE_WEBHOOK_TOKEN;
  private GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

  async validate(context: CalendarSubscriptionWebhookContext): Promise<boolean> {
    const token = context?.headers?.get("X-Goog-Channel-Token");
    if (!this.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN not configured");
      return false;
    }
    if (token !== this.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("Invalid webhook token", { token });
      return false;
    }
    return true;
  }

  async extractChannelId(context: CalendarSubscriptionWebhookContext): Promise<string | null> {
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
      provider: "google_calendar",
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

    let syncToken = selectedCalendar.syncToken || undefined;
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
      provider: "google_calendar",
      syncToken: syncToken || null,
      items: this.parseEvents(events),
    };
  }

  private parseEvents(events: calendar_v3.Schema$Event[]): CalendarSubscriptionEventItem[] {
    const now = new Date();
    return events
      .map((event) => {
        const busy = event.transparency === "opaque"; // opaque = busy, transparent = free

        const start = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : event.start?.date
          ? new Date(event.start.date)
          : new Date();

        const end = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : event.end?.date
          ? new Date(event.end.date)
          : new Date();

        return {
          id: event.id,
          iCalUID: event.iCalUID,
          start,
          end,
          busy,
          summary: event.summary,
          description: event.description,
          location: event.location,
          kind: event.kind,
          status: event.status,
          isAllDay: !!event.start?.date && !event.start?.dateTime,
          timeZone: event.start?.timeZone || null,
          originalStartTime: event.originalStartTime?.dateTime,
          createdAt: event.created ? new Date(event.created) : null,
          updatedAt: event.updated ? new Date(event.updated) : null,
        };
      })
      .filter((e) => !!e.id) // safely remove events with no ID
      .filter((e) => e.start < now); // remove old events
  }

  private async getClient(credential: CalendarCredential) {
    const auth = new CalendarAuth(credential);
    return await auth.getClient();
  }
}
