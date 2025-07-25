import { v4 as uuid } from "uuid";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import type {
  GoogleChannelProps,
  ICalendarSubscriptionService,
} from "./CalendarSubscriptionService.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_WEBHOOK_URL_BASE = process.env.NEXT_PUBLIC_WEBAPP_URL;
const GOOGLE_WEBHOOK_URL = `${GOOGLE_WEBHOOK_URL_BASE}/api/webhook/google-calendar-sql`;

export class CalendarSubscriptionService implements ICalendarSubscriptionService {
  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      log.warn("GOOGLE_WEBHOOK_TOKEN is not set, skipping watching calendar");
      return;
    }

    try {
      const calendarService = await getCalendar(credential);

      if (!calendarService) {
        throw new Error("Could not get calendar service");
      }

      const calendar = await calendarService.authedCalendar();

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
        kind: res.data.kind,
        id: res.data.id,
        resourceId: res.data.resourceId,
        resourceUri: res.data.resourceUri,
        expiration: res.data.expiration,
      };
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(calendarId: string, credential: CredentialForCalendarService): Promise<void> {
    log.debug("unwatchCalendar", safeStringify({ calendarId }));

    try {
      const calendarService = await getCalendar(credential);

      if (!calendarService) {
        throw new Error("Could not get calendar service");
      }

      const _calendar = await calendarService.authedCalendar();

      log.info(`Unwatching calendar ${calendarId} - implementation needed for proper channel cleanup`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }
}
