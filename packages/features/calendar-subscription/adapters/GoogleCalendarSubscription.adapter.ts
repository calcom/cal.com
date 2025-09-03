import { v4 as uuid } from "uuid";

import { CalendarAuth } from "@calcom/app-store/googlecalendar/lib/CalendarAuth";
import logger from "@calcom/lib/logger";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import type {
  CalendarSubscriptionPort,
  CalendarSubscriptionResult,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarSubscriptionAdapter"] });

const { GOOGLE_WEBHOOK_URL, GOOGLE_WEBHOOK_TOKEN } = process.env;

export class GoogleCalendarSubscriptionAdapter implements CalendarSubscriptionPort {
  private auth: CalendarAuth;
  constructor(credential: CredentialForCalendarServiceWithEmail) {
    this.auth = new CalendarAuth(credential);
  }

  async getClient() {
    return this.auth.getClient();
  }

  async subscribe(externalId: string): Promise<CalendarSubscriptionResult> {
    log.debug("Attempt to subscribe to Google Calendar", { externalId });

    const ONE_MONTH_IN_MS = 1000 * 60 * 60 * 24 * 30;

    const client = await this.getClient();
    const result = await client.events.watch({
      calendarId: externalId,
      requestBody: {
        id: uuid(),
        type: "web_hook",
        address: GOOGLE_WEBHOOK_URL,
        token: GOOGLE_WEBHOOK_TOKEN,
        params: {
          ttl: (ONE_MONTH_IN_MS / 1000).toFixed(0),
        },
      },
    });

    const expirationString = result.data?.expiration;
    const expiration = /^\d+$/.test(expirationString)
      ? new Date(Number(expirationString))
      : new Date(Date.parse(expirationString));

    return {
      provider: "google",
      id: result.data.id,
      resourceId: result.data.resourceId,
      resourceUri: result.data.resourceUri,
      expiration,
    };
  }
  async unsubscribe(resourceId: string) {
    log.debug("Attempt to unsubscribe from Google Calendar", { resourceId });
    const client = await this.getClient();
    await client.channels
      .stop({
        requestBody: {
          resourceId,
        },
      })
      .catch((err) => {
        log.error("Error unsubscribing from Google Calendar", err);
        throw err;
      });
  }
  handle(selectedCalendarId: string): Promise<void> {
    log.debug("Attempt to handle Google Calendar subscription", { selectedCalendarId });
    // TODO
  }
}
