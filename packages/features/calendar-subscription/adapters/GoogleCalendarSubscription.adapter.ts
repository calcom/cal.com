import type { calendar_v3 } from "@googleapis/calendar";
import { v4 as uuid } from "uuid";

import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import type {
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
  CalendarSubscriptionEvent,
  CalendarSubscriptionEventItem,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSubscriptionAdapter"] });

export class GoogleCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  private GOOGLE_WEBHOOK_TOKEN = process.env.GOOGLE_WEBHOOK_TOKEN;
  private GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL;

  private auth: CalendarAuth;
  constructor(credential: CredentialForCalendarServiceWithEmail) {
    this.auth = new CalendarAuth(credential);
  }

  private async getClient() {
    return await this.auth.getClient();
  }

  async subscribe(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionResult> {
    log.debug("Attempt to subscribe to Google Calendar", { externalId: selectedCalendar.externalId });

    const ONE_MONTH_IN_MS = 1000 * 60 * 60 * 24 * 30;

    const client = await this.getClient();
    const result = await client.events.watch({
      calendarId: selectedCalendar.externalId,
      requestBody: {
        id: uuid(),
        type: "web_hook",
        address: this.GOOGLE_WEBHOOK_URL,
        token: this.GOOGLE_WEBHOOK_TOKEN,
        params: {
          ttl: (ONE_MONTH_IN_MS / 1000).toFixed(0),
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
  async unsubscribe(selectedCalendar: SelectedCalendar): Promise<void> {
    log.debug("Attempt to unsubscribe from Google Calendar", { externalId: selectedCalendar.externalId });

    const client = await this.getClient();
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

  async fetchEvents(selectedCalendar: SelectedCalendar): Promise<CalendarSubscriptionEvent> {
    const client = await this.getClient();

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
      provider: "google",
      syncToken: syncToken || null,
      items: this.sanitizeEvents(events),
    };
  }

  private sanitizeEvents(events: calendar_v3.Schema$Event[]): CalendarSubscriptionEventItem[] {
    return events.map((event) => ({
      transparency: event.transparency === "opaque" ? "opaque" : "transparent",
      start: event.start?.dateTime ?? null,
      end: event.end?.dateTime ?? null,
      summary: event.summary ?? null,
    }));
  }
}
