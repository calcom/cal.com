import type { calendar_v3 } from "@googleapis/calendar";
import { v4 as uuid } from "uuid";

import { uniqueBy } from "@calcom/lib/array";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import { CalendarAuth } from "./CalendarAuth";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_WEBHOOK_URL_BASE = process.env.NEXT_PUBLIC_WEBAPP_URL;
const GOOGLE_WEBHOOK_URL = `${GOOGLE_WEBHOOK_URL_BASE}/api/webhook/google-calendar`;

export interface GoogleChannelProps {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
}

export class CalendarSubscriptionService {
  private auth: CalendarAuth;
  private credential: CredentialForCalendarServiceWithEmail;

  constructor(credential: CredentialForCalendarServiceWithEmail) {
    this.credential = credential;
    this.auth = new CalendarAuth(credential);
  }

  public async getClient(): Promise<calendar_v3.Calendar> {
    return this.auth.getClient();
  }

  async startWatchingCalendarsInGoogle({ calendarId }: { calendarId: string }): Promise<GoogleChannelProps> {
    const calendar = await this.getClient();
    log.debug(`Subscribing to calendar ${calendarId}`, safeStringify({ GOOGLE_WEBHOOK_URL }));

    const res = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: uuid(),
        type: "web_hook",
        address: GOOGLE_WEBHOOK_URL,
        token: process.env.GOOGLE_WEBHOOK_TOKEN,
        params: {
          ttl: `${Math.round(ONE_MONTH_IN_MS / 1000)}`,
        },
      },
    });

    return {
      kind: res.data.kind || null,
      id: res.data.id || null,
      resourceId: res.data.resourceId || null,
      resourceUri: res.data.resourceUri || null,
      expiration: res.data.expiration || null,
    };
  }

  async stopWatchingCalendarsInGoogle(
    channels: { googleChannelResourceId: string | null; googleChannelId: string | null }[]
  ): Promise<void> {
    const calendar = await this.getClient();
    log.debug(`Unsubscribing from calendars ${channels.map((c) => c.googleChannelId).join(", ")}`);
    const uniqueChannels = uniqueBy(channels, ["googleChannelId", "googleChannelResourceId"]);
    await Promise.allSettled(
      uniqueChannels.map(({ googleChannelResourceId, googleChannelId }) =>
        calendar.channels
          .stop({
            requestBody: {
              resourceId: googleChannelResourceId,
              id: googleChannelId,
            },
          })
          .catch((err) => {
            console.warn(JSON.stringify(err));
          })
      )
    );
  }

  async watchCalendar(calendarId: string): Promise<GoogleChannelProps> {
    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN is not set, skipping watching calendar");
      throw new Error("GOOGLE_WEBHOOK_TOKEN is not set");
    }

    try {
      return await this.startWatchingCalendarsInGoogle({ calendarId });
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(calendarId: string, channelId: string, resourceId: string): Promise<void> {
    try {
      await this.stopWatchingCalendarsInGoogle([
        {
          googleChannelId: channelId,
          googleChannelResourceId: resourceId,
        },
      ]);
      log.info(`Successfully unwatched calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
